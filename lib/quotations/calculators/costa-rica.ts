import { line, type QuotationBreakdown, type QuotationFigures } from "./types"

export function calculateCostaRica(f: QuotationFigures): QuotationBreakdown {
  const totalGrossIncome =
    f.grossSalary + f.bonus + f.homeAllowance + f.transportAllowance + f.medicalAllowance + f.internetAllowance

  // Employer charges don't apply to the medical allowance; medical insurance is stored as a percent.
  const insuredIncome = totalGrossIncome - f.medicalAllowance
  const employerTaxes = insuredIncome * 0.2667
  const insPolicy = insuredIncome * 0.0196
  const medicalInsurance = (insuredIncome * f.payrollCosts.medicalInsurance) / 100
  const payrollCostsTotal = employerTaxes + insPolicy + medicalInsurance

  const unemployment = 0.0533 * totalGrossIncome
  const forewarning = 0.0833 * totalGrossIncome
  const bonus = 0.0833 * totalGrossIncome
  const vacation = 0.0417 * totalGrossIncome
  const provisionsTotal = unemployment + forewarning + bonus + vacation

  const subTotalGrossPayroll = totalGrossIncome + provisionsTotal + payrollCostsTotal
  const fee = f.isFixFee ? f.fee * f.exchangeRate : subTotalGrossPayroll * (f.fee / 100)
  const bankFee = f.bankFee * f.exchangeRate
  const subTotal = subTotalGrossPayroll + fee + bankFee
  const servicesTaxes = subTotal * 0.13
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
          line("Subtotal", subTotal, true),
          line("Service taxes - VAT 13%", servicesTaxes),
          line("Total Invoice", totalInvoice, true),
        ],
      },
      {
        title: "Payroll Costs",
        lines: [
          line("Employer taxes", employerTaxes),
          line("INS Policy", insPolicy),
          line("Medical Insurance", medicalInsurance),
          line("Total", payrollCostsTotal, true),
        ],
      },
      {
        title: "Provisions",
        lines: [
          line("Unemployment", unemployment),
          line("Forewarning", forewarning),
          line("Bonus", bonus),
          line("Vacations", vacation),
          line("Total", provisionsTotal, true),
        ],
      },
    ],
  }
}
