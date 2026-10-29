"use server";

import type { ActionResult } from "@/lib/action-result";
import { requireClusterPermission } from "@/lib/auth";
import {
  clusterTemplatesFilter,
  contractFormSchema,
  contractIdSchema,
  contractListQuerySchema,
  contractStatusWhere,
  deriveContractStatus,
  isSigned,
  normalizeSalary,
  stripHtml,
  toContractKind,
  type ClusterContract,
  type ClusterContracts,
  type ContractDetail,
  type ContractFormInput,
  type ContractFormOptions,
  type ContractListQuery,
} from "@/lib/contracts";
import type { Prisma } from "@/lib/generated/prisma/client";
import { pageArgs } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";

const COLOMBIA = "Colombia";

function toIsoDate(value: Date | null) {
  return value ? value.toISOString().slice(0, 10) : null;
}

function toDate(value: string) {
  return value ? new Date(`${value}T00:00:00Z`) : null;
}

function emptyToNull(value: string) {
  return value === "" ? null : value;
}

const contractListSelect = {
  id: true,
  contract_type: true,
  employee_id: true,
  job_title: true,
  start_date: true,
  end_date: true,
  signature: true,
  admin_signature: true,
  employees: { select: { name: true } },
  companies: { select: { name: true } },
  partners: { select: { partner_name: true } },
} satisfies Prisma.contractsSelect;

type ContractListRow = Prisma.contractsGetPayload<{ select: typeof contractListSelect }>;

function toClusterContract(contract: ContractListRow, now: Date): ClusterContract {
  return {
    id: contract.id.toString(),
    kind: toContractKind(contract.contract_type),
    employeeId: contract.employee_id.toString(),
    employeeName: contract.employees.name,
    counterparty: contract.companies?.name ?? contract.partners?.partner_name ?? null,
    jobTitle: contract.job_title,
    startDate: toIsoDate(contract.start_date),
    endDate: toIsoDate(contract.end_date),
    status: deriveContractStatus(contract, now),
    employeeSigned: isSigned(contract.signature),
    adminSigned: isSigned(contract.admin_signature),
  };
}

function contractListWhere(companyId: bigint, query: ContractListQuery): Prisma.contractsWhereInput {
  const filters: Prisma.contractsWhereInput[] = [{ intermediano_company_id: companyId, deleted_at: null }];
  if (query.search) {
    filters.push({
      OR: [
        { employees: { name: { contains: query.search } } },
        { job_title: { contains: query.search } },
        { companies: { is: { name: { contains: query.search } } } },
        { partners: { is: { partner_name: { contains: query.search } } } },
      ],
    });
  }
  if (query.kind) filters.push({ contract_type: query.kind });
  if (query.period === "fixed") filters.push({ end_date: { not: null } });
  if (query.period === "open") filters.push({ end_date: null });
  return { AND: filters };
}

export async function getClusterContracts(clusterId: string, query?: ContractListQuery): Promise<ClusterContracts> {
  const { clusterId: companyId } = await requireClusterPermission(clusterId, "contracts.view");
  const listQuery = contractListQuerySchema.parse(query ?? {});

  try {
    const now = new Date();
    const clusterWhere = { intermediano_company_id: companyId, deleted_at: null } satisfies Prisma.contractsWhereInput;
    const where = contractListWhere(companyId, listQuery);
    const [contracts, total, clusterTotal, active, pendingSignature] = await Promise.all([
      prisma.contracts.findMany({
        where,
        orderBy: [{ start_date: "desc" }, { id: "desc" }],
        select: contractListSelect,
        ...pageArgs(listQuery.page),
      }),
      prisma.contracts.count({ where }),
      prisma.contracts.count({ where: clusterWhere }),
      prisma.contracts.count({ where: { AND: [clusterWhere, contractStatusWhere("active", now)] } }),
      prisma.contracts.count({ where: { AND: [clusterWhere, contractStatusWhere("pending_signature", now)] } }),
    ]);

    return {
      contracts: contracts.map((contract) => toClusterContract(contract, now)),
      total,
      stats: { contracts: clusterTotal, active, pendingSignature },
    };
  } catch (error) {
    console.error("getClusterContracts failed", { clusterId: companyId.toString(), error });
    throw new Error("Could not load contracts for this cluster.");
  }
}

export async function getContract(clusterId: string, contractId: string): Promise<ContractDetail | null> {
  const { clusterId: companyId } = await requireClusterPermission(clusterId, "contracts.view");

  const parsedId = contractIdSchema.safeParse(contractId);
  if (!parsedId.success) return null;

  try {
    const contract = await prisma.contracts.findFirst({
      where: { id: BigInt(parsedId.data), intermediano_company_id: companyId, deleted_at: null },
      select: {
        ...contractListSelect,
        company_id: true,
        country_id: true,
        country_work: true,
        translated_position: true,
        gross_salary: true,
        is_integral: true,
        job_description: true,
        translated_job_description: true,
        template_id: true,
        is_sent_to_employee: true,
        signed_contract: true,
        admin_signed_contract: true,
        created_at: true,
        quotations: { select: { title: true } },
        countries: { select: { name: true } },
        templates: { select: { name: true } },
        users: { select: { name: true } },
        intermediano_companies: { select: { name: true } },
        supplementary_contract_details: {
          orderBy: { id: "desc" },
          take: 1,
          select: {
            standard_working_hours: true,
            shift_schedule: true,
            notice_period: true,
            payment_terms: true,
            billing_currency: true,
            payment_currency: true,
          },
        },
      },
    });
    if (!contract) return null;

    const [supplementary] = contract.supplementary_contract_details;
    const pdfTemplate = contract.template_id
      ? await prisma.templates.findFirst({
          where: {
            id: contract.template_id,
            OR: [
              { content_blocks: { not: null } },
              { typst_source: { not: null }, NOT: { typst_source: "" } },
            ],
          },
          select: { id: true },
        })
      : null;

    return {
      ...toClusterContract(contract, new Date()),
      rawContractType: contract.contract_type,
      companyId: contract.company_id?.toString() ?? null,
      companyName: contract.companies?.name ?? null,
      partnerName: contract.partners?.partner_name ?? null,
      quotationTitle: contract.quotations?.title ?? null,
      countryId: contract.country_id?.toString() ?? null,
      countryName: contract.countries?.name ?? null,
      countryWork: contract.country_work,
      translatedPosition: contract.translated_position,
      grossSalary: contract.gross_salary,
      isIntegral: contract.is_integral ?? false,
      jobDescription: contract.job_description,
      translatedJobDescription: contract.translated_job_description,
      templateId: contract.template_id?.toString() ?? null,
      templateName: contract.templates?.name ?? null,
      hasPdfTemplate: pdfTemplate !== null,
      isSentToEmployee: contract.is_sent_to_employee ?? false,
      employeeSignedAt: isSigned(contract.signature) ? (contract.signed_contract?.toISOString() ?? null) : null,
      adminSignedAt: isSigned(contract.admin_signature) ? (contract.admin_signed_contract?.toISOString() ?? null) : null,
      adminSignedBy: contract.users?.name ?? null,
      clusterLabel: contract.intermediano_companies?.name ?? "",
      createdAt: contract.created_at?.toISOString() ?? null,
      supplementary: supplementary
        ? {
            standardWorkingHours: supplementary.standard_working_hours,
            shiftSchedule: supplementary.shift_schedule,
            noticePeriod: supplementary.notice_period,
            paymentTerms: supplementary.payment_terms,
            billingCurrency: supplementary.billing_currency,
            paymentCurrency: supplementary.payment_currency,
          }
        : null,
    };
  } catch (error) {
    console.error("getContract failed", { clusterId: companyId.toString(), contractId: parsedId.data, error });
    throw new Error("Could not load this contract.");
  }
}

async function findClusterCountry(companyId: bigint) {
  const company = await prisma.intermediano_companies.findFirst({
    where: { id: companyId, deleted_at: null },
    select: { country_id: true, countries: { select: { name: true } } },
  });
  return company ? { id: company.country_id, name: company.countries.name } : null;
}

export async function getContractFormOptions(clusterId: string): Promise<ContractFormOptions> {
  const { clusterId: companyId } = await requireClusterPermission(clusterId, "contracts.manage");

  try {
    const country = await findClusterCountry(companyId);
    const [employees, companies, countries, templates] = await Promise.all([
      prisma.employees.findMany({
        where: { intermediano_company_id: companyId, deleted_at: null },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
      prisma.companies.findMany({
        where: { is_customer: true, deleted_at: null },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
      prisma.countries.findMany({
        where: { deleted_at: null },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
      prisma.templates.findMany({
        where: clusterTemplatesFilter(companyId, country?.id ?? null),
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
    ]);

    const toOption = (row: { id: bigint; name: string }) => ({ id: row.id.toString(), name: row.name });

    return {
      employees: employees.map(toOption),
      companies: companies.map(toOption),
      countries: countries.map(toOption),
      templates: templates.map(toOption),
      clusterCountryId: country?.id.toString() ?? null,
      showsSalaryMode: country?.name === COLOMBIA,
    };
  } catch (error) {
    console.error("getContractFormOptions failed", { clusterId: companyId.toString(), error });
    throw new Error("Could not load the contract form options.");
  }
}

async function requireManageCluster(clusterId: string): Promise<bigint | null> {
  try {
    const { clusterId: companyId } = await requireClusterPermission(clusterId, "contracts.manage");
    return companyId;
  } catch {
    return null;
  }
}

type ExistingContract = {
  employee_id: bigint;
  company_id: bigint | null;
  country_id: bigint | null;
  template_id: bigint | null;
  is_integral: boolean | null;
  job_description: string | null;
  translated_job_description: string | null;
};

type ContractWriteData = {
  employee_id: bigint;
  company_id: bigint;
  country_id: bigint;
  country_work: string;
  template_id: bigint | null;
  is_integral: boolean;
  job_title: string | null;
  translated_position: string | null;
  start_date: Date | null;
  end_date: Date | null;
  gross_salary: string | null;
  job_description: string | null;
  translated_job_description: string | null;
};

// Unchanged legacy HTML descriptions are kept as-is instead of being saved back as stripped text.
function keepLegacyText(submitted: string, existing: string | null) {
  if (existing !== null && (stripHtml(existing) ?? "") === submitted) return existing;
  return emptyToNull(submitted);
}

async function validateContractInput(
  input: ContractFormInput,
  companyId: bigint,
  existing: ExistingContract | null,
): Promise<ActionResult<ContractWriteData>> {
  const parsed = contractFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }
  const values = parsed.data;

  const employeeId = BigInt(values.employeeId);
  if (employeeId !== existing?.employee_id) {
    const employee = await prisma.employees.findFirst({
      where: { id: employeeId, intermediano_company_id: companyId, deleted_at: null },
      select: { id: true },
    });
    if (!employee) return { ok: false, error: "The selected employee isn't in this cluster." };
  }

  const clientId = BigInt(values.companyId);
  if (clientId !== existing?.company_id) {
    const client = await prisma.companies.findFirst({
      where: { id: clientId, is_customer: true, deleted_at: null },
      select: { id: true },
    });
    if (!client) return { ok: false, error: "The selected client company is no longer available." };
  }

  const countryId = BigInt(values.countryId);
  const country = await prisma.countries.findFirst({
    where: { id: countryId, ...(countryId !== existing?.country_id && { deleted_at: null }) },
    select: { name: true },
  });
  if (!country) return { ok: false, error: "The selected country of work no longer exists." };

  const clusterCountry = await findClusterCountry(companyId);
  const templateId = values.templateId ? BigInt(values.templateId) : null;
  if (templateId !== null && templateId !== existing?.template_id) {
    const template = await prisma.templates.findFirst({
      where: { id: templateId, ...clusterTemplatesFilter(companyId, clusterCountry?.id ?? null) },
      select: { id: true },
    });
    if (!template) return { ok: false, error: "The selected template isn't available for this cluster." };
  }

  const showsSalaryMode = clusterCountry?.name === COLOMBIA;
  const salary = values.grossSalary ? Number(normalizeSalary(values.grossSalary)).toFixed(2) : null;

  return {
    ok: true,
    data: {
      employee_id: employeeId,
      company_id: clientId,
      country_id: countryId,
      country_work: country.name,
      template_id: templateId,
      is_integral: showsSalaryMode ? values.salaryMode === "integral" : (existing?.is_integral ?? false),
      job_title: emptyToNull(values.jobTitle),
      translated_position: emptyToNull(values.translatedPosition),
      start_date: toDate(values.startDate),
      end_date: toDate(values.endDate),
      gross_salary: salary,
      job_description: keepLegacyText(values.jobDescription, existing?.job_description ?? null),
      translated_job_description: keepLegacyText(
        values.translatedJobDescription,
        existing?.translated_job_description ?? null,
      ),
    },
  };
}

export async function createContract(clusterId: string, input: ContractFormInput): Promise<ActionResult<{ id: string }>> {
  const companyId = await requireManageCluster(clusterId);
  if (companyId === null) return { ok: false, error: "You don't have permission to add contracts in this cluster." };

  try {
    const validated = await validateContractInput(input, companyId, null);
    if (!validated.ok) return validated;

    const now = new Date();
    const contract = await prisma.contracts.create({
      data: {
        ...validated.data,
        contract_type: "employee",
        intermediano_company_id: companyId,
        created_at: now,
        updated_at: now,
      },
      select: { id: true },
    });
    return { ok: true, data: { id: contract.id.toString() } };
  } catch (error) {
    console.error("createContract failed", { clusterId: companyId.toString(), error });
    return { ok: false, error: "Could not add this contract. Try again." };
  }
}

export async function updateContract(
  clusterId: string,
  contractId: string,
  input: ContractFormInput,
): Promise<ActionResult<{ id: string }>> {
  const companyId = await requireManageCluster(clusterId);
  if (companyId === null) return { ok: false, error: "You don't have permission to edit contracts in this cluster." };

  const parsedId = contractIdSchema.safeParse(contractId);
  if (!parsedId.success) return { ok: false, error: "Unknown contract." };

  try {
    const where = { id: BigInt(parsedId.data), intermediano_company_id: companyId, deleted_at: null };
    const existing = await prisma.contracts.findFirst({
      where,
      select: {
        contract_type: true,
        employee_id: true,
        company_id: true,
        country_id: true,
        template_id: true,
        is_integral: true,
        job_description: true,
        translated_job_description: true,
      },
    });
    if (!existing) return { ok: false, error: "This contract no longer exists in this cluster." };
    if (existing.contract_type !== "employee") {
      return { ok: false, error: "Only employee contracts can be edited for now." };
    }

    const validated = await validateContractInput(input, companyId, existing);
    if (!validated.ok) return validated;

    const result = await prisma.contracts.updateMany({
      where: { ...where, contract_type: "employee" },
      data: { ...validated.data, updated_at: new Date() },
    });
    if (result.count === 0) return { ok: false, error: "This contract no longer exists in this cluster." };

    return { ok: true, data: { id: parsedId.data } };
  } catch (error) {
    console.error("updateContract failed", { clusterId: companyId.toString(), contractId: parsedId.data, error });
    return { ok: false, error: "Could not save this contract. Try again." };
  }
}

export async function archiveContract(clusterId: string, contractId: string): Promise<ActionResult<{ id: string }>> {
  const companyId = await requireManageCluster(clusterId);
  if (companyId === null) return { ok: false, error: "You don't have permission to archive contracts in this cluster." };

  const parsedId = contractIdSchema.safeParse(contractId);
  if (!parsedId.success) return { ok: false, error: "Unknown contract." };

  try {
    const now = new Date();
    const result = await prisma.contracts.updateMany({
      where: { id: BigInt(parsedId.data), intermediano_company_id: companyId, deleted_at: null },
      data: { deleted_at: now, updated_at: now },
    });
    if (result.count === 0) return { ok: false, error: "This contract is already archived." };

    return { ok: true, data: { id: parsedId.data } };
  } catch (error) {
    console.error("archiveContract failed", { clusterId: companyId.toString(), contractId: parsedId.data, error });
    return { ok: false, error: "Could not archive this contract. Try again." };
  }
}
