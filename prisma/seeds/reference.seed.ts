import type { Prisma } from "../../lib/generated/prisma/client"
import { ids, timestamps } from "./ids"

export const countries = [
  { id: ids.country.colombia, name: "Colombia", income_tax_rate: "35.00", use_real_time_conversion: true, ...timestamps },
  { id: ids.country.brasil, name: "Brasil", income_tax_rate: "34.00", use_real_time_conversion: true, ...timestamps },
  { id: ids.country.canada, name: "Canada", income_tax_rate: "26.50", use_real_time_conversion: false, ...timestamps },
] satisfies Prisma.countriesCreateManyInput[]

export const currencies = [
  { id: ids.currency.cop, country_id: ids.country.colombia, currency_name: "COP", currency_quota: "4100.00", converted_currency_quota: "4100.00", ...timestamps },
  { id: ids.currency.brl, country_id: ids.country.brasil, currency_name: "BRL", currency_quota: "5.40", converted_currency_quota: "5.40", ...timestamps },
  { id: ids.currency.cad, country_id: ids.country.canada, currency_name: "CAD", currency_quota: "1.37", converted_currency_quota: "1.37", ...timestamps },
] satisfies Prisma.currenciesCreateManyInput[]

export const provinces = [
  { id: ids.province.ontario, country_id: ids.country.canada, name: "Ontario", ...timestamps },
  { id: ids.province.quebec, country_id: ids.country.canada, name: "Quebec", ...timestamps },
] satisfies Prisma.provincesCreateManyInput[]

export const countryAnnualSetups = [
  {
    id: ids.countryAnnualSetup.colombia2026,
    country_id: ids.country.colombia,
    year: "2026",
    uvt_amount: "52374.00",
    capped_amount: "13093500.00",
    ...timestamps,
  },
] satisfies Prisma.country_annual_setupsCreateManyInput[]

export const provisionTypes = [
  { id: ids.provisionType.prima, name: "Prima", ...timestamps },
  { id: ids.provisionType.cesantias, name: "Cesantias", ...timestamps },
  { id: ids.provisionType.vacation, name: "Vacation", ...timestamps },
  { id: ids.provisionType.interesesDeCesantias, name: "Intereses de Cesantias", ...timestamps },
  { id: ids.provisionType.indemnization, name: "Indemnization", ...timestamps },
  { id: ids.provisionType.salary13th, name: "13th Salary", ...timestamps },
  { id: ids.provisionType.termination, name: "Termination", ...timestamps },
  { id: ids.provisionType.vacationBonus, name: "1/3 Vacation Bonus", ...timestamps },
  { id: ids.provisionType.indemnification, name: "Indemnification", ...timestamps },
] satisfies Prisma.provision_typesCreateManyInput[]

export const industryFields = [
  { id: ids.industryField.logistics, name: "Logistics", ...timestamps },
  { id: ids.industryField.software, name: "Software", ...timestamps },
] satisfies Prisma.industry_fieldsCreateManyInput[]

export const banks = [
  { id: ids.bank.bancolombia, country_id: ids.country.colombia, bank_name: "Bancolombia", ...timestamps },
  { id: ids.bank.itau, country_id: ids.country.brasil, bank_name: "Itau Unibanco", ...timestamps },
] satisfies Prisma.banksCreateManyInput[]
