"use server";

import type { ActionResult } from "@/lib/action-result";
import { requirePermission } from "@/lib/auth";
import { clusterIdFilter, type ClusterScope } from "@/lib/clusters";
import { Prisma } from "@/lib/generated/prisma/client";
import type { CountryOption } from "@/lib/intermediano-companies";
import {
  isPartnerType,
  partnerFormSchema,
  partnerIdSchema,
  type Partner,
  type PartnerFormInput,
} from "@/lib/partners";
import { prisma } from "@/lib/prisma";

// Partners are shared across clusters, but the contract count only covers clusters the user can see.
function partnerSelect(scope: ClusterScope) {
  return {
    id: true,
    partner_name: true,
    partner_type: true,
    country_id: true,
    contact_name: true,
    email: true,
    mobile_number: true,
    tax_id: true,
    address: true,
    created_at: true,
    _count: {
      select: {
        contracts: { where: { deleted_at: null, intermediano_company_id: clusterIdFilter(scope) } },
        customers: { where: { deleted_at: null } },
      },
    },
  } satisfies Prisma.partnersSelect;
}

type PartnerRow = Prisma.partnersGetPayload<{ select: ReturnType<typeof partnerSelect> }>;

// partners.country_id has no foreign key in this schema, so country names are looked up separately.
async function countryNamesFor(rows: PartnerRow[]) {
  const ids = [...new Set(rows.map((row) => row.country_id))];
  if (ids.length === 0) return new Map<bigint, string>();
  const countries = await prisma.countries.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } });
  return new Map(countries.map((country) => [country.id, country.name]));
}

function toPartner(partner: PartnerRow, countryNames: Map<bigint, string>): Partner {
  return {
    id: partner.id.toString(),
    name: partner.partner_name ?? "Unnamed partner",
    partnerType: partner.partner_type,
    countryId: partner.country_id.toString(),
    countryName: countryNames.get(partner.country_id) ?? null,
    contactName: partner.contact_name,
    email: partner.email,
    mobileNumber: partner.mobile_number,
    taxId: partner.tax_id,
    address: partner.address,
    contractCount: partner._count.contracts,
    portalAccountCount: partner._count.customers,
    createdAt: partner.created_at?.toISOString() ?? null,
  };
}

export async function getPartners(): Promise<Partner[]> {
  const session = await requirePermission("partners.view");

  try {
    const partners = await prisma.partners.findMany({
      where: { deleted_at: null },
      orderBy: { partner_name: "asc" },
      select: partnerSelect(session.user.clusters),
    });
    const countryNames = await countryNamesFor(partners);
    return partners.map((partner) => toPartner(partner, countryNames));
  } catch (error) {
    console.error("getPartners failed", { error });
    throw new Error("Could not load partners.");
  }
}

export async function getPartner(partnerId: string): Promise<Partner | null> {
  const session = await requirePermission("partners.view");

  const parsedId = partnerIdSchema.safeParse(partnerId);
  if (!parsedId.success) return null;

  try {
    const partner = await prisma.partners.findFirst({
      where: { id: BigInt(parsedId.data), deleted_at: null },
      select: partnerSelect(session.user.clusters),
    });
    if (!partner) return null;
    return toPartner(partner, await countryNamesFor([partner]));
  } catch (error) {
    console.error("getPartner failed", { partnerId: parsedId.data, error });
    throw new Error("Could not load this partner.");
  }
}

export async function getPartnerCountryOptions(): Promise<CountryOption[]> {
  await requirePermission("partners.view");

  try {
    const countries = await prisma.countries.findMany({
      where: { deleted_at: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });
    return countries.map((country) => ({ id: country.id.toString(), name: country.name }));
  } catch (error) {
    console.error("getPartnerCountryOptions failed", { error });
    throw new Error("Could not load countries.");
  }
}

async function canManagePartners() {
  try {
    await requirePermission("partners.manage");
    return true;
  } catch {
    return false;
  }
}

// currentType lets a partner keep a type saved outside the legacy options until an admin picks a new one.
async function validatePartnerInput(
  input: PartnerFormInput,
  currentType: string | null,
): Promise<ActionResult<Prisma.partnersUncheckedCreateInput>> {
  const parsed = partnerFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  if (!isPartnerType(parsed.data.partnerType) && parsed.data.partnerType !== currentType) {
    return { ok: false, error: "Choose a partner type." };
  }

  const countryId = BigInt(parsed.data.countryId);
  const country = await prisma.countries.findFirst({ where: { id: countryId, deleted_at: null }, select: { id: true } });
  if (!country) return { ok: false, error: "The selected country no longer exists." };

  return {
    ok: true,
    data: {
      partner_name: parsed.data.name,
      country_id: countryId,
      partner_type: parsed.data.partnerType,
      contact_name: parsed.data.contactName,
      email: parsed.data.email,
      mobile_number: parsed.data.mobileNumber,
      tax_id: parsed.data.taxId,
      address: parsed.data.address,
    },
  };
}

export async function createPartner(input: PartnerFormInput): Promise<ActionResult<{ id: string }>> {
  if (!(await canManagePartners())) {
    return { ok: false, error: "You don't have permission to add partners." };
  }

  try {
    const validated = await validatePartnerInput(input, null);
    if (!validated.ok) return validated;

    const now = new Date();
    const partner = await prisma.partners.create({
      data: { ...validated.data, created_at: now, updated_at: now },
      select: { id: true },
    });
    return { ok: true, data: { id: partner.id.toString() } };
  } catch (error) {
    console.error("createPartner failed", { error });
    return { ok: false, error: "Could not add this partner. Try again." };
  }
}

export async function updatePartner(partnerId: string, input: PartnerFormInput): Promise<ActionResult<{ id: string }>> {
  if (!(await canManagePartners())) {
    return { ok: false, error: "You don't have permission to edit partners." };
  }

  const parsedId = partnerIdSchema.safeParse(partnerId);
  if (!parsedId.success) return { ok: false, error: "Unknown partner." };

  try {
    const existing = await prisma.partners.findFirst({
      where: { id: BigInt(parsedId.data), deleted_at: null },
      select: { partner_type: true },
    });
    if (!existing) return { ok: false, error: "This partner no longer exists." };

    const validated = await validatePartnerInput(input, existing.partner_type);
    if (!validated.ok) return validated;

    const result = await prisma.partners.updateMany({
      where: { id: BigInt(parsedId.data), deleted_at: null },
      data: { ...validated.data, updated_at: new Date() },
    });
    if (result.count === 0) return { ok: false, error: "This partner no longer exists." };

    return { ok: true, data: { id: parsedId.data } };
  } catch (error) {
    console.error("updatePartner failed", { partnerId: parsedId.data, error });
    return { ok: false, error: "Could not save this partner. Try again." };
  }
}

export async function archivePartner(partnerId: string): Promise<ActionResult<{ id: string }>> {
  if (!(await canManagePartners())) {
    return { ok: false, error: "You don't have permission to archive partners." };
  }

  const parsedId = partnerIdSchema.safeParse(partnerId);
  if (!parsedId.success) return { ok: false, error: "Unknown partner." };

  try {
    const now = new Date();
    const result = await prisma.partners.updateMany({
      where: { id: BigInt(parsedId.data), deleted_at: null },
      data: { deleted_at: now, updated_at: now },
    });
    if (result.count === 0) return { ok: false, error: "This partner is already archived." };

    return { ok: true, data: { id: parsedId.data } };
  } catch (error) {
    console.error("archivePartner failed", { partnerId: parsedId.data, error });
    return { ok: false, error: "Could not archive this partner. Try again." };
  }
}
