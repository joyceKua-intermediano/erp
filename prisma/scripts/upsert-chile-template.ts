import "dotenv/config"
import { PrismaMariaDb } from "@prisma/adapter-mariadb"
import { PrismaClient } from "../../lib/generated/prisma/client"
import { templateDocumentSchema } from "../../lib/templates/blocks"
import { chileEmployee } from "../seeds/templates/chile-employee"

// Creates or refreshes the Chile employment contract template on the Intermediano Chile cluster, without touching
// any other data. Running it again overwrites edits made to this template in the editor. Dry run by default:
//   npx tsx prisma/scripts/upsert-chile-template.ts          (report only)
//   npx tsx prisma/scripts/upsert-chile-template.ts --apply  (write the template)

const TEMPLATE_NAME = "Chile - Employment Contract"

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
  const document = templateDocumentSchema.parse(chileEmployee)
  const prisma = createClient()

  try {
    const clusters = await prisma.intermediano_companies.findMany({
      where: { deleted_at: null, countries: { name: "Chile" } },
      select: { id: true, name: true, country_id: true },
    })
    if (clusters.length !== 1) {
      throw new Error(`Expected one active Chile cluster, found ${clusters.length}.`)
    }
    const [cluster] = clusters

    const existing = await prisma.templates.findFirst({
      where: { name: TEMPLATE_NAME, intermediano_company_id: cluster.id, deleted_at: null },
      select: { id: true },
    })

    const now = new Date()
    const data = {
      name: TEMPLATE_NAME,
      country_id: cluster.country_id,
      intermediano_company_id: cluster.id,
      contract_type: "employee",
      content_blocks: JSON.stringify(document),
      typst_source: null,
      updated_at: now,
    }

    if (!apply) {
      console.log(
        `Would ${existing ? `update template ${existing.id}` : "create a new template"} "${TEMPLATE_NAME}" ` +
          `on ${cluster.name} with ${document.blocks.length} blocks.`,
      )
      console.log("Dry run only. Re-run with --apply to write it.")
      return
    }

    const saved = existing
      ? await prisma.templates.update({ where: { id: existing.id }, data, select: { id: true } })
      : await prisma.templates.create({ data: { ...data, created_at: now }, select: { id: true } })
    console.log(`${existing ? "Updated" : "Created"} template ${saved.id} "${TEMPLATE_NAME}" on ${cluster.name}.`)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error: unknown) => {
  console.error("Chile template upsert failed.")
  console.error(error)
  process.exitCode = 1
})
