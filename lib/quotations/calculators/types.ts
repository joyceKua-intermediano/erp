export type QuotationFigures = {
  companyId: string
  consultantId: string | null
  provinceName: string | null
  isIntegral: boolean
  exchangeRate: number
  grossSalary: number
  isFixFee: boolean
  fee: number
  bankFee: number
  bonus: number
  homeAllowance: number
  transportAllowance: number
  medicalAllowance: number
  internetAllowance: number
  familyAllowance: number
  foodAllowance: number
  legalGratification: number
  payrollCosts: {
    medicalInsurance: number
    meal: number
    transportation: number
    operationalCosts: number
    ufMonth: number
    eps: number
  }
}

export type BreakdownLine = {
  label: string
  amount: number
  isTotal?: boolean
}

export type BreakdownSection = {
  title: string
  lines: BreakdownLine[]
}

export type QuotationBreakdown = {
  variant: string
  totalInvoice: number
  sections: BreakdownSection[]
}

export function line(label: string, amount: number, isTotal = false): BreakdownLine {
  return isTotal ? { label, amount, isTotal } : { label, amount }
}

// Legacy shows operational costs only when they were filled in.
export function operationalCostsLine(amount: number): BreakdownLine[] {
  return amount !== 0 ? [line("Operational Costs", amount)] : []
}
