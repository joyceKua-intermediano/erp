import "server-only"
import { toCardinal as toCardinalEn } from "n2words/en"
import { toCardinal as toCardinalEs } from "n2words/es"
import { toCardinal as toCardinalPt } from "n2words/pt-BR"
import { stripHtml, toContractKind, isSigned } from "@/lib/contracts"
import type { Prisma } from "@/lib/generated/prisma/client"
import { prisma } from "@/lib/prisma"
import { getClusterProfile, signerTitles, type ClusterProfile, type ContractLanguage } from "./cluster-profiles"
import { contractRenderDataSchema, type ContractRenderData } from "./render-data-schema"

const renderSelect = {
  id: true,
  contract_type: true,
  job_title: true,
  translated_position: true,
  country_work: true,
  start_date: true,
  end_date: true,
  created_at: true,
  gross_salary: true,
  is_integral: true,
  job_description: true,
  translated_job_description: true,
  signature: true,
  signed_contract: true,
  admin_signature: true,
  admin_signed_contract: true,
  countries: { select: { name: true } },
  users: { select: { name: true } },
  intermediano_companies: {
    select: {
      name: true,
      address: true,
      tax_id: true,
      email: true,
      mobile_number: true,
      countries: { select: { name: true } },
    },
  },
  companies: {
    select: {
      name: true,
      address: true,
      city: true,
      state: true,
      country: true,
      tax_id: true,
      contacts: {
        where: { deleted_at: null },
        orderBy: [{ is_main_contact: "desc" }, { id: "asc" }],
        take: 1,
        select: { contact_name: true, surname: true, position: true, email: true, phone: true, mobile: true },
      },
    },
  },
  supplementary_contract_details: {
    orderBy: { id: "desc" },
    take: 1,
    select: { standard_working_hours: true, shift_schedule: true, notice_period: true, payment_terms: true },
  },
  employees: {
    select: {
      name: true,
      email: true,
      personal_information: {
        orderBy: { id: "desc" },
        take: 1,
        select: {
          gender: true,
          civil_status: true,
          date_of_birth: true,
          nationality: true,
          address: true,
          city: true,
          state: true,
          country: true,
          postal_code: true,
          phone: true,
          mobile: true,
          dependents: { orderBy: { id: "asc" }, select: { full_name: true, relationship: true } },
        },
      },
      documents: {
        orderBy: { id: "desc" },
        take: 1,
        select: {
          personal_id: true,
          tax_id: true,
          banking_details: {
            orderBy: { id: "desc" },
            take: 1,
            select: { bank_name: true, bank_code: true, account_number: true, account_type: true },
          },
          social_security_infos: {
            orderBy: { id: "desc" },
            take: 1,
            select: {
              social_security_number: true,
              health_fund: true,
              pension_fund: true,
              severance_fund: true,
              curp: true,
              voter_id: true,
            },
          },
        },
      },
    },
  },
} satisfies Prisma.contractsSelect

const civilStatusWords: Record<string, Record<ContractLanguage, string>> = {
  single: { es: "soltero(a)", pt: "solteiro(a)", en: "single" },
  married: { es: "casado(a)", pt: "casado(a)", en: "married" },
  divorced: { es: "divorciado(a)", pt: "divorciado(a)", en: "divorced" },
  widowed: { es: "viudo(a)", pt: "viúvo(a)", en: "widowed" },
  separated: { es: "separado(a)", pt: "separado(a)", en: "separated" },
  "common-law": { es: "unión libre", pt: "união estável", en: "common-law partner" },
}

const genderWords: Record<string, Record<ContractLanguage, string>> = {
  male: { es: "masculino", pt: "masculino", en: "male" },
  female: { es: "femenino", pt: "feminino", en: "female" },
}

function translate(words: Record<string, Record<ContractLanguage, string>>, value: string | null, language: ContractLanguage) {
  if (!value) return null
  return words[value.trim().toLowerCase()]?.[language] ?? value
}

function blankToNull(value: string | null | undefined) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

const longDateOptions: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }

function toDateValue(value: Date | null, profile: ClusterProfile) {
  if (!value) return null
  return {
    iso: value.toISOString().slice(0, 10),
    short: new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }).format(value),
    long: new Intl.DateTimeFormat(profile.locale, longDateOptions).format(value),
    longEn: new Intl.DateTimeFormat("en-US", longDateOptions).format(value),
  }
}

function toDateTimeText(value: Date | null, profile: ClusterProfile) {
  if (!value) return null
  return new Intl.DateTimeFormat(profile.locale, { dateStyle: "long", timeStyle: "short", timeZone: "UTC" }).format(value)
}

function ageOn(birthDate: Date | null, today: Date) {
  if (!birthDate) return null
  let age = today.getUTCFullYear() - birthDate.getUTCFullYear()
  const hadBirthday =
    today.getUTCMonth() > birthDate.getUTCMonth() ||
    (today.getUTCMonth() === birthDate.getUTCMonth() && today.getUTCDate() >= birthDate.getUTCDate())
  if (!hadBirthday) age -= 1
  return age
}

const cardinals: Record<ContractLanguage, (value: number) => string> = {
  es: (value) => toCardinalEs(value),
  pt: (value) => toCardinalPt(value),
  en: (value) => toCardinalEn(value),
}

const centsJoiners: Record<ContractLanguage, string> = { es: "con", pt: "e", en: "and" }

// Spells the whole amount in words, with cents as a fraction ("con 50/100") as Latin American contracts do.
function spellAmount(amount: number, language: ContractLanguage, currencyWords: string) {
  const whole = Math.floor(amount)
  const cents = Math.round((amount - whole) * 100)
  const words = `${cardinals[language](whole)} ${currencyWords}`
  return cents > 0 ? `${words} ${centsJoiners[language]} ${String(cents).padStart(2, "0")}/100` : words
}

function toSalary(raw: string | null, profile: ClusterProfile) {
  const amount = raw ? Number(raw.replace(/[^0-9.]/g, "")) : NaN
  const hasAmount = Number.isFinite(amount) && raw !== null && raw.trim() !== ""
  return {
    amount: hasAmount ? amount : null,
    formatted: hasAmount
      ? `${profile.currencySymbol} ${new Intl.NumberFormat(profile.locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)}`
      : null,
    currencyCode: profile.currencyCode,
    currencySymbol: profile.currencySymbol,
    spelledLocal: hasAmount ? spellAmount(amount, profile.language, profile.currencyWords) : null,
    spelledEn: hasAmount ? spellAmount(amount, "en", profile.currencyWordsEn) : null,
  }
}

type RenderRow = Prisma.contractsGetPayload<{ select: typeof renderSelect }>

function toRenderData(row: RenderRow, now: Date): ContractRenderData {
  const cluster = row.intermediano_companies
  const profile = getClusterProfile(cluster?.countries.name ?? null)
  const language = profile.language
  const kind = toContractKind(row.contract_type)
  const [personal] = row.employees.personal_information
  const [document] = row.employees.documents
  const [bank] = document?.banking_details ?? []
  const [social] = document?.social_security_infos ?? []
  const [supplementary] = row.supplementary_contract_details
  const [contact] = row.companies?.contacts ?? []
  const created = row.created_at ?? now

  const fullAddress = [personal?.address, personal?.city, personal?.state, personal?.country, personal?.postal_code]
    .map(blankToNull)
    .filter((part): part is string => part !== null)
    .join(", ")

  const personalId = blankToNull(document?.personal_id)
  const clusterTaxId = blankToNull(cluster?.tax_id)
  const legalName = cluster?.name ?? ""
  const adminSigned = isSigned(row.admin_signature)
  const employeeSigned = isSigned(row.signature)

  return {
    version: 1,
    contract: {
      number: `${created.getUTCFullYear()}.${row.id.toString().padStart(4, "0")}`,
      kind,
      jobTitle: blankToNull(row.job_title),
      translatedPosition: blankToNull(row.translated_position),
      countryOfWork: row.countries?.name ?? blankToNull(row.country_work),
      isIntegral: row.is_integral ?? false,
      isOpenEnded: row.end_date === null,
      startDate: toDateValue(row.start_date, profile),
      endDate: toDateValue(row.end_date, profile),
      createdDate: toDateValue(created, profile),
      jobDescription: stripHtml(row.job_description),
      translatedJobDescription: stripHtml(row.translated_job_description),
      workingHours: blankToNull(supplementary?.standard_working_hours),
      shiftSchedule: blankToNull(supplementary?.shift_schedule),
      noticePeriod: blankToNull(supplementary?.notice_period),
      paymentTerms: blankToNull(supplementary?.payment_terms),
    },
    employee: {
      name: row.employees.name,
      printedName: row.employees.name.toLocaleUpperCase(profile.locale),
      email: row.employees.email,
      personalId,
      taxId: blankToNull(document?.tax_id),
      nationality: blankToNull(personal?.nationality),
      civilStatus: blankToNull(personal?.civil_status),
      civilStatusLocal: translate(civilStatusWords, blankToNull(personal?.civil_status), language),
      gender: blankToNull(personal?.gender),
      genderLocal: translate(genderWords, blankToNull(personal?.gender), language),
      dateOfBirth: toDateValue(personal?.date_of_birth ?? null, profile),
      age: ageOn(personal?.date_of_birth ?? null, now),
      phone: blankToNull(personal?.phone),
      mobile: blankToNull(personal?.mobile),
      address: blankToNull(personal?.address),
      city: blankToNull(personal?.city),
      state: blankToNull(personal?.state),
      country: blankToNull(personal?.country),
      postalCode: blankToNull(personal?.postal_code),
      fullAddress: fullAddress || null,
      bank: {
        name: blankToNull(bank?.bank_name),
        code: blankToNull(bank?.bank_code),
        accountNumber: blankToNull(bank?.account_number),
        accountType: blankToNull(bank?.account_type),
      },
      socialSecurity: {
        number: blankToNull(social?.social_security_number),
        healthFund: blankToNull(social?.health_fund),
        pensionFund: blankToNull(social?.pension_fund),
        severanceFund: blankToNull(social?.severance_fund),
        curp: blankToNull(social?.curp),
        voterId: blankToNull(social?.voter_id),
      },
      dependents: (personal?.dependents ?? []).map((dependent) => ({
        name: dependent.full_name ?? "",
        relationship: dependent.relationship ?? "",
      })),
    },
    client: row.companies
      ? {
          name: row.companies.name,
          address: blankToNull(row.companies.address),
          city: blankToNull(row.companies.city),
          state: blankToNull(row.companies.state),
          country: blankToNull(row.companies.country),
          taxId: blankToNull(row.companies.tax_id),
          contact: {
            name: contact ? [contact.contact_name, contact.surname].map(blankToNull).filter(Boolean).join(" ") || null : null,
            position: blankToNull(contact?.position),
            email: blankToNull(contact?.email),
            phone: blankToNull(contact?.phone) ?? blankToNull(contact?.mobile),
          },
        }
      : null,
    cluster: {
      legalName,
      address: blankToNull(cluster?.address),
      taxId: clusterTaxId,
      taxIdLabel: profile.taxIdLabel,
      email: blankToNull(cluster?.email),
      phone: blankToNull(cluster?.mobile_number),
      website: "www.intermediano.com",
      country: cluster?.countries.name ?? "",
      language,
    },
    salary: toSalary(row.gross_salary, profile),
    signatures: {
      employer: {
        title: signerTitles[language].employer,
        name: adminSigned ? (row.users?.name ?? null) : null,
        lines: [legalName, clusterTaxId ? `${profile.taxIdLabel}: ${clusterTaxId}` : null].filter(
          (line): line is string => Boolean(line)
        ),
        signed: adminSigned,
        signedAt: adminSigned ? toDateTimeText(row.admin_signed_contract, profile) : null,
      },
      employee:
        kind === "customer" && row.companies
          ? {
              title: signerTitles[language].customer,
              name: row.companies.name,
              lines: blankToNull(row.companies.tax_id) ? [`${profile.taxIdLabel}: ${row.companies.tax_id}`] : [],
              signed: employeeSigned,
              signedAt: employeeSigned ? toDateTimeText(row.signed_contract, profile) : null,
            }
          : {
              title: signerTitles[language].employee,
              name: row.employees.name,
              lines: personalId ? [`${profile.employeeIdLabel} ${personalId}`] : [],
              signed: employeeSigned,
              signedAt: employeeSigned ? toDateTimeText(row.signed_contract, profile) : null,
            },
    },
  }
}

// Returns null when the contract isn't in the cluster; the schema check guards templates against shape drift.
export async function buildContractRenderData(contractId: bigint, clusterId: bigint): Promise<ContractRenderData | null> {
  const row = await prisma.contracts.findFirst({
    where: { id: contractId, intermediano_company_id: clusterId, deleted_at: null },
    select: renderSelect,
  })
  if (!row) return null
  return contractRenderDataSchema.parse(toRenderData(row, new Date()))
}
