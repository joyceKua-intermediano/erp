export type ContractLanguage = "es" | "pt" | "en"

export type ClusterProfile = {
  language: ContractLanguage
  locale: string
  currencyCode: string
  currencySymbol: string
  // Plural currency noun used when spelling out amounts, in the contract language and in English.
  currencyWords: string
  currencyWordsEn: string
  taxIdLabel: string
  employeeIdLabel: string
}

const profiles: Record<string, ClusterProfile> = {
  colombia: {
    language: "es",
    locale: "es-CO",
    currencyCode: "COP",
    currencySymbol: "$",
    currencyWords: "pesos colombianos",
    currencyWordsEn: "Colombian pesos",
    taxIdLabel: "NIT",
    employeeIdLabel: "C.C.",
  },
  brasil: {
    language: "pt",
    locale: "pt-BR",
    currencyCode: "BRL",
    currencySymbol: "R$",
    currencyWords: "reais",
    currencyWordsEn: "Brazilian reais",
    taxIdLabel: "CNPJ",
    employeeIdLabel: "CPF",
  },
  mexico: {
    language: "es",
    locale: "es-MX",
    currencyCode: "MXN",
    currencySymbol: "$",
    currencyWords: "pesos mexicanos",
    currencyWordsEn: "Mexican pesos",
    taxIdLabel: "RFC",
    employeeIdLabel: "RFC",
  },
  chile: {
    language: "es",
    locale: "es-CL",
    currencyCode: "CLP",
    currencySymbol: "$",
    currencyWords: "pesos chilenos",
    currencyWordsEn: "Chilean pesos",
    taxIdLabel: "RUT",
    employeeIdLabel: "RUT",
  },
  peru: {
    language: "es",
    locale: "es-PE",
    currencyCode: "PEN",
    currencySymbol: "S/",
    currencyWords: "soles",
    currencyWordsEn: "Peruvian soles",
    taxIdLabel: "RUC",
    employeeIdLabel: "DNI",
  },
  ecuador: {
    language: "es",
    locale: "es-EC",
    currencyCode: "USD",
    currencySymbol: "$",
    currencyWords: "dólares de los Estados Unidos de América",
    currencyWordsEn: "US dollars",
    taxIdLabel: "R.U.C.",
    employeeIdLabel: "C.I.",
  },
  "costa rica": {
    language: "es",
    locale: "es-CR",
    currencyCode: "CRC",
    currencySymbol: "₡",
    currencyWords: "colones",
    currencyWordsEn: "Costa Rican colones",
    taxIdLabel: "C.J.",
    employeeIdLabel: "C.I.",
  },
  uruguay: {
    language: "es",
    locale: "es-UY",
    currencyCode: "UYU",
    currencySymbol: "$",
    currencyWords: "pesos uruguayos",
    currencyWordsEn: "Uruguayan pesos",
    taxIdLabel: "RUT",
    employeeIdLabel: "C.I.",
  },
  canada: {
    language: "en",
    locale: "en-CA",
    currencyCode: "CAD",
    currencySymbol: "$",
    currencyWords: "Canadian dollars",
    currencyWordsEn: "Canadian dollars",
    taxIdLabel: "BN",
    employeeIdLabel: "SIN",
  },
  "hong kong": {
    language: "en",
    locale: "en-HK",
    currencyCode: "HKD",
    currencySymbol: "HK$",
    currencyWords: "Hong Kong dollars",
    currencyWordsEn: "Hong Kong dollars",
    taxIdLabel: "BR No.",
    employeeIdLabel: "HKID",
  },
}

const aliases: Record<string, string> = {
  brazil: "brasil",
  méxico: "mexico",
  perú: "peru",
  hongkong: "hong kong",
}

const fallbackProfile: ClusterProfile = {
  language: "en",
  locale: "en-US",
  currencyCode: "USD",
  currencySymbol: "$",
  currencyWords: "US dollars",
  currencyWordsEn: "US dollars",
  taxIdLabel: "Tax ID",
  employeeIdLabel: "ID",
}

// Profiles are keyed by the cluster's country, so both Brazilian entities share one.
export function getClusterProfile(countryName: string | null): ClusterProfile {
  const key = countryName?.trim().toLowerCase() ?? ""
  return profiles[aliases[key] ?? key] ?? fallbackProfile
}

export const signerTitles: Record<ContractLanguage, { employer: string; employee: string; customer: string }> = {
  es: { employer: "EL EMPLEADOR", employee: "EL TRABAJADOR", customer: "EL CLIENTE" },
  pt: { employer: "EMPREGADOR", employee: "EMPREGADO", customer: "CLIENTE" },
  en: { employer: "EMPLOYER", employee: "EMPLOYEE", customer: "CLIENT" },
}
