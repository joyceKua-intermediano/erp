import type { Prisma } from "../../lib/generated/prisma/client"
import { ids, MOCK_PASSWORD_HASH, SEEDED_AT, timestamps } from "./ids"

export const users = [
  {
    id: ids.user.admin,
    name: "Sandbox Admin",
    email: "admin@intermediano.test",
    email_verified_at: SEEDED_AT,
    password: MOCK_PASSWORD_HASH,
    ...timestamps,
  },
  {
    id: ids.user.salesLead,
    name: "Valentina Rios",
    email: "valentina.rios@intermediano.test",
    email_verified_at: SEEDED_AT,
    password: MOCK_PASSWORD_HASH,
    ...timestamps,
  },
] satisfies Prisma.usersCreateManyInput[]
