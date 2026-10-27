import { line, type QuotationBreakdown, type QuotationFigures } from "./types"

// Employer MPF is 5% of income, capped at 1,500 once income passes 30,000.
const MPF_MAX_RELEVANT_INCOME = 30000
const MPF_CAP = 1500
// Percentage fees never go below 450 in the billing currency.
const MINIMUM_FEE = 450

export function calculateHongkong(f: QuotationFigures): QuotationBreakdown {
  const totalGrossIncome =
    f.grossSalary + f.bonus + f.homeAllowance + f.transportAllowance + f.medicalAllowance + f.internetAllowance

  const mpf = totalGrossIncome > MPF_MAX_RELEVANT_INCOME ? MPF_CAP : totalGrossIncome * 0.05
  const employerCompensationInsurance = 0
  const payrollCostsTotal = mpf + employerCompensationInsurance

  const leave = totalGrossIncome / 160
  const provisionsTotal = leave

  // Legacy shows the leave provision but leaves it out of the invoice, and has no service taxes.
  const bankFee = f.bankFee * f.exchangeRate
  const subTotalGrossPayroll = totalGrossIncome + payrollCostsTotal + bankFee
  const fee = f.isFixFee
    ? f.fee * f.exchangeRate
    : Math.max(subTotalGrossPayroll * (f.fee / 100), MINIMUM_FEE * f.exchangeRate)
  const totalInvoice = subTotalGrossPayroll + fee

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
          line("Bank Fee", bankFee),
          line("Total Before Service Fee", subTotalGrossPayroll, true),
          line("Fee", fee),
          line("Total Costs", totalInvoice, true),
        ],
      },
      {
        title: "Payroll Costs",
        lines: [
          line("Employer MPF", mpf),
          line("Employer Compensation Insurance", employerCompensationInsurance),
          line("Total Payroll Costs", payrollCostsTotal, true),
        ],
      },
      {
        title: "Provisions",
        lines: [line("Leave Encashment", leave), line("Total Provisions", provisionsTotal, true)],
      },
    ],
  }
}
