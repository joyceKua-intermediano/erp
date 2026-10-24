"use server";

import { randomBytes } from "node:crypto";
import type { ActionResult } from "@/lib/action-result";
import { requirePermission } from "@/lib/auth";
import { Prisma } from "@/lib/generated/prisma/client";
import { MANAGE_USERS_PERMISSION } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { userFormSchema, userIdSchema, type AdminUser, type UserFormInput } from "@/lib/users";

const userSelect = {
  id: true,
  name: true,
  email: true,
  avatar_url: true,
  role_id: true,
  created_at: true,
  roles: { select: { name: true } },
} satisfies Prisma.usersSelect;

type UserRow = Prisma.usersGetPayload<{ select: typeof userSelect }>;

function toAdminUser(user: UserRow): AdminUser {
  return {
    id: user.id.toString(),
    name: user.name,
    email: user.email,
    avatarUrl: user.avatar_url,
    roleId: user.role_id?.toString() ?? null,
    roleName: user.roles?.name ?? null,
    createdAt: user.created_at?.toISOString() ?? null,
  };
}

// Sign-in is SSO only, so the legacy NOT NULL password column gets a value no password can ever match.
function unusablePassword() {
  return `sso-only:${randomBytes(24).toString("hex")}`;
}

function isUniqueEmailError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

async function roleGrantsUserManagement(roleId: bigint) {
  const link = await prisma.role_permissions.findFirst({
    where: { role_id: roleId, permissions: { name: MANAGE_USERS_PERMISSION } },
    select: { role_id: true },
  });
  return link !== null;
}

export async function getUsers(): Promise<AdminUser[]> {
  await requirePermission("users.view");

  try {
    const users = await prisma.users.findMany({
      orderBy: { name: "asc" },
      select: userSelect,
    });
    return users.map(toAdminUser);
  } catch (error) {
    console.error("getUsers failed", { error });
    throw new Error("Could not load users.");
  }
}

export async function createUser(input: UserFormInput): Promise<ActionResult<AdminUser>> {
  try {
    await requirePermission(MANAGE_USERS_PERMISSION);
  } catch {
    return { ok: false, error: "You don't have permission to add users." };
  }

  const parsed = userFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  try {
    const roleId = BigInt(parsed.data.roleId);
    const role = await prisma.roles.findUnique({ where: { id: roleId }, select: { id: true } });
    if (!role) return { ok: false, error: "That role no longer exists." };

    const now = new Date();
    const user = await prisma.users.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        password: unusablePassword(),
        role_id: roleId,
        created_at: now,
        updated_at: now,
      },
      select: userSelect,
    });
    return { ok: true, data: toAdminUser(user) };
  } catch (error) {
    if (isUniqueEmailError(error)) {
      return { ok: false, error: "Someone with this email already has an account." };
    }
    console.error("createUser failed", { error });
    return { ok: false, error: "Could not add this user. Try again." };
  }
}

export async function updateUser(userId: string, input: UserFormInput): Promise<ActionResult<AdminUser>> {
  let sessionUserId: string;
  try {
    const session = await requirePermission(MANAGE_USERS_PERMISSION);
    sessionUserId = session.user.id;
  } catch {
    return { ok: false, error: "You don't have permission to edit users." };
  }

  const parsedId = userIdSchema.safeParse(userId);
  const parsed = userFormSchema.safeParse(input);
  if (!parsedId.success) return { ok: false, error: "Unknown user." };
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  try {
    const roleId = BigInt(parsed.data.roleId);
    const role = await prisma.roles.findUnique({ where: { id: roleId }, select: { id: true } });
    if (!role) return { ok: false, error: "That role no longer exists." };

    if (parsedId.data === sessionUserId && !(await roleGrantsUserManagement(roleId))) {
      return { ok: false, error: "You can't give yourself a role without access to Users & roles." };
    }

    const user = await prisma.users.update({
      where: { id: BigInt(parsedId.data) },
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        role_id: roleId,
        updated_at: new Date(),
      },
      select: userSelect,
    });
    return { ok: true, data: toAdminUser(user) };
  } catch (error) {
    if (isUniqueEmailError(error)) {
      return { ok: false, error: "Someone with this email already has an account." };
    }
    console.error("updateUser failed", { userId: parsedId.data, error });
    return { ok: false, error: "Could not save this user. Try again." };
  }
}

export async function revokeUserAccess(userId: string): Promise<ActionResult<AdminUser>> {
  let sessionUserId: string;
  try {
    const session = await requirePermission(MANAGE_USERS_PERMISSION);
    sessionUserId = session.user.id;
  } catch {
    return { ok: false, error: "You don't have permission to revoke access." };
  }

  const parsedId = userIdSchema.safeParse(userId);
  if (!parsedId.success) return { ok: false, error: "Unknown user." };
  if (parsedId.data === sessionUserId) {
    return { ok: false, error: "You can't revoke your own access." };
  }

  try {
    const user = await prisma.users.update({
      where: { id: BigInt(parsedId.data) },
      data: { role_id: null, updated_at: new Date() },
      select: userSelect,
    });
    return { ok: true, data: toAdminUser(user) };
  } catch (error) {
    console.error("revokeUserAccess failed", { userId: parsedId.data, error });
    return { ok: false, error: "Could not revoke access. Try again." };
  }
}
