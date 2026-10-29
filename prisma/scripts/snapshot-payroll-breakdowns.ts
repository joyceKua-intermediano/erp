import "dotenv/config"
import { PrismaMariaDb } from "@prisma/adapter-mariadb"
import { PrismaClient } from "../../lib/generated/prisma/client"
import { toQuotationClusterKind } from "../../lib/quotations"
import { quotationSelect } from "../../lib/quotations/breakdown"
import { snapshotForRow } from "../../lib/payroll/snapshot"

// Saves today's calculated breakdown on payroll runs that don't have one yet, freezing their figures.
// Check the figures against legacy first. Dry run by default:
//   npx tsx prisma/scripts/snapshot-payroll-breakdowns.ts          (report only)
//   npx tsx prisma/scripts/snapshot-payroll-breakdowns.ts --apply  (write snapshots)

const BATCH_SIZE = 200

function createClient() {
  const rawUrl = process.env.DATABASE_URL
  if (!rawUrl) throw new Error("DATABASE_URL is not set.")
  const url = new URL(rawUrl)
  return new PrismaClient({
    adapter: new PrismaMariaDb({
      host: url.hostname,
      port: url.port ? Number(url.port) : 3306,
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database: decodeURIComponent(url.pathname.replace(/^\//, "")),
    }),
  })
}

async function main() {
  const apply = process.argv.includes("--apply")
  const prisma = createClient()

  try {
    const clusters = await prisma.intermediano_companies.findMany({
      select: { id: true, countries: { select: { name: true } } },
    })
    const kindByCluster = new Map(clusters.map((cluster) => [cluster.id, toQuotationClusterKind(cluster.countries.name)]))

    let lastId = BigInt(0)
    let snapshotted = 0
    let skipped = 0
    for (;;) {
      const rows = await prisma.quotations.findMany({
        where: { id: { gt: lastId }, is_payroll: true, is_partner: false, deleted_at: null, breakdown_snapshot: null },
        orderBy: { id: "asc" },
        take: BATCH_SIZE,
        select: { ...quotationSelect, intermediano_company_id: true },
      })
      if (rows.length === 0) break
      lastId = rows[rows.length - 1].id

      for (const row of rows) {
        const snapshot = snapshotForRow(row, kindByCluster.get(row.intermediano_company_id) ?? null)
        if (!snapshot) {
          skipped++
          continue
        }
        snapshotted++
        if (apply) await prisma.quotations.update({ where: { id: row.id }, data: { breakdown_snapshot: snapshot } })
      }
    }

    const verb = apply ? "Snapshotted" : "Would snapshot"
    console.log(`${verb} ${snapshotted} payroll runs; ${skipped} can't be priced and stay calculated live.`)
    if (!apply) console.log("Dry run only. Re-run with --apply to write the snapshots.")
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error: unknown) => {
  console.error("Snapshot backfill failed.")
  console.error(error)
  process.exitCode = 1
})
