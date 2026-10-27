"use server";

import type { ActionResult } from "@/lib/action-result";
import { requireClusterPermission } from "@/lib/auth";
import { resolveClusterName } from "@/lib/cluster-names";
import { normalizeSalary } from "@/lib/contracts";
import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  quotationFields,
  quotationFormSchema,
  quotationIdSchema,
  toQuotationClusterKind,
  type ClusterQuotations,
  type QuotationClusterKind,
  type QuotationDetail,
  type QuotationFormInput,
  type QuotationFormOptions,
  type QuotationListItem,
} from "@/lib/quotations";
import { calculateQuotation } from "@/lib/quotations/calculators";

type QuotationCluster = {
  clusterName: string;
  label: string;
  countryId: bigint;
  kind: QuotationClusterKind | null;
};

async function findQuotationCluster(companyId: bigint): Promise<QuotationCluster | null> {
  const company = await prisma.intermediano_companies.findFirst({
    where: { id: companyId, deleted_at: null },
    select: { name: true, country_id: true, countries: { select: { name: true } } },
  });
  if (!company) return null;

  const clusterName = await resolveClusterName(companyId);
  if (!clusterName) return null;

  return {
    clusterName,
    label: company.name,
    countryId: company.country_id,
    kind: toQuotationClusterKind(company.countries.name),
  };
}

// The quotations table also stores payroll runs (is_payroll = 1), which belong to the Payroll module.
function clusterQuotationsWhere(clusterName: string) {
  return { cluster_name: clusterName, is_payroll: false, deleted_at: null } satisfies Prisma.quotationsWhereInput;
}

const quotationSelect = {
  id: true,
  title: true,
  company_id: true,
  province_id: true,
  consultant_id: true,
  currency_name: true,
  exchange_rate: true,
  exchange_acronym: true,
  gross_salary: true,
  is_fix_fee: true,
  fee: true,
  bank_fee: true,
  bonus: true,
  home_allowance: true,
  transport_allowance: true,
  medical_allowance: true,
  internet_allowance: true,
  legal_grafication: true,
  dependent: true,
  is_integral: true,
  created_at: true,
  companies: { select: { name: true } },
  countries: { select: { name: true } },
  provinces: { select: { name: true } },
  // Legacy treats payroll costs as a hasOne relation.
  payroll_costs: {
    where: { deleted_at: null },
    orderBy: { id: "asc" },
    take: 1,
    select: { id: true, medical_insurance: true, meal: true, transportation: true, operational_costs: true },
  },
} satisfies Prisma.quotationsSelect;

type QuotationRow = Prisma.quotationsGetPayload<{ select: typeof quotationSelect }>;

function toNumber(value: Prisma.Decimal | null | undefined) {
  return value ? value.toNumber() : 0;
}

function toAmount(value: Prisma.Decimal | null | undefined) {
  return value ? value.toString() : "0";
}

function breakdownFor(row: QuotationRow, kind: QuotationClusterKind | null) {
  if (!kind) return null;
  const [payrollCosts] = row.payroll_costs;
  return calculateQuotation(kind, {
    companyId: row.company_id.toString(),
    consultantId: row.consultant_id?.toString() ?? null,
    provinceName: row.provinces?.name ?? null,
    isIntegral: row.is_integral,
    exchangeRate: toNumber(row.exchange_rate),
    grossSalary: toNumber(row.gross_salary),
    isFixFee: row.is_fix_fee,
    fee: toNumber(row.fee),
    bankFee: toNumber(row.bank_fee),
    bonus: toNumber(row.bonus),
    homeAllowance: toNumber(row.home_allowance),
    transportAllowance: toNumber(row.transport_allowance),
    medicalAllowance: toNumber(row.medical_allowance),
    internetAllowance: toNumber(row.internet_allowance),
    legalGratification: toNumber(row.legal_grafication),
    payrollCosts: {
      medicalInsurance: toNumber(payrollCosts?.medical_insurance),
      meal: toNumber(payrollCosts?.meal),
      transportation: toNumber(payrollCosts?.transportation),
      operationalCosts: toNumber(payrollCosts?.operational_costs),
    },
  });
}

function toListItem(row: QuotationRow, kind: QuotationClusterKind | null): QuotationListItem {
  const breakdown = breakdownFor(row, kind);
  return {
    id: row.id.toString(),
    title: row.title,
    variant: breakdown?.variant ?? null,
    companyName: row.companies.name,
    countryName: row.countries.name,
    provinceName: row.provinces?.name ?? null,
    currencyName: row.currency_name,
    billingCurrency: row.exchange_acronym,
    grossSalary: toAmount(row.gross_salary),
    totalInvoice: breakdown?.totalInvoice ?? null,
    exchangeRate: toAmount(row.exchange_rate),
  };
}

export async function getClusterQuotations(clusterId: string): Promise<ClusterQuotations> {
  const { clusterId: companyId } = await requireClusterPermission(clusterId, "quotations.view");

  try {
    const cluster = await findQuotationCluster(companyId);
    if (!cluster) return { kind: null, quotations: [] };

    const quotations = await prisma.quotations.findMany({
      where: clusterQuotationsWhere(cluster.clusterName),
      orderBy: [{ title: "desc" }, { id: "desc" }],
      select: quotationSelect,
    });
    return { kind: cluster.kind, quotations: quotations.map((row) => toListItem(row, cluster.kind)) };
  } catch (error) {
    console.error("getClusterQuotations failed", { clusterId: companyId.toString(), error });
    throw new Error("Could not load quotations for this cluster.");
  }
}

export async function getQuotation(clusterId: string, quotationId: string): Promise<QuotationDetail | null> {
  const { clusterId: companyId } = await requireClusterPermission(clusterId, "quotations.view");

  const parsedId = quotationIdSchema.safeParse(quotationId);
  if (!parsedId.success) return null;

  try {
    const cluster = await findQuotationCluster(companyId);
    if (!cluster) return null;

    const row = await prisma.quotations.findFirst({
      where: { id: BigInt(parsedId.data), ...clusterQuotationsWhere(cluster.clusterName) },
      select: quotationSelect,
    });
    if (!row) return null;

    const [payrollCosts] = row.payroll_costs;
    return {
      ...toListItem(row, cluster.kind),
      kind: cluster.kind,
      companyId: row.company_id.toString(),
      provinceId: row.province_id?.toString() ?? null,
      isFixFee: row.is_fix_fee,
      fee: toAmount(row.fee),
      bankFee: toAmount(row.bank_fee),
      bonus: toAmount(row.bonus),
      homeAllowance: toAmount(row.home_allowance),
      transportAllowance: toAmount(row.transport_allowance),
      medicalAllowance: toAmount(row.medical_allowance),
      internetAllowance: toAmount(row.internet_allowance),
      legalGratification: toAmount(row.legal_grafication),
      dependent: row.dependent,
      isIntegral: row.is_integral,
      medicalInsurance: toAmount(payrollCosts?.medical_insurance),
      meal: toAmount(payrollCosts?.meal),
      transportation: toAmount(payrollCosts?.transportation),
      clusterLabel: cluster.label,
      createdAt: row.created_at?.toISOString() ?? null,
      breakdown: breakdownFor(row, cluster.kind),
    };
  } catch (error) {
    console.error("getQuotation failed", { clusterId: companyId.toString(), quotationId: parsedId.data, error });
    throw new Error("Could not load this quotation.");
  }
}

export async function getQuotationFormOptions(clusterId: string): Promise<QuotationFormOptions> {
  const { clusterId: companyId } = await requireClusterPermission(clusterId, "quotations.manage");

  try {
    const cluster = await findQuotationCluster(companyId);
    const kind = cluster?.kind ?? null;

    const [companies, provinces] = await Promise.all([
      // Legacy lets any company be quoted, not only those already marked as customers.
      prisma.companies.findMany({
        where: { deleted_at: null },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
      cluster && kind && quotationFields[kind].province
        ? prisma.provinces.findMany({
            where: { country_id: cluster.countryId, deleted_at: null },
            orderBy: { name: "asc" },
            select: { id: true, name: true },
          })
        : Promise.resolve([]),
    ]);

    const toOption = (row: { id: bigint; name: string }) => ({ id: row.id.toString(), name: row.name });
    return { kind, companies: companies.map(toOption), provinces: provinces.map(toOption) };
  } catch (error) {
    console.error("getQuotationFormOptions failed", { clusterId: companyId.toString(), error });
    throw new Error("Could not load the quotation form options.");
  }
}

async function requireManageCluster(clusterId: string): Promise<bigint | null> {
  try {
    const { clusterId: companyId } = await requireClusterPermission(clusterId, "quotations.manage");
    return companyId;
  } catch {
    return null;
  }
}

type ExistingQuotation = {
  company_id: bigint;
  dependent: boolean;
};

type PayrollCostsWriteData = {
  medical_insurance: string;
  meal: string;
  transportation: string;
};

type QuotationWriteData = {
  quotation: Omit<Prisma.quotationsUncheckedCreateInput, "country_id" | "cluster_name">;
  payrollCosts: PayrollCostsWriteData | null;
};

// Legacy copies these from the country's latest annual setup when the form fields change; payroll reads them later.
async function annualSetupAmounts(
  kind: QuotationClusterKind,
  countryId: bigint,
  dependent: boolean,
  existing: ExistingQuotation | null,
): Promise<Pick<Prisma.quotationsUncheckedCreateInput, "uvt_amount" | "capped_amount">> {
  const isColombiaChange = kind === "colombia" && (existing === null || existing.dependent !== dependent);
  const isCanadaCreate = kind === "canada" && existing === null;
  if (!isColombiaChange && !isCanadaCreate) return {};

  const setup = await prisma.country_annual_setups.findFirst({
    where: { country_id: countryId, deleted_at: null },
    orderBy: { year: "desc" },
    select: { uvt_amount: true, capped_amount: true },
  });

  if (isCanadaCreate) {
    return { uvt_amount: setup?.uvt_amount ?? 0, capped_amount: setup?.capped_amount ?? 0 };
  }
  return { capped_amount: dependent ? (setup?.capped_amount ?? 0) : 0 };
}

async function validateQuotationInput(
  input: QuotationFormInput,
  cluster: QuotationCluster,
  existing: ExistingQuotation | null,
): Promise<ActionResult<QuotationWriteData>> {
  if (!cluster.kind) {
    return { ok: false, error: "Quotations for this cluster aren't available in the new app yet." };
  }
  const fields = quotationFields[cluster.kind];

  const parsed = quotationFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }
  const values = parsed.data;

  const companyId = BigInt(values.companyId);
  if (companyId !== existing?.company_id) {
    const company = await prisma.companies.findFirst({ where: { id: companyId, deleted_at: null }, select: { id: true } });
    if (!company) return { ok: false, error: "The selected customer is no longer available." };
  }

  let provinceId: bigint | null = null;
  if (fields.province) {
    if (!values.provinceId) return { ok: false, error: "Choose a province." };
    provinceId = BigInt(values.provinceId);
    const province = await prisma.provinces.findFirst({
      where: { id: provinceId, country_id: cluster.countryId, deleted_at: null },
      select: { id: true },
    });
    if (!province) return { ok: false, error: "The selected province isn't available for this cluster." };
  }

  return {
    ok: true,
    data: {
      quotation: {
        title: values.quotationDate,
        company_id: companyId,
        currency_name: values.currencyName,
        exchange_rate: normalizeSalary(values.exchangeRate),
        exchange_acronym: values.billingCurrency,
        gross_salary: normalizeSalary(values.grossSalary),
        is_fix_fee: values.feeType === "fixed",
        fee: normalizeSalary(values.fee),
        bank_fee: normalizeSalary(values.bankFee),
        bonus: normalizeSalary(values.bonus),
        home_allowance: normalizeSalary(values.homeAllowance),
        medical_allowance: normalizeSalary(values.medicalAllowance),
        internet_allowance: normalizeSalary(values.internetAllowance),
        dependent: values.dependent,
        ...(fields.transportAllowance && { transport_allowance: normalizeSalary(values.transportAllowance) }),
        ...(fields.legalGratification && { legal_grafication: normalizeSalary(values.legalGratification) }),
        ...(fields.quotationType && { is_integral: values.isIntegral }),
        ...(fields.province && { province_id: provinceId }),
        ...(await annualSetupAmounts(cluster.kind, cluster.countryId, values.dependent, existing)),
      },
      payrollCosts: fields.payrollCosts
        ? {
            medical_insurance: normalizeSalary(values.medicalInsurance),
            meal: normalizeSalary(values.meal),
            transportation: normalizeSalary(values.transportation),
          }
        : null,
    },
  };
}

export async function createQuotation(clusterId: string, input: QuotationFormInput): Promise<ActionResult<{ id: string }>> {
  const companyId = await requireManageCluster(clusterId);
  if (companyId === null) return { ok: false, error: "You don't have permission to add quotations in this cluster." };

  try {
    const cluster = await findQuotationCluster(companyId);
    if (!cluster) return { ok: false, error: "This cluster no longer exists." };

    const validated = await validateQuotationInput(input, cluster, null);
    if (!validated.ok) return validated;

    const now = new Date();
    const quotation = await prisma.$transaction(async (tx) => {
      const created = await tx.quotations.create({
        data: {
          ...validated.data.quotation,
          country_id: cluster.countryId,
          cluster_name: cluster.clusterName,
          is_payroll: false,
          created_at: now,
          updated_at: now,
        },
        select: { id: true },
      });
      if (validated.data.payrollCosts) {
        await tx.payroll_costs.create({
          data: { ...validated.data.payrollCosts, quotation_id: created.id, created_at: now, updated_at: now },
        });
      }
      return created;
    });
    return { ok: true, data: { id: quotation.id.toString() } };
  } catch (error) {
    console.error("createQuotation failed", { clusterId: companyId.toString(), error });
    return { ok: false, error: "Could not add this quotation. Try again." };
  }
}

export async function updateQuotation(
  clusterId: string,
  quotationId: string,
  input: QuotationFormInput,
): Promise<ActionResult<{ id: string }>> {
  const companyId = await requireManageCluster(clusterId);
  if (companyId === null) return { ok: false, error: "You don't have permission to edit quotations in this cluster." };

  const parsedId = quotationIdSchema.safeParse(quotationId);
  if (!parsedId.success) return { ok: false, error: "Unknown quotation." };

  try {
    const cluster = await findQuotationCluster(companyId);
    if (!cluster) return { ok: false, error: "This cluster no longer exists." };

    const where = { id: BigInt(parsedId.data), ...clusterQuotationsWhere(cluster.clusterName) };
    const existing = await prisma.quotations.findFirst({
      where,
      select: { company_id: true, dependent: true, payroll_costs: quotationSelect.payroll_costs },
    });
    if (!existing) return { ok: false, error: "This quotation no longer exists in this cluster." };

    const validated = await validateQuotationInput(input, cluster, existing);
    if (!validated.ok) return validated;
    const { quotation, payrollCosts } = validated.data;

    const now = new Date();
    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.quotations.updateMany({ where, data: { ...quotation, updated_at: now } });
      if (result.count === 0 || !payrollCosts) return result.count > 0;

      const [currentCosts] = existing.payroll_costs;
      if (currentCosts) {
        await tx.payroll_costs.update({ where: { id: currentCosts.id }, data: { ...payrollCosts, updated_at: now } });
      } else {
        await tx.payroll_costs.create({
          data: { ...payrollCosts, quotation_id: BigInt(parsedId.data), created_at: now, updated_at: now },
        });
      }
      return true;
    });
    if (!updated) return { ok: false, error: "This quotation no longer exists in this cluster." };

    return { ok: true, data: { id: parsedId.data } };
  } catch (error) {
    console.error("updateQuotation failed", { clusterId: companyId.toString(), quotationId: parsedId.data, error });
    return { ok: false, error: "Could not save this quotation. Try again." };
  }
}

export async function archiveQuotation(clusterId: string, quotationId: string): Promise<ActionResult<{ id: string }>> {
  const companyId = await requireManageCluster(clusterId);
  if (companyId === null) return { ok: false, error: "You don't have permission to archive quotations in this cluster." };

  const parsedId = quotationIdSchema.safeParse(quotationId);
  if (!parsedId.success) return { ok: false, error: "Unknown quotation." };

  try {
    const cluster = await findQuotationCluster(companyId);
    if (!cluster) return { ok: false, error: "This cluster no longer exists." };

    const now = new Date();
    const result = await prisma.quotations.updateMany({
      where: { id: BigInt(parsedId.data), ...clusterQuotationsWhere(cluster.clusterName) },
      data: { deleted_at: now, updated_at: now },
    });
    if (result.count === 0) return { ok: false, error: "This quotation is already archived." };

    return { ok: true, data: { id: parsedId.data } };
  } catch (error) {
    console.error("archiveQuotation failed", { clusterId: companyId.toString(), quotationId: parsedId.data, error });
    return { ok: false, error: "Could not archive this quotation. Try again." };
  }
}
