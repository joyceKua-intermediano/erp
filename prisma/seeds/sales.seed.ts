import type { Prisma } from "../../lib/generated/prisma/client"
import { ids, timestamps } from "./ids"
import { countryAnnualSetups } from "./reference.seed"

const [colombia2026] = countryAnnualSetups

export const quotations = [
  {
    id: ids.quotation.acmeColombia,
    title: "Acme Logistics - Operations Analyst (Colombia)",
    company_id: ids.company.acmeLogistics,
    country_id: ids.country.colombia,
    intermediano_company_id: ids.intermedianoCompany.colombia,
    consultant_id: ids.consultant.andrea,
    currency_name: "COP",
    exchange_rate: "4100.000000",
    exchange_acronym: "USD",
    gross_salary: "6500000.00",
    is_fix_fee: false,
    fee: "12.0000",
    bank_fee: "25.0000",
    transport_allowance: "200000.00",
    uvt_amount: colombia2026.uvt_amount,
    capped_amount: colombia2026.capped_amount,
    is_payroll: true,
    ...timestamps,
  },
] satisfies Prisma.quotationsCreateManyInput[]

export const payrollCosts = [
  {
    id: ids.payrollCost.acmeColombia,
    quotation_id: ids.quotation.acmeColombia,
    medical_insurance: "150000.000000",
    meal: "0.000000",
    transportation: "200000.000000",
    operational_costs: "50000.000000",
    ...timestamps,
  },
] satisfies Prisma.payroll_costsCreateManyInput[]

export const paymentProvisions = [
  { id: ids.paymentProvision.acmePrima, quotation_id: ids.quotation.acmeColombia, provision_type_id: ids.provisionType.prima, amount: "541450.00", ...timestamps },
  { id: ids.paymentProvision.acmeCesantias, quotation_id: ids.quotation.acmeColombia, provision_type_id: ids.provisionType.cesantias, amount: "541450.00", ...timestamps },
  { id: ids.paymentProvision.acmeVacation, quotation_id: ids.quotation.acmeColombia, provision_type_id: ids.provisionType.vacation, amount: "270725.00", ...timestamps },
] satisfies Prisma.payment_provisionsCreateManyInput[]
