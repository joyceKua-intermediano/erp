"use server";

import type { ActionResult } from "@/lib/action-result";
import { requireClusterPermission } from "@/lib/auth";
import { normalizeSalary } from "@/lib/contracts";
import { Prisma } from "@/lib/generated/prisma/client";
import { pageArgs } from "@/lib/pagination";
import {
  allowedProvisionTypes,
  earlierPayrollRuns,
  payrollFormSchema,
  payrollIdSchema,
  payrollListQuerySchema,
  provisionTypeNames,
  type ClusterPayrolls,
  type PayrollDetail,
  type PayrollFormInput,
  type PayrollFormOptions,
  type PayrollListItem,
  type PayrollListQuery,
} from "@/lib/payroll";
import { buildProvisionLedger, type LedgerRun } from "@/lib/payroll/ledger";
import { payrollBreakdown, snapshotForRow } from "@/lib/payroll/snapshot";
import { prisma } from "@/lib/prisma";
import { quotationFields, type QuotationClusterKind } from "@/lib/quotations";
import { breakdownVariants, variantWhere } from "@/lib/quotations/breakdown";
import {
  findQuotationCluster,
  quotationSelect,
  toAmount,
  toNumber,
  validateQuotationInput,
  type ExistingQuotation,
  type QuotationCluster,
  type QuotationWriteData,
} from "@/lib/quotations/records";

// Payroll runs share the quotations table with quotations, told apart by is_payroll.
function clusterPayrollsWhere(companyId: bigint) {
  return {
    intermediano_company_id: companyId,
    is_payroll: true,
    is_partner: false,
    deleted_at: null,
  } satisfies Prisma.quotationsWhereInput;
}

const payrollSelect = {
  ...quotationSelect,
  breakdown_snapshot: true,
  consultants: { select: { name: true } },
  payment_provisions: {
    orderBy: { id: "asc" },
    select: { provision_type_id: true, amount: true, provision_types: { select: { name: true } } },
  },
} satisfies Prisma.quotationsSelect;

type PayrollRow = Prisma.quotationsGetPayload<{ select: typeof payrollSelect }>;

function toListItem(row: PayrollRow, kind: QuotationClusterKind | null): PayrollListItem {
  const breakdown = payrollBreakdown(row, kind);
  return {
    id: row.id.toString(),
    title: row.title,
    variant: breakdown?.variant ?? null,
    isIntegral: row.is_integral,
    consultantId: row.consultant_id?.toString() ?? null,
    consultantName: row.consultants?.name ?? null,
    companyName: row.companies.name,
    currencyName: row.currency_name,
    billingCurrency: row.exchange_acronym,
    grossSalary: toAmount(row.gross_salary),
    totalInvoice: breakdown?.totalInvoice ?? null,
  };
}

function toLedgerRun(row: PayrollRow, kind: QuotationClusterKind): LedgerRun {
  return {
    breakdown: payrollBreakdown(row, kind),
    paid: row.payment_provisions.map((payment) => ({
      name: payment.provision_types.name,
      amount: toNumber(payment.amount),
    })),
  };
}

function payrollListWhere(
  companyId: bigint,
  kind: QuotationClusterKind | null,
  query: PayrollListQuery,
): Prisma.quotationsWhereInput {
  const filters: Prisma.quotationsWhereInput[] = [clusterPayrollsWhere(companyId)];
  if (query.search) {
    filters.push({
      OR: [
        { consultants: { is: { name: { contains: query.search } } } },
        { companies: { is: { name: { contains: query.search } } } },
        { title: { contains: query.search } },
      ],
    });
  }
  if (query.month) filters.push({ title: { startsWith: query.month } });
  if (query.consultantId) filters.push({ consultant_id: BigInt(query.consultantId) });
  if (kind && query.variant) filters.push(variantWhere(kind, query.variant));
  return { AND: filters };
}

const EMPTY_PAYROLLS: Omit<ClusterPayrolls, "kind"> = {
  payrolls: [],
  total: 0,
  stats: { payrolls: 0, thisMonth: 0, consultants: 0 },
  consultants: [],
  variants: [],
};

export async function getClusterPayrolls(clusterId: string, query?: PayrollListQuery): Promise<ClusterPayrolls> {
  const { clusterId: companyId } = await requireClusterPermission(clusterId, "payroll.view");
  const listQuery = payrollListQuerySchema.parse(query ?? {});

  try {
    const cluster = await findQuotationCluster(companyId);
    if (!cluster) return { kind: null, ...EMPTY_PAYROLLS };

    const { kind } = cluster;
    const clusterWhere = clusterPayrollsWhere(companyId);
    const where = payrollListWhere(companyId, kind, listQuery);
    const thisMonth = new Date().toISOString().slice(0, 7);
    const [payrolls, total, clusterTotal, thisMonthTotal, consultants, variantCounts] = await Promise.all([
      prisma.quotations.findMany({
        where,
        orderBy: [{ title: "desc" }, { id: "desc" }],
        select: payrollSelect,
        ...pageArgs(listQuery.page),
      }),
      prisma.quotations.count({ where }),
      prisma.quotations.count({ where: clusterWhere }),
      prisma.quotations.count({ where: { ...clusterWhere, title: { startsWith: thisMonth } } }),
      prisma.consultants.findMany({
        where: { quotations: { some: clusterWhere } },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
      Promise.all(
        (kind ? breakdownVariants(kind) : []).map(async (variant) => ({
          variant,
          count: kind ? await prisma.quotations.count({ where: { AND: [clusterWhere, variantWhere(kind, variant)] } }) : 0,
        })),
      ),
    ]);
    return {
      kind,
      payrolls: payrolls.map((row) => toListItem(row, kind)),
      total,
      stats: { payrolls: clusterTotal, thisMonth: thisMonthTotal, consultants: consultants.length },
      consultants: consultants.map((consultant) => ({ id: consultant.id.toString(), name: consultant.name })),
      variants: variantCounts.filter(({ count }) => count > 0).map(({ variant }) => variant),
    };
  } catch (error) {
    console.error("getClusterPayrolls failed", { clusterId: companyId.toString(), error });
    throw new Error("Could not load payroll for this cluster.");
  }
}

export async function getPayroll(clusterId: string, payrollId: string): Promise<PayrollDetail | null> {
  const { clusterId: companyId } = await requireClusterPermission(clusterId, "payroll.view");

  const parsedId = payrollIdSchema.safeParse(payrollId);
  if (!parsedId.success) return null;

  try {
    const cluster = await findQuotationCluster(companyId);
    if (!cluster) return null;

    const row = await prisma.quotations.findFirst({
      where: { id: BigInt(parsedId.data), ...clusterPayrollsWhere(companyId) },
      select: payrollSelect,
    });
    if (!row) return null;

    const { kind } = cluster;
    let ledger: PayrollDetail["ledger"] = null;
    if (kind && row.consultant_id !== null) {
      // Legacy accrues provisions over every earlier run billed for the same consultant in this cluster.
      const consultantRuns = await prisma.quotations.findMany({
        where: { ...clusterPayrollsWhere(companyId), consultant_id: row.consultant_id, id: { not: row.id } },
        select: payrollSelect,
      });
      const previousRuns = earlierPayrollRuns(consultantRuns, row);
      ledger = buildProvisionLedger(
        allowedProvisionTypes(kind, row.is_integral),
        toLedgerRun(row, kind),
        previousRuns.map((previous) => toLedgerRun(previous, kind)),
      );
    }

    const [payrollCosts] = row.payroll_costs;
    return {
      ...toListItem(row, kind),
      kind,
      countryName: row.countries.name,
      provinceName: row.provinces?.name ?? null,
      exchangeRate: toAmount(row.exchange_rate),
      isPartner: row.is_partner,
      partnerName: row.partners?.partner_name ?? null,
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
      familyAllowance: toAmount(row.family_allowance),
      foodAllowance: toAmount(row.food_allowance),
      legalGratification: toAmount(row.legal_grafication),
      dependent: row.dependent,
      medicalInsurance: toAmount(payrollCosts?.medical_insurance),
      meal: toAmount(payrollCosts?.meal),
      transportation: toAmount(payrollCosts?.transportation),
      ufMonth: toAmount(payrollCosts?.uf_month),
      eps: toAmount(payrollCosts?.eps),
      clusterLabel: cluster.label,
      createdAt: row.created_at?.toISOString() ?? null,
      breakdown: payrollBreakdown(row, kind),
      provisions: row.payment_provisions.map((payment) => ({
        provisionTypeId: payment.provision_type_id.toString(),
        name: payment.provision_types.name,
        amount: toAmount(payment.amount),
      })),
      ledger,
    };
  } catch (error) {
    console.error("getPayroll failed", { clusterId: companyId.toString(), payrollId: parsedId.data, error });
    throw new Error("Could not load this payroll.");
  }
}

export async function getPayrollFormOptions(clusterId: string): Promise<PayrollFormOptions> {
  const { clusterId: companyId } = await requireClusterPermission(clusterId, "payroll.manage");

  try {
    const cluster = await findQuotationCluster(companyId);
    const kind = cluster?.kind ?? null;

    const [companies, consultants, provinces, provisionTypes] = await Promise.all([
      prisma.companies.findMany({
        where: { deleted_at: null, is_customer: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
      prisma.consultants.findMany({
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
      kind
        ? prisma.provision_types.findMany({
            where: { name: { in: provisionTypeNames(kind) } },
            orderBy: { id: "asc" },
            select: { id: true, name: true },
          })
        : Promise.resolve([]),
    ]);

    const toOption = (row: { id: bigint; name: string }) => ({ id: row.id.toString(), name: row.name });
    return {
      kind,
      companies: companies.map(toOption),
      consultants: consultants.map(toOption),
      provinces: provinces.map(toOption),
      provisionTypes: provisionTypes.map(toOption),
    };
  } catch (error) {
    console.error("getPayrollFormOptions failed", { clusterId: companyId.toString(), error });
    throw new Error("Could not load the payroll form options.");
  }
}

async function requireManageCluster(clusterId: string): Promise<bigint | null> {
  try {
    const { clusterId: companyId } = await requireClusterPermission(clusterId, "payroll.manage");
    return companyId;
  } catch {
    return null;
  }
}

type ExistingPayroll = ExistingQuotation & {
  consultant_id: bigint | null;
};

type ProvisionWriteData = { provision_type_id: bigint; amount: string }[];

async function validatePayrollInput(
  input: PayrollFormInput,
  cluster: QuotationCluster,
  existing: ExistingPayroll | null,
): Promise<ActionResult<QuotationWriteData & { provisions: ProvisionWriteData }>> {
  if (!cluster.kind) {
    return { ok: false, error: "Payroll for this cluster isn't available in the new app yet." };
  }

  const parsed = payrollFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }
  const values = parsed.data;

  const validated = await validateQuotationInput(values, cluster, existing);
  if (!validated.ok) return validated;

  // Legacy only offers companies already marked as customers on payroll runs.
  const companyId = BigInt(values.companyId);
  if (companyId !== existing?.company_id) {
    const customer = await prisma.companies.findFirst({
      where: { id: companyId, deleted_at: null, is_customer: true },
      select: { id: true },
    });
    if (!customer) return { ok: false, error: "The selected customer is no longer available." };
  }

  const consultantId = BigInt(values.consultantId);
  if (consultantId !== existing?.consultant_id) {
    const consultant = await prisma.consultants.findFirst({
      where: { id: consultantId, deleted_at: null },
      select: { id: true },
    });
    if (!consultant) return { ok: false, error: "The selected consultant is no longer available." };
  }

  const isIntegral = quotationFields[cluster.kind].quotationType && values.isIntegral;
  const allowedNames = new Set(allowedProvisionTypes(cluster.kind, isIntegral).map(({ name }) => name));
  const provisionTypeIds = values.provisions.map(({ provisionTypeId }) => BigInt(provisionTypeId));
  const provisionTypes =
    provisionTypeIds.length > 0
      ? await prisma.provision_types.findMany({
          where: { id: { in: provisionTypeIds } },
          select: { id: true, name: true },
        })
      : [];
  const isAllowed = provisionTypeIds.every((id) =>
    provisionTypes.some((provisionType) => provisionType.id === id && allowedNames.has(provisionType.name)),
  );
  if (!isAllowed) {
    return { ok: false, error: "One of the provision types isn't available for this payroll." };
  }

  const provisions: ProvisionWriteData = values.provisions.map(({ provisionTypeId, amount }) => ({
    provision_type_id: BigInt(provisionTypeId),
    amount: normalizeSalary(amount),
  }));

  return {
    ok: true,
    data: { ...validated.data, quotation: { ...validated.data.quotation, consultant_id: consultantId }, provisions },
  };
}

// Prices the row as just written, inside the same transaction, and saves that breakdown with it.
async function saveBreakdownSnapshot(tx: Prisma.TransactionClient, quotationId: bigint, kind: QuotationClusterKind) {
  const row = await tx.quotations.findUnique({ where: { id: quotationId }, select: quotationSelect });
  if (!row) return;
  await tx.quotations.update({ where: { id: quotationId }, data: { breakdown_snapshot: snapshotForRow(row, kind) } });
}

async function replaceProvisions(
  tx: Prisma.TransactionClient,
  quotationId: bigint,
  provisions: ProvisionWriteData,
  now: Date,
) {
  await tx.payment_provisions.deleteMany({ where: { quotation_id: quotationId } });
  if (provisions.length === 0) return;
  await tx.payment_provisions.createMany({
    data: provisions.map((provision) => ({ ...provision, quotation_id: quotationId, created_at: now, updated_at: now })),
  });
}

export async function createPayroll(clusterId: string, input: PayrollFormInput): Promise<ActionResult<{ id: string }>> {
  const companyId = await requireManageCluster(clusterId);
  if (companyId === null) return { ok: false, error: "You don't have permission to add payroll in this cluster." };

  try {
    const cluster = await findQuotationCluster(companyId);
    if (!cluster) return { ok: false, error: "This cluster no longer exists." };

    const validated = await validatePayrollInput(input, cluster, null);
    if (!validated.ok) return validated;
    const { quotation, payrollCosts, provisions } = validated.data;

    const now = new Date();
    const payroll = await prisma.$transaction(async (tx) => {
      const created = await tx.quotations.create({
        data: {
          ...quotation,
          country_id: cluster.countryId,
          intermediano_company_id: companyId,
          is_payroll: true,
          created_at: now,
          updated_at: now,
        },
        select: { id: true },
      });
      if (payrollCosts) {
        await tx.payroll_costs.create({
          data: { ...payrollCosts, quotation_id: created.id, created_at: now, updated_at: now },
        });
      }
      await replaceProvisions(tx, created.id, provisions, now);
      if (cluster.kind) await saveBreakdownSnapshot(tx, created.id, cluster.kind);
      return created;
    });
    return { ok: true, data: { id: payroll.id.toString() } };
  } catch (error) {
    console.error("createPayroll failed", { clusterId: companyId.toString(), error });
    return { ok: false, error: "Could not add this payroll. Try again." };
  }
}

export async function updatePayroll(
  clusterId: string,
  payrollId: string,
  input: PayrollFormInput,
): Promise<ActionResult<{ id: string }>> {
  const companyId = await requireManageCluster(clusterId);
  if (companyId === null) return { ok: false, error: "You don't have permission to edit payroll in this cluster." };

  const parsedId = payrollIdSchema.safeParse(payrollId);
  if (!parsedId.success) return { ok: false, error: "Unknown payroll." };

  try {
    const cluster = await findQuotationCluster(companyId);
    if (!cluster) return { ok: false, error: "This cluster no longer exists." };

    const id = BigInt(parsedId.data);
    const where = { id, ...clusterPayrollsWhere(companyId) };
    const existing = await prisma.quotations.findFirst({
      where,
      select: {
        company_id: true,
        consultant_id: true,
        dependent: true,
        payroll_costs: quotationSelect.payroll_costs,
      },
    });
    if (!existing) return { ok: false, error: "This payroll no longer exists in this cluster." };

    const validated = await validatePayrollInput(input, cluster, existing);
    if (!validated.ok) return validated;
    const { quotation, payrollCosts, provisions } = validated.data;

    const now = new Date();
    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.quotations.updateMany({ where, data: { ...quotation, updated_at: now } });
      if (result.count === 0) return false;

      if (payrollCosts) {
        const [currentCosts] = existing.payroll_costs;
        if (currentCosts) {
          await tx.payroll_costs.update({ where: { id: currentCosts.id }, data: { ...payrollCosts, updated_at: now } });
        } else {
          await tx.payroll_costs.create({ data: { ...payrollCosts, quotation_id: id, created_at: now, updated_at: now } });
        }
      }
      await replaceProvisions(tx, id, provisions, now);
      if (cluster.kind) await saveBreakdownSnapshot(tx, id, cluster.kind);
      return true;
    });
    if (!updated) return { ok: false, error: "This payroll no longer exists in this cluster." };

    return { ok: true, data: { id: parsedId.data } };
  } catch (error) {
    console.error("updatePayroll failed", { clusterId: companyId.toString(), payrollId: parsedId.data, error });
    return { ok: false, error: "Could not save this payroll. Try again." };
  }
}

export async function archivePayroll(clusterId: string, payrollId: string): Promise<ActionResult<{ id: string }>> {
  const companyId = await requireManageCluster(clusterId);
  if (companyId === null) return { ok: false, error: "You don't have permission to archive payroll in this cluster." };

  const parsedId = payrollIdSchema.safeParse(payrollId);
  if (!parsedId.success) return { ok: false, error: "Unknown payroll." };

  try {
    const now = new Date();
    const result = await prisma.quotations.updateMany({
      where: { id: BigInt(parsedId.data), ...clusterPayrollsWhere(companyId) },
      data: { deleted_at: now, updated_at: now },
    });
    if (result.count === 0) return { ok: false, error: "This payroll is already archived." };

    return { ok: true, data: { id: parsedId.data } };
  } catch (error) {
    console.error("archivePayroll failed", { clusterId: companyId.toString(), payrollId: parsedId.data, error });
    return { ok: false, error: "Could not archive this payroll. Try again." };
  }
}
