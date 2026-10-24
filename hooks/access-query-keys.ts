export const userQueryKeys = {
  all: ["users"] as const,
}

export const roleQueryKeys = {
  all: ["roles"] as const,
  detail: (roleId: string) => ["roles", roleId] as const,
}
