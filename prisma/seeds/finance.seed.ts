import type { Prisma } from "../../lib/generated/prisma/client"
import { ids, timestamps } from "./ids"

export const investments = [
  {
    id: ids.investment.bancolombiaCdt,
    bank_id: ids.bank.bancolombia,
    currency_id: ids.currency.cop,
    capital: "250000000.00",
    rate_type: "Fixed",
    interest_rate: "9.50",
    deposit_date: new Date("2026-01-15"),
    withdrawal_period: 180,
    year: 2026,
    ...timestamps,
  },
] satisfies Prisma.investmentsCreateManyInput[]

export const staffTrackers = [
  {
    id: ids.staffTracker.andreaNorthwind,
    consultant_id: ids.consultant.andrea,
    industry_field_id: ids.industryField.software,
    intermediano_company_id: ids.intermedianoCompany.canada,
    company_id: ids.company.northwindSoftware,
    partner_id: ids.partner.mapleStaffing,
    position: "QA Engineer",
    start_date: new Date("2026-01-12"),
    status: true,
    ...timestamps,
  },
] satisfies Prisma.staff_trackersCreateManyInput[]
