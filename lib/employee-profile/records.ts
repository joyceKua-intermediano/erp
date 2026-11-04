import "server-only"
import type { ActionResult } from "@/lib/action-result"
import {
  expatFromIsLocal,
  isAcceptableDocumentPath,
  isEmployeeDocumentPath,
  isLocalFromExpat,
  sanitizeDocumentFileName,
  socialSecurityFields,
  type DocumentsFormValues,
  type EmployeeDocuments,
  type EmployeeProfile,
  type ProfileFormValues,
} from "@/lib/employee-profile"
import type { Prisma } from "@/lib/generated/prisma/client"
import { prisma } from "@/lib/prisma"
import { deleteStoredFile, storedFileExists } from "@/lib/storage"

const latest = { orderBy: { id: "desc" }, take: 1 } as const

// Like legacy, employees only see contracts once Intermediano has sent them for signature.
export function employeeContractsWhere(employeeId: bigint) {
  return { employee_id: employeeId, deleted_at: null, is_sent_to_employee: true } satisfies Prisma.contractsWhereInput
}

function toIsoDate(value: Date | null | undefined) {
  return value ? value.toISOString().slice(0, 10) : ""
}

function toDate(value: string) {
  return value ? new Date(`${value}T00:00:00.000Z`) : null
}

function orNull(value: string) {
  return value === "" ? null : value
}

const profileSelect = {
  id: true,
  gender: true,
  civil_status: true,
  date_of_birth: true,
  is_local: true,
  passport_number: true,
  work_visa: true,
  nationality: true,
  city: true,
  country: true,
  state: true,
  address: true,
  postal_code: true,
  phone: true,
  mobile: true,
  education_attainment: true,
  education_status: true,
  number_of_dependents: true,
  updated_at: true,
  dependents: {
    orderBy: { id: "asc" },
    select: { full_name: true, relationship: true, date_of_birth: true, tax_id: true },
  },
  emergency_contacts: {
    ...latest,
    select: { emergency_contact_name: true, relationship: true, mobile_number: true, email: true },
  },
} satisfies Prisma.personal_informationSelect

export async function loadEmployeeProfile(employeeId: bigint): Promise<EmployeeProfile> {
  const row = await prisma.personal_information.findFirst({
    where: { employee_id: employeeId },
    ...latest,
    select: profileSelect,
  })
  const [contact] = row?.emergency_contacts ?? []

  return {
    hasRecord: row !== null,
    updatedAt: row?.updated_at?.toISOString() ?? null,
    values: {
      gender: row?.gender ?? "",
      civilStatus: row?.civil_status ?? "",
      dateOfBirth: toIsoDate(row?.date_of_birth),
      nationality: row?.nationality ?? "",
      address: row?.address ?? "",
      city: row?.city ?? "",
      state: row?.state ?? "",
      country: row?.country ?? "",
      postalCode: row?.postal_code ?? "",
      phone: row?.phone ?? "",
      mobile: row?.mobile ?? "",
      educationAttainment: row?.education_attainment ?? "",
      educationStatus: row?.education_status ?? "",
      expat: row ? expatFromIsLocal(row.is_local) : "",
      passportNumber: row?.passport_number ?? "",
      workVisa: row?.work_visa ?? "",
      numberOfDependents: row?.number_of_dependents?.toString() ?? "",
      dependents: (row?.dependents ?? []).map((dependent) => ({
        fullName: dependent.full_name ?? "",
        relationship: dependent.relationship ?? "",
        dateOfBirth: toIsoDate(dependent.date_of_birth),
        taxId: dependent.tax_id ?? "",
      })),
      emergencyContact: {
        name: contact?.emergency_contact_name ?? "",
        relationship: contact?.relationship ?? "",
        mobile: contact?.mobile_number ?? "",
        email: contact?.email ?? "",
      },
    },
  }
}

export async function saveEmployeeProfile(employeeId: bigint, values: ProfileFormValues) {
  const now = new Date()
  const data = {
    gender: orNull(values.gender),
    civil_status: orNull(values.civilStatus),
    date_of_birth: toDate(values.dateOfBirth),
    is_local: isLocalFromExpat(values.expat),
    passport_number: orNull(values.passportNumber),
    work_visa: orNull(values.workVisa),
    nationality: orNull(values.nationality),
    city: orNull(values.city),
    country: orNull(values.country),
    state: orNull(values.state),
    address: orNull(values.address),
    postal_code: orNull(values.postalCode),
    phone: orNull(values.phone),
    mobile: orNull(values.mobile),
    education_attainment: orNull(values.educationAttainment),
    education_status: orNull(values.educationStatus),
    number_of_dependents: values.numberOfDependents === "" ? 0 : Number(values.numberOfDependents),
    updated_at: now,
  }
  const contact = {
    emergency_contact_name: values.emergencyContact.name,
    relationship: values.emergencyContact.relationship,
    mobile_number: values.emergencyContact.mobile,
    email: values.emergencyContact.email,
    updated_at: now,
  }

  await prisma.$transaction(async (tx) => {
    const existing = await tx.personal_information.findFirst({
      where: { employee_id: employeeId },
      ...latest,
      select: { id: true },
    })
    const personalId = existing
      ? (await tx.personal_information.update({ where: { id: existing.id }, data, select: { id: true } })).id
      : (
          await tx.personal_information.create({
            data: { ...data, employee_id: employeeId, created_at: now },
            select: { id: true },
          })
        ).id

    await tx.dependents.deleteMany({ where: { personal_information_id: personalId } })
    if (values.dependents.length > 0) {
      await tx.dependents.createMany({
        data: values.dependents.map((dependent) => ({
          personal_information_id: personalId,
          full_name: dependent.fullName,
          relationship: orNull(dependent.relationship),
          date_of_birth: toDate(dependent.dateOfBirth),
          tax_id: orNull(dependent.taxId),
          created_at: now,
          updated_at: now,
        })),
      })
    }

    const existingContact = await tx.emergency_contacts.findFirst({
      where: { personal_information_id: personalId },
      ...latest,
      select: { id: true },
    })
    if (existingContact) {
      await tx.emergency_contacts.update({ where: { id: existingContact.id }, data: contact })
    } else {
      await tx.emergency_contacts.create({ data: { ...contact, personal_information_id: personalId, created_at: now } })
    }
  })
}

const documentsSelect = {
  id: true,
  personal_id: true,
  organism: true,
  tax_id: true,
  expiration: true,
  other: true,
  is_driver_license: true,
  has_insurance: true,
  category: true,
  updated_at: true,
  employee_files: {
    orderBy: { id: "asc" },
    select: { id: true, document_type: true, file_path: true, original_file_name: true },
  },
  banking_details: {
    ...latest,
    select: {
      bank_name: true,
      bank_code: true,
      branch_name: true,
      account_number: true,
      account_type: true,
      bank_account_currency: true,
    },
  },
  social_security_infos: {
    ...latest,
    select: {
      health_fund: true,
      health_fund_file: true,
      pension_fund: true,
      pension_fund_file: true,
      severance_fund: true,
      severance_fund_file: true,
      curp: true,
      curp_file: true,
      social_security_number: true,
      social_security_file: true,
      voter_id: true,
      voter_id_file: true,
    },
  },
} satisfies Prisma.documentsSelect

type DocumentsRow = Prisma.documentsGetPayload<{ select: typeof documentsSelect }>

function findLatestDocuments(employeeId: bigint) {
  return prisma.documents.findFirst({ where: { employee_id: employeeId }, ...latest, select: documentsSelect })
}

// Every file path currently stored for this employee's documents.
function storedDocumentPaths(row: DocumentsRow | null) {
  const paths: string[] = (row?.employee_files ?? []).map((file) => file.file_path)
  const [social] = row?.social_security_infos ?? []
  if (social) {
    for (const field of socialSecurityFields) {
      const value = social[field.column]
      if (value) paths.push(value)
    }
  }
  return paths
}

export async function loadEmployeeDocuments(employeeId: bigint): Promise<EmployeeDocuments> {
  const [row, employee] = await Promise.all([
    findLatestDocuments(employeeId),
    prisma.employees.findUnique({
      where: { id: employeeId },
      select: { intermediano_companies: { select: { countries: { select: { name: true } } } } },
    }),
  ])
  const [bank] = row?.banking_details ?? []
  const [social] = row?.social_security_infos ?? []
  const files = row?.employee_files ?? []

  return {
    employeeId: employeeId.toString(),
    hasRecord: row !== null,
    updatedAt: row?.updated_at?.toISOString() ?? null,
    countryName: employee?.intermediano_companies?.countries.name ?? null,
    files: files.map((file) => ({
      id: file.id.toString(),
      documentType: file.document_type,
      path: file.file_path,
      fileName: file.original_file_name,
    })),
    values: {
      personalId: row?.personal_id ?? "",
      organism: row?.organism ?? "",
      taxId: row?.tax_id ?? "",
      expiration: toIsoDate(row?.expiration),
      other: row?.other ?? "",
      category: row?.category ?? "",
      hasInsurance: row?.has_insurance ?? false,
      isDriverLicense: row?.is_driver_license ?? false,
      files: files.map((file) => ({
        documentType: file.document_type as DocumentsFormValues["files"][number]["documentType"],
        path: file.file_path,
        fileName: file.original_file_name,
      })),
      bank: {
        bankName: bank?.bank_name ?? "",
        bankCode: bank?.bank_code ?? "",
        branchName: bank?.branch_name ?? "",
        accountNumber: bank?.account_number ?? "",
        accountType: bank?.account_type ?? "",
        currency: bank?.bank_account_currency ?? "",
      },
      social: {
        healthFund: social?.health_fund ?? "",
        healthFundFile: social?.health_fund_file ?? "",
        pensionFund: social?.pension_fund ?? "",
        pensionFundFile: social?.pension_fund_file ?? "",
        severanceFund: social?.severance_fund ?? "",
        severanceFundFile: social?.severance_fund_file ?? "",
        curp: social?.curp ?? "",
        curpFile: social?.curp_file ?? "",
        socialSecurityNumber: social?.social_security_number ?? "",
        socialSecurityFile: social?.social_security_file ?? "",
        voterId: social?.voter_id ?? "",
        voterIdFile: social?.voter_id_file ?? "",
      },
    },
  }
}

function submittedPaths(values: DocumentsFormValues) {
  const paths = values.files.map((file) => file.path)
  for (const field of socialSecurityFields) {
    const value = values.social[field.fileKey]
    if (value) paths.push(value)
  }
  return paths
}

// Files this employee uploaded that nothing points at any more; legacy files are never removed.
async function removeUnusedDocuments(employeeId: bigint, previous: string[], current: string[]) {
  const kept = new Set(current)
  for (const path of new Set(previous)) {
    if (kept.has(path) || !isEmployeeDocumentPath(path, employeeId)) continue
    try {
      await deleteStoredFile(path)
    } catch (error) {
      console.error("removing an unused employee document failed", { employeeId: employeeId.toString(), path, error })
    }
  }
}

export async function saveEmployeeDocuments(
  employeeId: bigint,
  values: DocumentsFormValues,
): Promise<ActionResult<null>> {
  const before = await findLatestDocuments(employeeId)
  const previousPaths = storedDocumentPaths(before)
  const stored = new Set(previousPaths)
  const paths = submittedPaths(values)

  if (paths.some((path) => !isAcceptableDocumentPath(path, employeeId, stored))) {
    return { ok: false, error: "A file couldn't be matched to your uploads. Upload it again and save." }
  }
  for (const path of paths) {
    if (!stored.has(path) && !(await storedFileExists(path))) {
      return { ok: false, error: "A file didn't finish uploading. Upload it again and save." }
    }
  }

  const storedNames = new Map((before?.employee_files ?? []).map((file) => [file.file_path, file.original_file_name]))
  const now = new Date()
  const data = {
    personal_id: orNull(values.personalId),
    organism: orNull(values.organism),
    tax_id: orNull(values.taxId),
    expiration: toDate(values.expiration),
    other: orNull(values.other),
    category: orNull(values.category),
    has_insurance: values.hasInsurance,
    is_driver_license: values.isDriverLicense,
    updated_at: now,
  }
  const bank = {
    bank_name: orNull(values.bank.bankName),
    bank_code: orNull(values.bank.bankCode),
    branch_name: orNull(values.bank.branchName),
    account_number: orNull(values.bank.accountNumber),
    account_type: orNull(values.bank.accountType),
    bank_account_currency: orNull(values.bank.currency),
    updated_at: now,
  }
  const social = {
    health_fund: orNull(values.social.healthFund),
    health_fund_file: orNull(values.social.healthFundFile),
    pension_fund: orNull(values.social.pensionFund),
    pension_fund_file: orNull(values.social.pensionFundFile),
    severance_fund: orNull(values.social.severanceFund),
    severance_fund_file: orNull(values.social.severanceFundFile),
    curp: orNull(values.social.curp),
    curp_file: orNull(values.social.curpFile),
    social_security_number: orNull(values.social.socialSecurityNumber),
    social_security_file: orNull(values.social.socialSecurityFile),
    voter_id: orNull(values.social.voterId),
    voter_id_file: orNull(values.social.voterIdFile),
    updated_at: now,
  }

  await prisma.$transaction(async (tx) => {
    const existing = await tx.documents.findFirst({ where: { employee_id: employeeId }, ...latest, select: { id: true } })
    const documentId = existing
      ? (await tx.documents.update({ where: { id: existing.id }, data, select: { id: true } })).id
      : (await tx.documents.create({ data: { ...data, employee_id: employeeId, created_at: now }, select: { id: true } }))
          .id

    await tx.employee_files.deleteMany({ where: { document_id: documentId } })
    if (values.files.length > 0) {
      await tx.employee_files.createMany({
        data: values.files.map((file) => ({
          document_id: documentId,
          document_type: file.documentType,
          file_path: file.path,
          original_file_name: storedNames.get(file.path) ?? sanitizeDocumentFileName(file.fileName),
          created_at: now,
          updated_at: now,
        })),
      })
    }

    const existingBank = await tx.banking_details.findFirst({
      where: { document_id: documentId },
      ...latest,
      select: { id: true },
    })
    if (existingBank) await tx.banking_details.update({ where: { id: existingBank.id }, data: bank })
    else await tx.banking_details.create({ data: { ...bank, document_id: documentId, created_at: now } })

    const existingSocial = await tx.social_security_infos.findFirst({
      where: { document_id: documentId },
      ...latest,
      select: { id: true },
    })
    if (existingSocial) await tx.social_security_infos.update({ where: { id: existingSocial.id }, data: social })
    else await tx.social_security_infos.create({ data: { ...social, document_id: documentId, created_at: now } })
  })

  await removeUnusedDocuments(employeeId, previousPaths, paths)
  return { ok: true, data: null }
}

// The stored path behind a file reference: "f-<employee_files.id>" or a social security file column.
export async function findEmployeeDocumentFile(
  employeeId: bigint,
  ref: string,
): Promise<{ path: string; fileName: string } | null> {
  const fileMatch = /^f-(\d+)$/.exec(ref)
  if (fileMatch) {
    const file = await prisma.employee_files.findFirst({
      where: { id: BigInt(fileMatch[1]), documents: { employee_id: employeeId } },
      select: { file_path: true, original_file_name: true },
    })
    return file ? { path: file.file_path, fileName: file.original_file_name } : null
  }

  const field = socialSecurityFields.find((item) => item.column === ref)
  if (!field) return null
  const row = await findLatestDocuments(employeeId)
  const path = row?.social_security_infos[0]?.[field.column]
  if (!path) return null
  return { path, fileName: path.split("/").pop() || field.label }
}
