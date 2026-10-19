export const ids = {
  user: { admin: 1n, salesLead: 2n },
  country: { colombia: 1n, brasil: 2n, canada: 3n },
  currency: { cop: 1n, brl: 2n, cad: 3n },
  province: { ontario: 1n, quebec: 2n },
  countryAnnualSetup: { colombia2026: 1n },
  provisionType: { prima: 1n, cesantias: 2n, vacation: 3n },
  industryField: { logistics: 1n, software: 2n },
  bank: { bancolombia: 1n, itau: 2n },
  intermedianoCompany: { colombia: 1n, canada: 2n },
  consultant: { andrea: 1n },
  partner: { mapleStaffing: 1n },
  company: { acmeLogistics: 1n, northwindSoftware: 2n },
  contact: { acmeMain: 1n, northwindMain: 2n },
  lead: { acmeExpansion: 1n },
  employee: { juan: 1n, camila: 2n, lucas: 3n },
  personalInformation: { juan: 1n },
  emergencyContact: { juanSpouse: 1n },
  dependent: { juanChild: 1n },
  document: { juanId: 1n },
  bankingDetail: { juanPayroll: 1n },
  socialSecurityInfo: { juan: 1n },
  employeeFile: { juanIdScan: 1n },
  quotation: { acmeColombia: 1n },
  payrollCost: { acmeColombia: 1n },
  paymentProvision: { acmePrima: 1n, acmeCesantias: 2n, acmeVacation: 3n },
  template: { colombiaOrdinary: 1n },
  contract: { juanAcme: 1n, camilaAcme: 2n, lucasNorthwind: 3n },
  supplementaryContractDetail: { juanAcme: 1n },
  investment: { bancolombiaCdt: 1n },
  staffTracker: { andreaNorthwind: 1n },
} as const

export const clusterNames = {
  brasil: "IntermedianoDoBrasilLtda",
  colombia: "IntermedianoColombiaSAS",
  canada: "IntermedianoCanada",
} as const

export const MOCK_PASSWORD_HASH = "$2y$12$mockmockmockmockmockmuMOCKHASHNOTFORLOGINxxxxxxxxxxxxx"

export const SEEDED_AT = new Date("2026-01-05T00:00:00Z")

export const timestamps = { created_at: SEEDED_AT, updated_at: SEEDED_AT } as const
