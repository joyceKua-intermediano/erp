"use server";

import type { ActionResult } from "@/lib/action-result";
import { requirePermission } from "@/lib/auth";
import { canAccessCluster, clusterIdFilter, type ClusterScope } from "@/lib/clusters";
import { contractKindLabels, toContractKind } from "@/lib/contracts";
import type { Prisma } from "@/lib/generated/prisma/client";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import {
  templateFormSchema,
  templateIdSchema,
  type ContractTemplate,
  type ContractTemplateDetail,
  type SampleContractOption,
  type TemplateFormInput,
} from "@/lib/templates";

// Templates without a cluster are shared, so they stay visible to everyone with Configuration access.
function visibleTemplates(scope: ClusterScope): Prisma.templatesWhereInput {
  const clusterFilter = clusterIdFilter(scope);
  return {
    deleted_at: null,
    ...(clusterFilter && { OR: [{ intermediano_company_id: null }, { intermediano_company_id: clusterFilter }] }),
  };
}

const templateSelect = {
  id: true,
  name: true,
  intermediano_company_id: true,
  contract_type: true,
  updated_at: true,
  intermediano_companies: { select: { name: true } },
  countries: { select: { name: true } },
  _count: { select: { contracts: { where: { deleted_at: null } } } },
} satisfies Prisma.templatesSelect;

type TemplateRow = Prisma.templatesGetPayload<{ select: typeof templateSelect }>;

function toTemplate(
  row: TemplateRow,
  content: { hasTypstSource: boolean; hasLegacyContent: boolean },
): ContractTemplate {
  return {
    id: row.id.toString(),
    name: row.name,
    clusterId: row.intermediano_company_id?.toString() ?? null,
    clusterName: row.intermediano_companies?.name ?? null,
    countryName: row.countries?.name ?? null,
    contractKind: toContractKind(row.contract_type),
    ...content,
    contractCount: row._count.contracts,
    updatedAt: row.updated_at?.toISOString() ?? null,
  };
}

function hasText(value: string | null) {
  return Boolean(value?.trim());
}

export async function getTemplates(): Promise<ContractTemplate[]> {
  const session = await requirePermission("settings.view");

  try {
    const where = visibleTemplates(session.user.clusters);
    const [rows, withTypst, withLegacy] = await Promise.all([
      prisma.templates.findMany({ where, orderBy: { name: "asc" }, select: templateSelect }),
      prisma.templates.findMany({
        where: { ...where, typst_source: { not: null }, NOT: { typst_source: "" } },
        select: { id: true },
      }),
      prisma.templates.findMany({
        where: { ...where, body_content: { not: null }, NOT: { body_content: "" } },
        select: { id: true },
      }),
    ]);

    // Only ids are read for the two flags, so the list never loads template bodies.
    const typstIds = new Set(withTypst.map((row) => row.id));
    const legacyIds = new Set(withLegacy.map((row) => row.id));
    return rows.map((row) =>
      toTemplate(row, { hasTypstSource: typstIds.has(row.id), hasLegacyContent: legacyIds.has(row.id) }),
    );
  } catch (error) {
    console.error("getTemplates failed", { error });
    throw new Error("Could not load contract templates.");
  }
}

export async function getTemplate(templateId: string): Promise<ContractTemplateDetail | null> {
  const session = await requirePermission("settings.view");

  const parsedId = templateIdSchema.safeParse(templateId);
  if (!parsedId.success) return null;

  try {
    const row = await prisma.templates.findFirst({
      where: { id: BigInt(parsedId.data), ...visibleTemplates(session.user.clusters) },
      select: { ...templateSelect, typst_source: true, body_content: true },
    });
    if (!row) return null;

    return {
      ...toTemplate(row, { hasTypstSource: hasText(row.typst_source), hasLegacyContent: hasText(row.body_content) }),
      typstSource: row.typst_source ?? "",
    };
  } catch (error) {
    console.error("getTemplate failed", { templateId: parsedId.data, error });
    throw new Error("Could not load this template.");
  }
}

export async function getSampleContracts(): Promise<SampleContractOption[]> {
  const session = await requirePermission("settings.view");
  if (!hasPermission(session.user, "contracts.view")) return [];

  try {
    const contracts = await prisma.contracts.findMany({
      where: {
        deleted_at: null,
        intermediano_company_id: clusterIdFilter(session.user.clusters) ?? { not: null },
      },
      orderBy: { id: "desc" },
      take: 100,
      select: {
        id: true,
        contract_type: true,
        job_title: true,
        intermediano_company_id: true,
        employees: { select: { name: true } },
        intermediano_companies: { select: { name: true } },
      },
    });

    return contracts.flatMap((contract) => {
      if (contract.intermediano_company_id === null) return [];
      const kind = toContractKind(contract.contract_type);
      const details = [contract.job_title, kind ? contractKindLabels[kind] : null].filter(Boolean).join(", ");
      return [
        {
          id: contract.id.toString(),
          clusterId: contract.intermediano_company_id.toString(),
          label: `${contract.employees.name}${details ? ` (${details})` : ""} · ${contract.intermediano_companies?.name ?? ""}`,
        },
      ];
    });
  } catch (error) {
    console.error("getSampleContracts failed", { error });
    throw new Error("Could not load sample contracts.");
  }
}

async function requireManageTemplates() {
  try {
    return await requirePermission("settings.manage");
  } catch {
    return null;
  }
}

type ExistingTemplate = { intermediano_company_id: bigint | null; country_id: bigint | null };

type TemplateWriteData = {
  name: string;
  intermediano_company_id: bigint | null;
  country_id: bigint | null;
  contract_type: string | null;
  typst_source: string;
};

async function validateTemplateInput(
  input: TemplateFormInput,
  scope: ClusterScope,
  existing: ExistingTemplate | null,
): Promise<ActionResult<TemplateWriteData>> {
  const parsed = templateFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }
  const values = parsed.data;

  let countryId = existing?.country_id ?? null;
  const clusterId = values.clusterId ? BigInt(values.clusterId) : null;
  if (clusterId !== null) {
    if (!canAccessCluster(scope, values.clusterId)) {
      return { ok: false, error: "You don't have access to the selected cluster." };
    }
    const cluster = await prisma.intermediano_companies.findFirst({
      where: { id: clusterId, ...(clusterId !== existing?.intermediano_company_id && { deleted_at: null }) },
      select: { country_id: true },
    });
    if (!cluster) return { ok: false, error: "The selected cluster no longer exists." };
    countryId = cluster.country_id;
  } else if (scope !== "all") {
    return { ok: false, error: "Only people with access to every cluster can create shared templates." };
  }

  return {
    ok: true,
    data: {
      name: values.name,
      intermediano_company_id: clusterId,
      country_id: countryId,
      contract_type: values.contractKind || null,
      typst_source: values.typstSource,
    },
  };
}

export async function createTemplate(input: TemplateFormInput): Promise<ActionResult<{ id: string }>> {
  const session = await requireManageTemplates();
  if (!session) return { ok: false, error: "You don't have permission to create contract templates." };

  try {
    const validated = await validateTemplateInput(input, session.user.clusters, null);
    if (!validated.ok) return validated;

    const now = new Date();
    const template = await prisma.templates.create({
      data: { ...validated.data, created_at: now, updated_at: now },
      select: { id: true },
    });
    return { ok: true, data: { id: template.id.toString() } };
  } catch (error) {
    console.error("createTemplate failed", { error });
    return { ok: false, error: "Could not create this template. Try again." };
  }
}

export async function updateTemplate(templateId: string, input: TemplateFormInput): Promise<ActionResult<{ id: string }>> {
  const session = await requireManageTemplates();
  if (!session) return { ok: false, error: "You don't have permission to edit contract templates." };

  const parsedId = templateIdSchema.safeParse(templateId);
  if (!parsedId.success) return { ok: false, error: "Unknown template." };

  try {
    const where = { id: BigInt(parsedId.data), ...visibleTemplates(session.user.clusters) };
    const existing = await prisma.templates.findFirst({
      where,
      select: { intermediano_company_id: true, country_id: true },
    });
    if (!existing) return { ok: false, error: "This template no longer exists." };

    const validated = await validateTemplateInput(input, session.user.clusters, existing);
    if (!validated.ok) return validated;

    const result = await prisma.templates.updateMany({
      where,
      data: { ...validated.data, updated_at: new Date() },
    });
    if (result.count === 0) return { ok: false, error: "This template no longer exists." };

    return { ok: true, data: { id: parsedId.data } };
  } catch (error) {
    console.error("updateTemplate failed", { templateId: parsedId.data, error });
    return { ok: false, error: "Could not save this template. Try again." };
  }
}

export async function archiveTemplate(templateId: string): Promise<ActionResult<{ id: string }>> {
  const session = await requireManageTemplates();
  if (!session) return { ok: false, error: "You don't have permission to archive contract templates." };

  const parsedId = templateIdSchema.safeParse(templateId);
  if (!parsedId.success) return { ok: false, error: "Unknown template." };

  try {
    const now = new Date();
    const result = await prisma.templates.updateMany({
      where: { id: BigInt(parsedId.data), ...visibleTemplates(session.user.clusters) },
      data: { deleted_at: now, updated_at: now },
    });
    if (result.count === 0) return { ok: false, error: "This template is already archived." };

    return { ok: true, data: { id: parsedId.data } };
  } catch (error) {
    console.error("archiveTemplate failed", { templateId: parsedId.data, error });
    return { ok: false, error: "Could not archive this template. Try again." };
  }
}
