"use server";

import type { ActionResult } from "@/lib/action-result";
import { requirePermission } from "@/lib/auth";
import { Prisma } from "@/lib/generated/prisma/client";
import {
  holidaySetFormSchema,
  holidaySetIdSchema,
  parseStoredHolidays,
  serializeHolidays,
  toHolidayEntries,
  type HolidaySet,
  type HolidaySetFormInput,
} from "@/lib/holidays";
import type { CountryOption } from "@/lib/intermediano-companies";
import { prisma } from "@/lib/prisma";

const holidaySetSelect = {
  id: true,
  country_id: true,
  year: true,
  holidays: true,
  created_at: true,
  updated_at: true,
  countries: { select: { name: true } },
} satisfies Prisma.holidaysSelect;

type HolidaySetRow = Prisma.holidaysGetPayload<{ select: typeof holidaySetSelect }>;

function toHolidaySet(row: HolidaySetRow): HolidaySet {
  return {
    id: row.id.toString(),
    countryId: row.country_id.toString(),
    countryName: row.countries.name,
    year: row.year,
    holidays: parseStoredHolidays(row.holidays),
    createdAt: row.created_at?.toISOString() ?? null,
    updatedAt: row.updated_at?.toISOString() ?? null,
  };
}

export async function getHolidaySets(): Promise<HolidaySet[]> {
  await requirePermission("settings.view");

  try {
    const rows = await prisma.holidays.findMany({
      where: { deleted_at: null },
      orderBy: [{ year: "desc" }, { countries: { name: "asc" } }],
      select: holidaySetSelect,
    });
    return rows.map(toHolidaySet);
  } catch (error) {
    console.error("getHolidaySets failed", { error });
    throw new Error("Could not load holidays.");
  }
}

export async function getHolidayCountryOptions(): Promise<CountryOption[]> {
  await requirePermission("settings.view");

  try {
    const countries = await prisma.countries.findMany({
      where: { deleted_at: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });
    return countries.map((country) => ({ id: country.id.toString(), name: country.name }));
  } catch (error) {
    console.error("getHolidayCountryOptions failed", { error });
    throw new Error("Could not load countries.");
  }
}

async function canManageHolidays() {
  try {
    await requirePermission("settings.manage");
    return true;
  } catch {
    return false;
  }
}

function duplicateYearError(year: number) {
  return `This country already has holidays configured for ${year}.`;
}

export async function createHolidaySet(input: HolidaySetFormInput): Promise<ActionResult<{ id: string }>> {
  if (!(await canManageHolidays())) {
    return { ok: false, error: "You don't have permission to add holidays." };
  }

  const parsed = holidaySetFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const countryId = BigInt(parsed.data.countryId);
  const year = Number(parsed.data.year);
  const holidays = serializeHolidays(toHolidayEntries(parsed.data.holidays));

  try {
    const country = await prisma.countries.findFirst({ where: { id: countryId, deleted_at: null }, select: { id: true } });
    if (!country) return { ok: false, error: "The selected country no longer exists." };

    // The (country_id, year) unique index also covers archived rows, so an archived list is revived instead.
    const existing = await prisma.holidays.findUnique({
      where: { country_id_year: { country_id: countryId, year } },
      select: { id: true, deleted_at: true },
    });
    if (existing && !existing.deleted_at) return { ok: false, error: duplicateYearError(year) };

    const now = new Date();
    if (existing) {
      const result = await prisma.holidays.updateMany({
        where: { id: existing.id, deleted_at: { not: null } },
        data: { holidays, deleted_at: null, updated_at: now },
      });
      if (result.count === 0) return { ok: false, error: duplicateYearError(year) };
      return { ok: true, data: { id: existing.id.toString() } };
    }

    const created = await prisma.holidays.create({
      data: { country_id: countryId, year, holidays, created_at: now, updated_at: now },
      select: { id: true },
    });
    return { ok: true, data: { id: created.id.toString() } };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false, error: duplicateYearError(year) };
    }
    console.error("createHolidaySet failed", { error });
    return { ok: false, error: "Could not add these holidays. Try again." };
  }
}

export async function updateHolidaySet(
  holidaySetId: string,
  input: HolidaySetFormInput,
): Promise<ActionResult<{ id: string }>> {
  if (!(await canManageHolidays())) {
    return { ok: false, error: "You don't have permission to edit holidays." };
  }

  const parsedId = holidaySetIdSchema.safeParse(holidaySetId);
  if (!parsedId.success) return { ok: false, error: "Unknown holiday list." };

  const parsed = holidaySetFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  try {
    const existing = await prisma.holidays.findFirst({
      where: { id: BigInt(parsedId.data), deleted_at: null },
      select: { country_id: true, year: true },
    });
    if (!existing) return { ok: false, error: "This holiday list no longer exists." };
    if (existing.country_id.toString() !== parsed.data.countryId || existing.year !== Number(parsed.data.year)) {
      return { ok: false, error: "Country and year can't be changed. Archive this list and add a new one instead." };
    }

    const result = await prisma.holidays.updateMany({
      where: { id: BigInt(parsedId.data), deleted_at: null },
      data: { holidays: serializeHolidays(toHolidayEntries(parsed.data.holidays)), updated_at: new Date() },
    });
    if (result.count === 0) return { ok: false, error: "This holiday list no longer exists." };

    return { ok: true, data: { id: parsedId.data } };
  } catch (error) {
    console.error("updateHolidaySet failed", { holidaySetId: parsedId.data, error });
    return { ok: false, error: "Could not save these holidays. Try again." };
  }
}

export async function archiveHolidaySet(holidaySetId: string): Promise<ActionResult<{ id: string }>> {
  if (!(await canManageHolidays())) {
    return { ok: false, error: "You don't have permission to archive holidays." };
  }

  const parsedId = holidaySetIdSchema.safeParse(holidaySetId);
  if (!parsedId.success) return { ok: false, error: "Unknown holiday list." };

  try {
    const now = new Date();
    const result = await prisma.holidays.updateMany({
      where: { id: BigInt(parsedId.data), deleted_at: null },
      data: { deleted_at: now, updated_at: now },
    });
    if (result.count === 0) return { ok: false, error: "This holiday list is already archived." };

    return { ok: true, data: { id: parsedId.data } };
  } catch (error) {
    console.error("archiveHolidaySet failed", { holidaySetId: parsedId.data, error });
    return { ok: false, error: "Could not archive this holiday list. Try again." };
  }
}
