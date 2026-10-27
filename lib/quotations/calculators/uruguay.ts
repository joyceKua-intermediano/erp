import { line, type QuotationBreakdown, type QuotationFigures } from "./types"

// Legacy adds a flat USD 50 per month, converted with the exchange rate.
const OPERATIONAL_COSTS_USD = 50

export function calculateUruguay(f: QuotationFigures): QuotationBreakdown {
  const totalGrossIncome =
    f.grossSalary +
    f.bonus +
    f.homeAllowance +
    f.transportAllowance +
    f.medicalAllowance +
    f.legalGratification +
    f.internetAllowance

  // Legacy adds this 2/3-of-income share, spread over 11.33 months, to social security and each provision.
  const vacationShare = (rate: number) => (totalGrossIncome / 3) * 2 * rate / 11.33

  const socialSecurity =
    totalGrossIncome * 0.18625 +
    0.18625 * totalGrossIncome * 0.055 +
    0.13625 * totalGrossIncome * 0.0833 +
    vacationShare(0.1943) * 0.18625
  const operationalCosts = OPERATIONAL_COSTS_USD * f.exchangeRate
  const payrollCostsTotal = socialSecurity + operationalCosts

  const salary13th = totalGrossIncome * 0.0833 + vacationShare(0.0833)
  const license = totalGrossIncome * 0.0555 + vacationShare(0.0555)
  const vacationSalary = totalGrossIncome * 0.0555 + vacationShare(0.0555)
  const dismissal = (totalGrossIncome + salary13th + license + vacationSalary) / 12
  const provisionsTotal = salary13th + license + vacationSalary + dismissal

  const subTotalGrossPayroll = totalGrossIncome + provisionsTotal + payrollCostsTotal
  const fee = f.isFixFee ? f.fee * f.exchangeRate : totalGrossIncome * (f.fee / 100)
  const bankFee = f.bankFee * f.exchangeRate
  // Legacy charges VAT before the bank fee is added.
  const subTotal = subTotalGrossPayroll + fee
  const servicesTaxes = subTotal * 0.22
  const totalInvoice = subTotal + bankFee + servicesTaxes

  return {
    variant: "Ordinary",
    totalInvoice,
    sections: [
      {
        title: "Summary",
        lines: [
          line("Gross Salary", f.grossSalary),
          line("Gross Monthly Salary", totalGrossIncome, true),
          line("Payroll Costs", payrollCostsTotal),
          line("Provisions", provisionsTotal),
          line("Subtotal Gross Salary + Payroll Costs", subTotalGrossPayroll, true),
          line("Fee", fee),
          line("VAT 22%", servicesTaxes),
          line("Bank Fee", bankFee),
          line("Total Invoice", totalInvoice, true),
        ],
      },
      {
        title: "Payroll Costs",
        lines: [
          line("Social Security", socialSecurity),
          line("Operational Costs", operationalCosts),
          line("Total", payrollCostsTotal, true),
        ],
      },
      {
        title: "Provisions",
        lines: [
          line("13th Salary", salary13th),
          line("License", license),
          line("Vacational Salary", vacationSalary),
          line("Dismissal", dismissal),
          line("Total", provisionsTotal, true),
        ],
      },
    ],
  }
}
