import { describe, expect, it } from "vitest"
import { clusterTemplatesFilter } from "@/lib/contracts"

describe("clusterTemplatesFilter", () => {
  it("offers the cluster's own templates plus shared ones for its country or no country", () => {
    expect(clusterTemplatesFilter(BigInt(7), BigInt(3))).toEqual({
      deleted_at: null,
      AND: [
        { OR: [{ contract_type: null }, { contract_type: "employee" }] },
        {
          OR: [
            { intermediano_company_id: BigInt(7) },
            { intermediano_company_id: null, OR: [{ country_id: null }, { country_id: BigInt(3) }] },
          ],
        },
      ],
    })
  })

  it("still offers country-less shared templates when the cluster has no country", () => {
    const filter = clusterTemplatesFilter(BigInt(7), null)
    expect(JSON.stringify(filter, (_key, value) => (typeof value === "bigint" ? value.toString() : value))).toContain(
      '{"intermediano_company_id":null,"OR":[{"country_id":null}]}'
    )
  })

  it("never matches another cluster's private templates", () => {
    const serialized = JSON.stringify(clusterTemplatesFilter(BigInt(7), BigInt(3)), (_key, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
    expect(serialized).not.toContain('"intermediano_company_id":{')
  })
})
