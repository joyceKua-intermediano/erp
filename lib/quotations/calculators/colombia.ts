import { line, operationalCostsLine, type QuotationBreakdown, type QuotationFigures } from "./types"

// Mirrors App\Support\ColombiaPayrollCostConsultantOverrides in the legacy app.
const NO_PENSION_FUND_CONSULTANT_IDS = ["9", "12"]
const NO_ICBF_SENA_CONSULTANT_IDS = ["17", "18", "21"]

function totalGrossIncome(f: QuotationFigures) {
  return f.grossSalary + f.bonus + f.homeAllowance + f.transportAllowance + f.medicalAllowance + f.internetAllowance
}

// Allowances are not part of the social security base.
function contributionBase(f: QuotationFigures) {
  return totalGrossIncome(f) - f.medicalAllowance - f.homeAllowance - f.transportAllowance - f.internetAllowance
}

// Integral salaries pay pension, health and ARL over 70% of the base; parafiscal contributions use the full base.
function payrollCosts(f: QuotationFigures, socialSecurityBase: number, parafiscalBase: number) {
  const zeroPension = f.consultantId !== null && NO_PENSION_FUND_CONSULTANT_IDS.includes(f.consultantId)
  const zeroIcbfSena = f.consultantId !== null && NO_ICBF_SENA_CONSULTANT_IDS.includes(f.consultantId)

  const pensionFund = zeroPension ? 0 : socialSecurityBase * 0.12
  const healthFund = socialSecurityBase * 0.085
  const icbfContribution = zeroIcbfSena ? 0 : parafiscalBase * 0.03
  const senaContribution = zeroIcbfSena ? 0 : parafiscalBase * 0.02
  const arlContribution = socialSecurityBase * 0.0244
  const compensationFundContribution = parafiscalBase * 0.04
  const operationalCosts = f.payrollCosts.operationalCosts

  const total =
    pensionFund +
    healthFund +
    icbfContribution +
    senaContribution +
    arlContribution +
    compensationFundContribution +
    operationalCosts

  return {
    total,
    lines: [
      line("Pension Fund", pensionFund),
      line("Health Fund", healthFund),
      line("ICBF Contribution", icbfContribution),
      line("Sena Contribution", senaContribution),
      line("ARL Contribution", arlContribution),
      line("Compensation Fund Contribution", compensationFundContribution),
      ...operationalCostsLine(operationalCosts),
      line("Total", total, true),
    ],
  }
}

function invoice(f: QuotationFigures, grossIncome: number, payrollCostsTotal: number, provisionsTotal: number) {
  const subTotalGrossPayroll = grossIncome + provisionsTotal + payrollCostsTotal
  const fee = f.isFixFee ? f.fee * f.exchangeRate : grossIncome * (f.fee / 100)
  const bankFee = f.bankFee * f.exchangeRate
  const subTotal = subTotalGrossPayroll + fee + bankFee
  const municipalTax = 0.01 * subTotal
  const servicesTaxes = (municipalTax + subTotal) * 0.19
  const totalInvoice = subTotal + municipalTax + servicesTaxes

  return {
    totalInvoice,
    lines: [
      line("Gross Salary", f.grossSalary),
      line("Total Gross Income", grossIncome, true),
      line("Payroll Costs", payrollCostsTotal),
      line("Provisions", provisionsTotal),
      line("Subtotal Gross Salary + Payroll Costs", subTotalGrossPayroll, true),
      line("Fee", fee),
      line("Bank Fee", bankFee),
      line("Subtotal", subTotal, true),
      line("Municipal tax - ICA 1%", municipalTax),
      line("Service taxes - VAT 19%", servicesTaxes),
      line("Total Invoice", totalInvoice, true),
    ],
  }
}

export function calculateColombiaOrdinary(f: QuotationFigures): QuotationBreakdown {
  const grossIncome = totalGrossIncome(f)
  const base = contributionBase(f)
  const costs = payrollCosts(f, base, base)

  const cesantias = 0.0833 * grossIncome
  const interestDeCesantias = cesantias * 0.12
  const prima = 0.0833 * grossIncome
  const vacation = 0.0417 * grossIncome
  const indemnization = 0.056 * grossIncome
  const provisionsTotal = cesantias + interestDeCesantias + prima + vacation + indemnization

  const summary = invoice(f, grossIncome, costs.total, provisionsTotal)

  return {
    variant: "Ordinary",
    totalInvoice: summary.totalInvoice,
    sections: [
      { title: "Summary", lines: summary.lines },
      { title: "Payroll Costs", lines: costs.lines },
      {
        title: "Provisions",
        lines: [
          line("Cesantias", cesantias),
          line("Interests over Cesantias", interestDeCesantias),
          line("Prima", prima),
          line("Vacation", vacation),
          line("Indemnization", indemnization),
          line("Total", provisionsTotal, true),
        ],
      },
    ],
  }
}

export function calculateColombiaIntegral(f: QuotationFigures): QuotationBreakdown {
  const grossIncome = totalGrossIncome(f)
  const base = contributionBase(f)
  const costs = payrollCosts(f, base * 0.7, base)

  const vacation = 0.0417 * (f.grossSalary + f.bonus)
  const indemnization = 0.056 * (f.grossSalary + f.bonus)
  const provisionsTotal = vacation + indemnization

  const summary = invoice(f, grossIncome, costs.total, provisionsTotal)

  return {
    variant: "Integral",
    totalInvoice: summary.totalInvoice,
    sections: [
      { title: "Summary", lines: summary.lines },
      { title: "Payroll Costs", lines: costs.lines },
      {
        title: "Provisions",
        lines: [
          line("Vacation", vacation),
          line("Indemnization", indemnization),
          line("Total", provisionsTotal, true),
        ],
      },
    ],
  }
}
