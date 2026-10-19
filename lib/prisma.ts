import { env } from "./env"
import "server-only"
import { PrismaMariaDb } from "@prisma/adapter-mariadb"
import { PrismaClient } from "./generated/prisma/client"

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

function createPrismaClient() {
  const url = new URL(env.DATABASE_URL)

  return new PrismaClient({
    adapter: new PrismaMariaDb({
      host: url.hostname,
      port: url.port ? Number(url.port) : 3306,
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database: decodeURIComponent(url.pathname.replace(/^\//, "")),
    }),
    log: env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
}
