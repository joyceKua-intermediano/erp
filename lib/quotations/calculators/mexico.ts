import { line, type QuotationBreakdown, type QuotationFigures } from "./types"

// Legacy charges PTU only on partner quotations, which this module doesn't list.
const PTU_RATE = 0

export function calculateMexico(f: QuotationFigures): QuotationBreakdown {
  const totalGrossIncome = f.grossSalary + f.bonus + f.transportAllowance + f.foodAllowance

  const payrollTax = totalGrossIncome * 0.04
  const workRisk = totalGrossIncome * 0.0758875
  const fixContribution = totalGrossIncome * 0.0252
  const cashBenefits = totalGrossIncome * 0.007
  const disabilityInsurance = totalGrossIncome * 0.0175
  const kindergarten = totalGrossIncome * 0.01
  const pensionBeneficiaries = totalGrossIncome * 0.0105
  const retirement = totalGrossIncome * 0.02
  const oldAge = totalGrossIncome * 0.0617915
  const infonavit = totalGrossIncome * 0.05
  const payrollCostsTotal =
    payrollTax +
    workRisk +
    fixContribution +
    cashBenefits +
    disabilityInsurance +
    kindergarten +
    pensionBeneficiaries +
    retirement +
    oldAge +
    infonavit

  const salary13th = 0.0417 * totalGrossIncome
  const vacationPrime = 0.008333333 * totalGrossIncome
  const vacation = 0.0333333 * totalGrossIncome
  const indemnization90 = 0.08333 * totalGrossIncome
  const indemnization20 = 0.0561 * totalGrossIncome
  const ptu = PTU_RATE * totalGrossIncome
  const provisionsTotal = salary13th + vacationPrime + vacation + indemnization90 + indemnization20 + ptu

  // Home, internet and medical allowances are exempt from income tax, so they skip payroll costs and provisions.
  const otherCost = f.homeAllowance + f.internetAllowance + f.medicalAllowance
  const subTotalGrossPayroll = totalGrossIncome + provisionsTotal + payrollCostsTotal + otherCost
  const fee = f.isFixFee ? f.fee * f.exchangeRate : subTotalGrossPayroll * (f.fee / 100)
  const bankFee = f.bankFee * f.exchangeRate
  const subTotal = subTotalGrossPayroll + fee + bankFee
  const servicesTaxes = subTotal * 0.16
  const totalInvoice = subTotal + servicesTaxes

  return {
    variant: "Ordinary",
    totalInvoice,
    sections: [
      {
        title: "Summary",
        lines: [
          line("Gross Salary", f.grossSalary),
          line("Total Gross Monthly Salary", totalGrossIncome, true),
          line("Other cost (exempt of Income tax)", otherCost),
          line("Payroll Costs", payrollCostsTotal),
          line("Provisions", provisionsTotal),
          line("Subtotal Gross Salary + Payroll Costs", subTotalGrossPayroll, true),
          line("Fee", fee),
          line("Bank Fee", bankFee),
          line("Subtotal", subTotal, true),
          line("VAT 16%", servicesTaxes),
          line("Total Invoice", totalInvoice, true),
        ],
      },
      {
        title: "Payroll Costs",
        lines: [
          line("Payroll Tax 4%", payrollTax),
          line("Work Risk", workRisk),
          line("Fix Contribution", fixContribution),
          line("Cash Benefits", cashBenefits),
          line("Disability and Life Insurance", disabilityInsurance),
          line("Kindergarten", kindergarten),
          line("Pensions and Beneficiaries", pensionBeneficiaries),
          line("Retirement", retirement),
          line("Old Age Unemployment", oldAge),
          line("Infonavit", infonavit),
          line("Total Payroll Costs", payrollCostsTotal, true),
        ],
      },
      {
        title: "Provisions",
        lines: [
          line("13th Salary", salary13th),
          line("Vacation Prime", vacationPrime),
          line("Vacation", vacation),
          line("Indemnization 90 days", indemnization90),
          line("Indemnization 20 days", indemnization20),
          line("PTU", ptu),
          line("Total Provisions", provisionsTotal, true),
        ],
      },
    ],
  }
}
