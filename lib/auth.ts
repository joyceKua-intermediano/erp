import "server-only"

export async function requireAdminSession() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Admin authentication is not configured; refusing to serve admin data.")
  }
}
