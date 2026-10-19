import "server-only"
import { z } from "zod"

const envSchema = z.object({
  DATABASE_URL: z.url({
    protocol: /^(mysql|mariadb)$/,
    error: "must be a mysql:// or mariadb:// connection URL",
  }),
  NODE_ENV: z.enum(["development", "test", "production"], {
    error: 'must be "development", "test" or "production"',
  }),
})

export type Env = Readonly<z.infer<typeof envSchema>>

function describeIssues(issues: z.core.$ZodIssue[]) {
  return issues.map((issue) => {
    const key = issue.path.map(String).join(".") || "(environment)"
    const reason = process.env[key] === undefined ? "is missing" : issue.message
    return `  ✗ ${key} ${reason}`
  })
}

function loadEnv(): Env {
  const result = envSchema.safeParse(process.env)

  if (!result.success) {
    const banner = "=".repeat(64)
    console.error(
      [
        "",
        banner,
        "  INVALID ENVIRONMENT CONFIGURATION",
        banner,
        ...describeIssues(result.error.issues),
        "",
        "  Refusing to start. Set the variables above (see .env) and restart.",
        banner,
        "",
      ].join("\n"),
    )
    process.exit(1)
  }

  return Object.freeze(result.data)
}

export const env: Env = loadEnv()
