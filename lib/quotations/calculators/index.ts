import { QUEBEC, type QuotationClusterKind } from "@/lib/quotations"
import { calculateBrasil } from "./brasil"
import { calculateCanada, calculateCanadaQuebec } from "./canada"
import { calculateChile } from "./chile"
import { calculateColombiaIntegral, calculateColombiaOrdinary } from "./colombia"
import { calculateCostaRica } from "./costa-rica"
import { calculateEcuador } from "./ecuador"
import { calculateHongkong } from "./hongkong"
import { calculateMexico } from "./mexico"
import { calculatePeru } from "./peru"
import type { QuotationBreakdown, QuotationFigures } from "./types"
import { calculateUruguay } from "./uruguay"

export function calculateQuotation(kind: QuotationClusterKind, figures: QuotationFigures): QuotationBreakdown {
  switch (kind) {
    case "colombia":
      return figures.isIntegral ? calculateColombiaIntegral(figures) : calculateColombiaOrdinary(figures)
    case "canada":
      return figures.provinceName === QUEBEC ? calculateCanadaQuebec(figures) : calculateCanada(figures)
    case "brasil":
      return calculateBrasil(figures)
    case "chile":
      return calculateChile(figures)
    case "ecuador":
      return calculateEcuador(figures)
    case "mexico":
      return calculateMexico(figures)
    case "peru":
      return calculatePeru(figures)
    case "uruguay":
      return calculateUruguay(figures)
    case "costa-rica":
      return calculateCostaRica(figures)
    case "hongkong":
      return calculateHongkong(figures)
  }
}
