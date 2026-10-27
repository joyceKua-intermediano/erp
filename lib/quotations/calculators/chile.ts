import { line, type QuotationBreakdown, type QuotationFigures } from "./types"

// Legacy gives this customer reduced contribution rates and no notice period provision.
const REDUCED_RATES_COMPANY_ID = "229"

export function calculateChile(f: QuotationFigures): QuotationBreakdown {
  const totalGrossIncome =
    f.grossSalary +
    f.bonus +
    f.homeAllowance +
    f.transportAllowance +
    f.medicalAllowance +
    f.legalGratification +
    f.internetAllowance

  const isReducedRates = f.companyId === REDUCED_RATES_COMPANY_ID
  const employerContribution = totalGrossIncome * (isReducedRates ? 0.0193 : 0.0375)
  const unemploymentInsurance = totalGrossIncome * (isReducedRates ? 0.024 : 0.03)
  const disabilityInsurance = totalGrossIncome * (isReducedRates ? 0.0154 : 0.0199)
  const insurance = 0.53 * f.payrollCosts.ufMonth
  const operationalCosts = 1.2397 * f.payrollCosts.ufMonth
  const payrollCostsTotal =
    employerContribution + unemploymentInsurance + disabilityInsurance + insurance + operationalCosts

  const vacation = 0.058333 * totalGrossIncome
  const compensation = 0.0833 * totalGrossIncome
  const noticePeriod = (isReducedRates ? 0 : 0.0833) * totalGrossIncome
  const provisionsTotal = vacation + compensation + noticePeriod

  const subTotalGrossPayroll = totalGrossIncome + provisionsTotal + payrollCostsTotal
  const fee = f.isFixFee ? f.fee * f.exchangeRate : totalGrossIncome * (f.fee / 100)
  const bankFee = f.bankFee * f.exchangeRate
  const subTotal = subTotalGrossPayroll + fee + bankFee
  const servicesTaxes = subTotal * 0.19
  const totalInvoice = subTotal + servicesTaxes

  return {
    variant: "Ordinary",
    totalInvoice,
    sections: [
      {
        title: "Summary",
        lines: [
          line("Gross Salary", f.grossSalary),
          line("Total Gross Income", totalGrossIncome, true),
          line("Payroll Costs", payrollCostsTotal),
          line("Provisions", provisionsTotal),
          line("Subtotal Gross Salary + Payroll Costs", subTotalGrossPayroll, true),
          line("Fee", fee),
          line("Bank Fee", bankFee),
          line("Total Cost + WTAX", subTotal, true),
          line("VAT 19%", servicesTaxes),
          line("Total Invoice", totalInvoice, true),
        ],
      },
      {
        title: "Payroll Costs",
        // Legacy hides operational costs from the Chile SPA quotation but still adds them to the total.
        lines: [
          line("Employer contribution", employerContribution),
          line("Unemployment Insurance", unemploymentInsurance),
          line("Disability Insurance", disabilityInsurance),
          line("Insurance", insurance),
          line("Total", payrollCostsTotal, true),
        ],
      },
      {
        title: "Provisions",
        lines: [
          line("Vacations", vacation),
          line("Compensation for years of service", compensation),
          line("Notice period", noticePeriod),
          line("Total", provisionsTotal, true),
        ],
      },
    ],
  }
}
