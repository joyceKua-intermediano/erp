import { line, operationalCostsLine, type QuotationBreakdown, type QuotationFigures } from "./types"

// Legacy charges this customer's percentage fee over gross income instead of the gross payroll.
const TCW_COMPANY_ID = "110"

export function calculateBrasil(f: QuotationFigures): QuotationBreakdown {
  const totalGrossIncome =
    f.grossSalary + f.bonus + f.homeAllowance + f.transportAllowance + f.medicalAllowance + f.internetAllowance

  const inss = totalGrossIncome * 0.278
  const fgts = totalGrossIncome * 0.08
  const fgtsFine = totalGrossIncome * 0.04
  const fgtsInss = totalGrossIncome * 0.071539
  const { medicalInsurance, meal, transportation, operationalCosts } = f.payrollCosts
  const payrollCostsTotal =
    inss + fgts + fgtsFine + fgtsInss + medicalInsurance + meal + transportation + operationalCosts

  const salary13th = 0.0833333 * totalGrossIncome
  const vacation = 0.0833333 * totalGrossIncome
  const vacationBonus = 0.0278 * totalGrossIncome
  const termination = 0.0833333 * totalGrossIncome
  const provisionsTotal = salary13th + vacation + vacationBonus + termination

  const subTotalGrossPayroll = totalGrossIncome + provisionsTotal + payrollCostsTotal
  const feeBase = f.companyId === TCW_COMPANY_ID ? totalGrossIncome : subTotalGrossPayroll
  const fee = f.isFixFee ? f.fee * f.exchangeRate : feeBase * (f.fee / 100)
  const bankFee = f.bankFee * f.exchangeRate
  const subTotal = subTotalGrossPayroll + fee + bankFee
  const servicesTaxes = (subTotalGrossPayroll + fee) * 0.0695
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
          line("Payroll Costs", payrollCostsTotal),
          line("Provisions", provisionsTotal),
          line("Gross Salary + Payroll Cost & Provisions", subTotalGrossPayroll, true),
          line("Fee", fee),
          line("Bank Fee", bankFee),
          line("Total Partial", subTotal, true),
          line("Services taxes", servicesTaxes),
          line("Gross Payroll, PR Costs, Fees & Taxes", totalInvoice, true),
        ],
      },
      {
        title: "Payroll Costs",
        lines: [
          line("INSS", inss),
          line("FGTS", fgts),
          line("FGTS Fine", fgtsFine),
          line("FGTS & INSS over Vacation and 13th Salary", fgtsInss),
          line("Medical Plan & Life Insurance", medicalInsurance),
          line("Meal Tickets", meal),
          line("Transportation Tickets", transportation),
          ...operationalCostsLine(operationalCosts),
          line("Total Payroll Costs", payrollCostsTotal, true),
        ],
      },
      {
        title: "Provisions",
        lines: [
          line("13th Salary", salary13th),
          line("Vacation", vacation),
          line("1/3 Vacation Bonus", vacationBonus),
          line("Termination", termination),
          line("Total Provisions", provisionsTotal, true),
        ],
      },
    ],
  }
}
