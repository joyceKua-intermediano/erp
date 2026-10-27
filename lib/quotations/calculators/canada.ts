import { line, type BreakdownLine, type QuotationBreakdown, type QuotationFigures } from "./types"

function totalGrossIncome(f: QuotationFigures) {
  return (
    f.grossSalary +
    f.bonus +
    f.homeAllowance +
    f.transportAllowance +
    f.medicalAllowance +
    f.legalGratification +
    f.internetAllowance
  )
}

// Canada charges the fee over the whole gross payroll and adds the bank fee after the subtotal.
function canadaBreakdown(
  f: QuotationFigures,
  variant: string,
  payrollCostsTotal: number,
  payrollCostLines: BreakdownLine[],
  subTotalGrossPayrollLabel: string
): QuotationBreakdown {
  const grossIncome = totalGrossIncome(f)
  const vacation = 0.0416 * grossIncome
  const indemnification = 0.0625 * grossIncome
  const provisionsTotal = vacation + indemnification

  const subTotalGrossPayroll = grossIncome + provisionsTotal + payrollCostsTotal
  const fee = f.isFixFee ? f.fee * f.exchangeRate : subTotalGrossPayroll * (f.fee / 100)
  const bankFee = f.bankFee * f.exchangeRate
  const subTotal = subTotalGrossPayroll + fee
  const totalInvoice = subTotal + bankFee

  return {
    variant,
    totalInvoice,
    sections: [
      {
        title: "Summary",
        lines: [
          line("Gross Salary", f.grossSalary),
          line("Gross Monthly Salary", grossIncome, true),
          line("Payroll Costs", payrollCostsTotal),
          line("Provisions", provisionsTotal),
          line(subTotalGrossPayrollLabel, subTotalGrossPayroll, true),
          line("Fee", fee),
          line("Bank Fee", bankFee),
          line("Gross Payroll, PR Costs & Fees", subTotal, true),
          line("Gross Payroll, PR Costs, Fees & Taxes", totalInvoice, true),
        ],
      },
      { title: "Payroll Costs", lines: [...payrollCostLines, line("Total", payrollCostsTotal, true)] },
      {
        title: "Provisions",
        lines: [
          line("Vacations", vacation),
          line("Indemnification", indemnification),
          line("Total", provisionsTotal, true),
        ],
      },
    ],
  }
}

export function calculateCanada(f: QuotationFigures): QuotationBreakdown {
  const grossIncome = totalGrossIncome(f)
  // Legacy uses fixed 2025 CPP/CPP2 bands, so these don't depend on the salary.
  const canadaPension = (0.0595 * (71300 - 3500)) / 12
  const canadaPensionPlan2 = (0.04 * (81200 - 71300)) / 12
  const employmentInsurance = grossIncome * 0.023
  const employerHealthTax = grossIncome * 0.0195
  const workerCompensation = grossIncome * 0.0155
  const glInsurance = grossIncome * 0.01

  // Legacy lists EHT and GL insurance without adding them, and adds CPP2 without listing it.
  const payrollCostsTotal = canadaPension + employmentInsurance + canadaPensionPlan2 + workerCompensation

  return canadaBreakdown(
    f,
    "Canada",
    payrollCostsTotal,
    [
      line("Canada Pension Plan", canadaPension),
      line("Employment Insurance", employmentInsurance),
      line("Employer Health Tax or EHT", employerHealthTax),
      line("Workers Compensation", workerCompensation),
      line("GL Insurance", glInsurance),
    ],
    "Gross Payroll & PR Costs"
  )
}

export function calculateCanadaQuebec(f: QuotationFigures): QuotationBreakdown {
  const grossIncome = totalGrossIncome(f)
  const qpp = 0.05966 * grossIncome
  const employmentInsurance = grossIncome * 0.01649
  const qpip = grossIncome * 0.00602
  const hsf = grossIncome * 0.0165
  const cnt = grossIncome * 0.0006
  const cnesst = grossIncome * 0.0047
  const payrollCostsTotal = qpp + employmentInsurance + qpip + hsf + cnesst + cnt

  return canadaBreakdown(
    f,
    "Quebec",
    payrollCostsTotal,
    [
      line("QPP", qpp),
      line("Employment Insurance", employmentInsurance),
      line("QPIP", qpip),
      line("HSF", hsf),
      line("CNT", cnt),
      line("CNESST", cnesst),
    ],
    "Gross Payroll, PR Costs & Provisions"
  )
}
