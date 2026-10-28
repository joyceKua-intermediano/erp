"use server";

import type { ActionResult } from "@/lib/action-result";
import { requireClusterModule, requireClusterPermission } from "@/lib/auth";
import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  quotationFields,
  quotationIdSchema,
  quotationScopeSchema,
  type ClusterQuotations,
  type QuotationClusterKind,
  type QuotationDetail,
  type QuotationFormInput,
  type QuotationFormOptions,
  type QuotationListItem,
  type QuotationScope,
} from "@/lib/quotations";
import {
  breakdownFor,
  findQuotationCluster,
  quotationSelect,
  toAmount,
  validateQuotationInput,
  type QuotationRow,
} from "@/lib/quotations/records";

// The quotations table also stores payroll runs (is_payroll = 1), which belong to the Payroll module.
// Writes keep the default so partner quotations stay read-only until their calculators are ported.
function clusterQuotationsWhere(companyId: bigint, isPartner = false) {
  return {
    intermediano_company_id: companyId,
    is_partner: isPartner,
    is_payroll: false,
    deleted_at: null,
  } satisfies Prisma.quotationsWhereInput;
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
    isPartner: row.is_partner,
    partnerName: row.partners?.partner_name ?? null,
  };
}

export async function getClusterQuotations(clusterId: string, scope: QuotationScope = "direct"): Promise<ClusterQuotations> {
  const parsedScope = quotationScopeSchema.safeParse(scope);
  if (!parsedScope.success) throw new Error("Unknown quotation list.");
  const isPartner = parsedScope.data === "partner";

  const { clusterId: companyId } = isPartner
    ? await requireClusterModule(clusterId, "quotations.view", "partner")
    : await requireClusterPermission(clusterId, "quotations.view");

  try {
    const cluster = await findQuotationCluster(companyId);
    if (!cluster) return { kind: null, quotations: [] };

    const quotations = await prisma.quotations.findMany({
      where: clusterQuotationsWhere(companyId, isPartner),
      orderBy: [{ title: "desc" }, { id: "desc" }],
      select: quotationSelect,
    });
    return {
      kind: isPartner ? null : cluster.kind,
      quotations: quotations.map((row) => toListItem(row, cluster.kind)),
    };
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
      // The detail page opens both direct and partner quotations.
      where: { id: BigInt(parsedId.data), ...clusterQuotationsWhere(companyId), is_partner: undefined },
      select: quotationSelect,
    });
    if (!row) return null;
    if (row.is_partner) await requireClusterModule(clusterId, "quotations.view", "partner");

    const [payrollCosts] = row.payroll_costs;
    return {
      ...toListItem(row, cluster.kind),
      kind: row.is_partner ? null : cluster.kind,
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
      isIntegral: row.is_integral,
      medicalInsurance: toAmount(payrollCosts?.medical_insurance),
      meal: toAmount(payrollCosts?.meal),
      transportation: toAmount(payrollCosts?.transportation),
      ufMonth: toAmount(payrollCosts?.uf_month),
      eps: toAmount(payrollCosts?.eps),
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
          intermediano_company_id: companyId,
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

    const where = { id: BigInt(parsedId.data), ...clusterQuotationsWhere(companyId) };
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
      where: { id: BigInt(parsedId.data), ...clusterQuotationsWhere(companyId) },
      data: { deleted_at: now, updated_at: now },
    });
    if (result.count === 0) return { ok: false, error: "This quotation is already archived." };

    return { ok: true, data: { id: parsedId.data } };
  } catch (error) {
    console.error("archiveQuotation failed", { clusterId: companyId.toString(), quotationId: parsedId.data, error });
    return { ok: false, error: "Could not archive this quotation. Try again." };
  }
}
