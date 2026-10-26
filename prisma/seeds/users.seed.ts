import type { Prisma } from "../../lib/generated/prisma/client"
import { ids, MOCK_PASSWORD_HASH, SEEDED_AT, timestamps } from "./ids"

export const users = [
  {
    id: ids.user.admin,
    name: "Sandbox Admin",
    email: "admin@intermediano.test",
    email_verified_at: SEEDED_AT,
    password: MOCK_PASSWORD_HASH,
    role_id: ids.role.admin,
    ...timestamps,
  },
  {
    id: ids.user.salesLead,
    name: "Valentina Rios",
    email: "valentina.rios@intermediano.test",
    email_verified_at: SEEDED_AT,
    password: MOCK_PASSWORD_HASH,
    role_id: ids.role.sales,
    ...timestamps,
  },
] satisfies Prisma.usersCreateManyInput[]
