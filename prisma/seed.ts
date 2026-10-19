import "dotenv/config"
import { PrismaMariaDb } from "@prisma/adapter-mariadb"
import { PrismaClient } from "../lib/generated/prisma/client"
import {
  bankingDetails,
  banks,
  companies,
  consultants,
  contacts,
  contracts,
  countries,
  countryAnnualSetups,
  currencies,
  dependents,
  documents,
  emergencyContacts,
  employeeFiles,
  employees,
  industryFields,
  intermedianoCompanies,
  investments,
  leads,
  partners,
  paymentProvisions,
  payrollCosts,
  personalInformation,
  provinces,
  provisionTypes,
  quotations,
  socialSecurityInfos,
  staffTrackers,
  supplementaryContractDetails,
  templates,
  users,
} from "./seeds"

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"])
const TRANSACTION_TIMEOUT_MS = 60_000

type SeedTarget = {
  host: string
  port: number
  user: string
  password: string
  database: string
}

function resolveSeedTarget(): SeedTarget {
  const rawUrl = process.env.DATABASE_URL
  if (!rawUrl) {
    throw new Error("DATABASE_URL is not set.")
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to seed while NODE_ENV=production.")
  }

  const url = new URL(rawUrl)
  if (!LOCAL_HOSTS.has(url.hostname)) {
    throw new Error(`Refusing to seed non-local database host "${url.hostname}".`)
  }

  const database = decodeURIComponent(url.pathname.replace(/^\//, ""))
  if (!database) {
    throw new Error("DATABASE_URL does not include a database name.")
  }

  return {
    host: url.hostname,
    port: url.port ? Number(url.port) : 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database,
  }
}

async function seedStep<T extends { id: bigint }>(
  label: string,
  rows: readonly T[],
  upsert: (row: T) => Promise<unknown>,
) {
  for (const row of rows) {
    await upsert(row)
  }
  console.log(`  ${label.padEnd(32)} ${rows.length}`)
}

async function main() {
  const target = resolveSeedTarget()
  const prisma = new PrismaClient({ adapter: new PrismaMariaDb(target) })

  try {
    console.log(`Seeding "${target.database}" at ${target.host}:${target.port}`)

    await prisma.$transaction(
      async (tx) => {
        await seedStep("users", users, (row) =>
          tx.users.upsert({ where: { id: row.id }, create: row, update: row }),
        )
        await seedStep("countries", countries, (row) =>
          tx.countries.upsert({ where: { id: row.id }, create: row, update: row }),
        )
        await seedStep("currencies", currencies, (row) =>
          tx.currencies.upsert({ where: { id: row.id }, create: row, update: row }),
        )
        await seedStep("provinces", provinces, (row) =>
          tx.provinces.upsert({ where: { id: row.id }, create: row, update: row }),
        )
        await seedStep("country_annual_setups", countryAnnualSetups, (row) =>
          tx.country_annual_setups.upsert({ where: { id: row.id }, create: row, update: row }),
        )
        await seedStep("provision_types", provisionTypes, (row) =>
          tx.provision_types.upsert({ where: { id: row.id }, create: row, update: row }),
        )
        await seedStep("industry_fields", industryFields, (row) =>
          tx.industry_fields.upsert({ where: { id: row.id }, create: row, update: row }),
        )
        await seedStep("banks", banks, (row) =>
          tx.banks.upsert({ where: { id: row.id }, create: row, update: row }),
        )
        await seedStep("intermediano_companies", intermedianoCompanies, (row) =>
          tx.intermediano_companies.upsert({ where: { id: row.id }, create: row, update: row }),
        )
        await seedStep("consultants", consultants, (row) =>
          tx.consultants.upsert({ where: { id: row.id }, create: row, update: row }),
        )
        await seedStep("partners", partners, (row) =>
          tx.partners.upsert({ where: { id: row.id }, create: row, update: row }),
        )
        await seedStep("companies", companies, (row) =>
          tx.companies.upsert({ where: { id: row.id }, create: row, update: row }),
        )
        await seedStep("contacts", contacts, (row) =>
          tx.contacts.upsert({ where: { id: row.id }, create: row, update: row }),
        )
        await seedStep("leads", leads, (row) =>
          tx.leads.upsert({ where: { id: row.id }, create: row, update: row }),
        )
        await seedStep("employees", employees, (row) =>
          tx.employees.upsert({ where: { id: row.id }, create: row, update: row }),
        )
        await seedStep("personal_information", personalInformation, (row) =>
          tx.personal_information.upsert({ where: { id: row.id }, create: row, update: row }),
        )
        await seedStep("emergency_contacts", emergencyContacts, (row) =>
          tx.emergency_contacts.upsert({ where: { id: row.id }, create: row, update: row }),
        )
        await seedStep("dependents", dependents, (row) =>
          tx.dependents.upsert({ where: { id: row.id }, create: row, update: row }),
        )
        await seedStep("documents", documents, (row) =>
          tx.documents.upsert({ where: { id: row.id }, create: row, update: row }),
        )
        await seedStep("banking_details", bankingDetails, (row) =>
          tx.banking_details.upsert({ where: { id: row.id }, create: row, update: row }),
        )
        await seedStep("social_security_infos", socialSecurityInfos, (row) =>
          tx.social_security_infos.upsert({ where: { id: row.id }, create: row, update: row }),
        )
        await seedStep("employee_files", employeeFiles, (row) =>
          tx.employee_files.upsert({ where: { id: row.id }, create: row, update: row }),
        )
        await seedStep("quotations", quotations, (row) =>
          tx.quotations.upsert({ where: { id: row.id }, create: row, update: row }),
        )
        await seedStep("payroll_costs", payrollCosts, (row) =>
          tx.payroll_costs.upsert({ where: { id: row.id }, create: row, update: row }),
        )
        await seedStep("payment_provisions", paymentProvisions, (row) =>
          tx.payment_provisions.upsert({ where: { id: row.id }, create: row, update: row }),
        )
        await seedStep("templates", templates, (row) =>
          tx.templates.upsert({ where: { id: row.id }, create: row, update: row }),
        )
        await seedStep("contracts", contracts, (row) =>
          tx.contracts.upsert({ where: { id: row.id }, create: row, update: row }),
        )
        await seedStep("supplementary_contract_details", supplementaryContractDetails, (row) =>
          tx.supplementary_contract_details.upsert({ where: { id: row.id }, create: row, update: row }),
        )
        await seedStep("investments", investments, (row) =>
          tx.investments.upsert({ where: { id: row.id }, create: row, update: row }),
        )
        await seedStep("staff_trackers", staffTrackers, (row) =>
          tx.staff_trackers.upsert({ where: { id: row.id }, create: row, update: row }),
        )
      },
      { timeout: TRANSACTION_TIMEOUT_MS },
    )

    console.log("Seed complete.")
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error: unknown) => {
  console.error("Seed failed. The transaction was rolled back, so no rows were written.")
  console.error(error)
  process.exitCode = 1
})
