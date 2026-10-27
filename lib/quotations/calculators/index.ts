import { QUEBEC, type QuotationClusterKind } from "@/lib/quotations"
import { calculateBrasil } from "./brasil"
import { calculateCanada, calculateCanadaQuebec } from "./canada"
import { calculateColombiaIntegral, calculateColombiaOrdinary } from "./colombia"
import type { QuotationBreakdown, QuotationFigures } from "./types"

export function calculateQuotation(kind: QuotationClusterKind, figures: QuotationFigures): QuotationBreakdown {
  switch (kind) {
    case "colombia":
      return figures.isIntegral ? calculateColombiaIntegral(figures) : calculateColombiaOrdinary(figures)
    case "canada":
      return figures.provinceName === QUEBEC ? calculateCanadaQuebec(figures) : calculateCanada(figures)
    case "brasil":
      return calculateBrasil(figures)
  }
}
