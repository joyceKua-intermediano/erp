import { line, type QuotationBreakdown, type QuotationFigures } from "./types"

// Legacy fixes the 14th bonus on a 470 base salary instead of the quoted income.
const BONUS_14TH_BASE = 470

export function calculateEcuador(f: QuotationFigures): QuotationBreakdown {
  const totalGrossIncome =
    f.grossSalary + f.bonus + f.homeAllowance + f.transportAllowance + f.medicalAllowance + f.internetAllowance

  const iess = totalGrossIncome * 0.1115
  const secap = totalGrossIncome * 0.005
  const iece = totalGrossIncome * 0.005
  const payrollCostsTotal = iess + secap + iece

  const vacation = 0.0417 * totalGrossIncome
  const reserveFund = 0.08333 * totalGrossIncome
  const bonus13th = 0.08333 * totalGrossIncome
  const bonus14th = 0.08333 * BONUS_14TH_BASE
  const bonification = 0.0208 * totalGrossIncome
  const compensation = 0.25 * totalGrossIncome
  const provisionsTotal = vacation + reserveFund + bonus13th + bonus14th + bonification + compensation

  const subTotalGrossPayroll = totalGrossIncome + provisionsTotal + payrollCostsTotal
  const fee = f.isFixFee ? f.fee * f.exchangeRate : subTotalGrossPayroll * (f.fee / 100)
  // Legacy adds the bank fee as entered, without the exchange rate, and charges no service taxes.
  const bankFee = f.bankFee
  const totalInvoice = subTotalGrossPayroll + fee + bankFee

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
          line("Total Invoice", totalInvoice, true),
        ],
      },
      {
        title: "Payroll Costs",
        // Legacy adds IECE to the total without listing it.
        lines: [
          line("I.E.S.S. Instituto Ecuatoriano de Seguridad Social", iess),
          line("SECAP Ecuadorian Training Service", secap),
          line("Total", payrollCostsTotal, true),
        ],
      },
      {
        title: "Provisions",
        lines: [
          line("Vacation", vacation),
          line("Reserve Fund", reserveFund),
          line("Bonus 13th", bonus13th),
          line("Bonus 14th", bonus14th),
          line("25% Bonification", bonification),
          line("Compensation", compensation),
          line("Total", provisionsTotal, true),
        ],
      },
    ],
  }
}
