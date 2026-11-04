import "dotenv/config"
import { PrismaMariaDb } from "@prisma/adapter-mariadb"
import { PrismaClient } from "../../lib/generated/prisma/client"
import { permissionNames, type PermissionName } from "../../lib/permissions"
import { legacyRoles, type LegacyCluster, type RoleSeed } from "../seeds/legacy-roles"

// Brings the permissions catalog and the legacy ERP roles (prisma/seeds/legacy-roles.ts) into this database.
// Roles are matched by name, so existing roles keep their id and users. Each listed role's catalog permissions and
// clusters are replaced with the legacy set; other roles, user assignments and old `*.view` / `*.manage` grants are
// left alone. Dry run by default:
//   npx tsx prisma/scripts/seed-roles.ts          (report only)
//   npx tsx prisma/scripts/seed-roles.ts --apply  (write the roles)

const TRANSACTION_TIMEOUT_MS = 60_000
const catalog = new Set<string>(permissionNames)

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

type ClusterRow = { id: bigint; name: string; country: string }

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "")
}

function resolveCluster(cluster: LegacyCluster, rows: ClusterRow[]): ClusterRow {
  const inCountry = rows.filter((row) => normalize(row.country) === normalize(cluster.country))
  const matches = cluster.name ? inCountry.filter((row) => normalize(row.name) === normalize(cluster.name!)) : inCountry
  if (matches.length !== 1) {
    throw new Error(
      `Expected one active cluster for ${cluster.name ?? cluster.country}, found ${matches.length}.`,
    )
  }
  return matches[0]
}

type RolePlan = {
  seed: RoleSeed
  existing: { id: bigint; name: string; users: number } | null
  add: PermissionName[]
  remove: string[]
  clusters: ClusterRow[]
  clustersChanged: boolean
}

async function main() {
  const apply = process.argv.includes("--apply")
  const prisma = createClient()

  try {
    const clusterRows: ClusterRow[] = (
      await prisma.intermediano_companies.findMany({
        where: { deleted_at: null },
        select: { id: true, name: true, countries: { select: { name: true } } },
      })
    ).map((row) => ({ id: row.id, name: row.name, country: row.countries.name }))

    const existingPermissions = await prisma.permissions.findMany({
      where: { name: { in: [...permissionNames] } },
      select: { name: true },
    })
    const missingPermissions = permissionNames.filter(
      (name) => !existingPermissions.some((row) => row.name === name),
    )

    const plans: RolePlan[] = []
    for (const seed of legacyRoles) {
      const clusters = seed.allClusters ? [] : seed.clusters.map((cluster) => resolveCluster(cluster, clusterRows))
      const existing = await prisma.roles.findUnique({
        where: { name: seed.name },
        select: {
          id: true,
          name: true,
          all_clusters: true,
          _count: { select: { users: true } },
          role_permissions: { select: { permissions: { select: { name: true } } } },
          role_clusters: { select: { intermediano_company_id: true } },
        },
      })

      const current = new Set(
        existing?.role_permissions.map((link) => link.permissions.name).filter((name) => catalog.has(name)) ?? [],
      )
      const target = new Set<string>(seed.permissions)
      const currentClusters = new Set(existing?.role_clusters.map((link) => link.intermediano_company_id) ?? [])

      plans.push({
        seed,
        existing: existing ? { id: existing.id, name: existing.name, users: existing._count.users } : null,
        add: seed.permissions.filter((name) => !current.has(name)),
        remove: [...current].filter((name) => !target.has(name)),
        clusters,
        clustersChanged:
          !existing ||
          existing.all_clusters !== seed.allClusters ||
          currentClusters.size !== clusters.length ||
          clusters.some((cluster) => !currentClusters.has(cluster.id)),
      })
    }

    console.log(`Permissions: ${permissionNames.length} in catalog, ${missingPermissions.length} missing in database.`)
    for (const plan of plans) {
      const { seed, existing } = plan
      const action = !existing
        ? "create"
        : existing.name !== seed.name
          ? `update (rename "${existing.name}", ${existing.users} users)`
          : `update (${existing.users} users)`
      const scope = seed.allClusters ? "all clusters" : plan.clusters.map((cluster) => cluster.name).join(", ") || "no clusters"
      console.log(`\n${seed.name}: ${action}`)
      console.log(`  permissions  ${seed.permissions.length} (+${plan.add.length} / -${plan.remove.length})`)
      if (plan.add.length) console.log(`    add     ${plan.add.join(", ")}`)
      if (plan.remove.length) console.log(`    remove  ${plan.remove.join(", ")}`)
      console.log(`  clusters     ${scope}${plan.clustersChanged ? "" : " (unchanged)"}`)
    }

    if (!apply) {
      console.log("\nDry run only. Re-run with --apply to write it.")
      return
    }

    await prisma.$transaction(
      async (tx) => {
        const now = new Date()
        for (const name of missingPermissions) {
          await tx.permissions.upsert({
            where: { name },
            create: { name, description: null, created_at: now, updated_at: now },
            update: {},
          })
        }
        const permissionIds = new Map(
          (
            await tx.permissions.findMany({ where: { name: { in: [...permissionNames] } }, select: { id: true, name: true } })
          ).map((row) => [row.name, row.id]),
        )
        const idOf = (name: string) => {
          const id = permissionIds.get(name)
          if (id === undefined) throw new Error(`Permission "${name}" is missing.`)
          return id
        }

        for (const plan of plans) {
          const { seed } = plan
          const role = plan.existing
            ? await tx.roles.update({
              where: { id: plan.existing.id },
              data: { name: seed.name, all_clusters: seed.allClusters, updated_at: now },
              select: { id: true },
            })
            : await tx.roles.create({
              data: { name: seed.name, description: null, all_clusters: seed.allClusters, created_at: now, updated_at: now },
              select: { id: true },
            })

          if (plan.remove.length) {
            await tx.role_permissions.deleteMany({
              where: { role_id: role.id, permission_id: { in: plan.remove.map(idOf) } },
            })
          }
          if (plan.add.length) {
            await tx.role_permissions.createMany({
              data: plan.add.map((name) => ({ role_id: role.id, permission_id: idOf(name) })),
              skipDuplicates: true,
            })
          }
          if (plan.clustersChanged) {
            await tx.role_clusters.deleteMany({ where: { role_id: role.id } })
            if (plan.clusters.length) {
              await tx.role_clusters.createMany({
                data: plan.clusters.map((cluster) => ({ role_id: role.id, intermediano_company_id: cluster.id })),
              })
            }
          }
        }
      },
      { timeout: TRANSACTION_TIMEOUT_MS },
    )

    console.log(`\nApplied ${plans.length} roles.`)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error: unknown) => {
  console.error("Role seed failed. Nothing was written.")
  console.error(error)
  process.exitCode = 1
})
