import { line, type QuotationBreakdown, type QuotationFigures } from "./types"

export function calculatePeru(f: QuotationFigures): QuotationBreakdown {
  const totalGrossIncome =
    f.grossSalary +
    f.bonus +
    f.homeAllowance +
    f.transportAllowance +
    f.familyAllowance +
    f.medicalAllowance +
    f.legalGratification +
    f.internetAllowance

  // Essalud and Seguro Vida Ley don't apply to the medical allowance.
  const insuredIncome = totalGrossIncome - f.medicalAllowance
  const healthInsurance = insuredIncome * 0.09
  const healthInsuranceVacation = insuredIncome * 0.0075
  const eps = f.payrollCosts.eps
  const seguroVida = insuredIncome * 0.003252
  const payrollCostsTotal = healthInsurance + healthInsuranceVacation + eps + seguroVida

  const gratification = 0.1667 * totalGrossIncome
  const extraordinaryGratification = 0.015 * totalGrossIncome
  const vacation = 0.0973 * totalGrossIncome
  const cts = 0.0973 * totalGrossIncome
  const termination = 0.125 * totalGrossIncome
  const provisionsTotal = gratification + extraordinaryGratification + vacation + cts + termination

  const subTotalGrossPayroll = totalGrossIncome + provisionsTotal + payrollCostsTotal
  const fee = f.isFixFee ? f.fee * f.exchangeRate : subTotalGrossPayroll * (f.fee / 100)
  const bankFee = f.bankFee * f.exchangeRate
  const subTotal = subTotalGrossPayroll + fee + bankFee
  const servicesTaxes = subTotal * 0.18
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
          line("Service taxes - VAT 18%", servicesTaxes),
          line("Total Invoice", totalInvoice, true),
        ],
      },
      {
        title: "Payroll Costs",
        lines: [
          line("Health Insurance - Essalud", healthInsurance),
          line("Health Insurance - Essalud - Vacations", healthInsuranceVacation),
          line("EPS", eps),
          line("Seguro Vida Ley", seguroVida),
          line("Total", payrollCostsTotal, true),
        ],
      },
      {
        title: "Provisions",
        lines: [
          line("Gratification", gratification),
          line("Extraordinary Gratification", extraordinaryGratification),
          line("Vacations", vacation),
          line("CTS", cts),
          line("Termination - Indemnification", termination),
          line("Total", provisionsTotal, true),
        ],
      },
    ],
  }
}
