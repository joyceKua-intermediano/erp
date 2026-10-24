"use server";

import type { ActionResult } from "@/lib/action-result";
import { requirePermission } from "@/lib/auth";
import { Prisma } from "@/lib/generated/prisma/client";
import { ADMIN_ROLE_NAME, MANAGE_USERS_PERMISSION, type PermissionName } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import {
  roleFormSchema,
  roleIdSchema,
  type RoleDetail,
  type RoleFormInput,
  type RoleSummary,
} from "@/lib/roles";

const roleSelect = {
  id: true,
  name: true,
  description: true,
  all_clusters: true,
  _count: { select: { users: true } },
  role_permissions: { select: { permissions: { select: { name: true } } } },
  role_clusters: {
    where: { intermediano_companies: { deleted_at: null } },
    orderBy: { intermediano_companies: { name: "asc" } },
    select: { intermediano_companies: { select: { id: true, name: true } } },
  },
} satisfies Prisma.rolesSelect;

type RoleRow = Prisma.rolesGetPayload<{ select: typeof roleSelect }>;

function toRoleSummary(role: RoleRow): RoleSummary {
  const isProtected = role.name === ADMIN_ROLE_NAME;
  const allClusters = isProtected || role.all_clusters;
  return {
    id: role.id.toString(),
    name: role.name,
    description: role.description,
    userCount: role._count.users,
    permissions: role.role_permissions.map((link) => link.permissions.name as PermissionName),
    allClusters,
    clusters: allClusters
      ? []
      : role.role_clusters.map((link) => ({
        id: link.intermediano_companies.id.toString(),
        label: link.intermediano_companies.name,
      })),
    isProtected,
  };
}

async function findClusterIds(clusterIds: string[]) {
  const unique = [...new Set(clusterIds)];
  const rows = await prisma.intermediano_companies.findMany({
    where: { id: { in: unique.map((id) => BigInt(id)) }, deleted_at: null },
    select: { id: true },
  });
  return rows.length === unique.length ? rows.map((row) => row.id) : null;
}

function isUniqueNameError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

async function findPermissionIds(names: PermissionName[]) {
  const unique = [...new Set(names)];
  const rows = await prisma.permissions.findMany({
    where: { name: { in: unique } },
    select: { id: true },
  });
  return rows.length === unique.length ? rows.map((row) => row.id) : null;
}

async function requireManageSession() {
  try {
    const session = await requirePermission(MANAGE_USERS_PERMISSION);
    return session.user.id;
  } catch {
    return null;
  }
}

export async function getRoles(): Promise<RoleSummary[]> {
  await requirePermission("users.view");

  try {
    const roles = await prisma.roles.findMany({ orderBy: { name: "asc" }, select: roleSelect });
    return roles.map(toRoleSummary);
  } catch (error) {
    console.error("getRoles failed", { error });
    throw new Error("Could not load roles.");
  }
}

export async function getRole(roleId: string): Promise<RoleDetail | null> {
  await requirePermission("users.view");

  const parsedId = roleIdSchema.safeParse(roleId);
  if (!parsedId.success) return null;

  try {
    const role = await prisma.roles.findUnique({
      where: { id: BigInt(parsedId.data) },
      select: {
        ...roleSelect,
        users: { orderBy: { name: "asc" }, select: { id: true, name: true, email: true } },
      },
    });
    if (!role) return null;

    return {
      ...toRoleSummary(role),
      members: role.users.map((user) => ({ id: user.id.toString(), name: user.name, email: user.email })),
    };
  } catch (error) {
    console.error("getRole failed", { roleId: parsedId.data, error });
    throw new Error("Could not load this role.");
  }
}

export async function createRole(input: RoleFormInput): Promise<ActionResult<RoleSummary>> {
  if (!(await requireManageSession())) {
    return { ok: false, error: "You don't have permission to create roles." };
  }

  const parsed = roleFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }
  if (parsed.data.name === ADMIN_ROLE_NAME) {
    return { ok: false, error: "A role with this name already exists." };
  }

  try {
    const permissionIds = await findPermissionIds(parsed.data.permissions);
    if (!permissionIds) return { ok: false, error: "Some permissions are not set up in the database." };
    const clusterIds = parsed.data.allClusters ? [] : await findClusterIds(parsed.data.clusterIds);
    if (!clusterIds) return { ok: false, error: "Some of the selected clusters no longer exist." };

    const now = new Date();
    const role = await prisma.roles.create({
      data: {
        name: parsed.data.name,
        description: parsed.data.description,
        all_clusters: parsed.data.allClusters,
        created_at: now,
        updated_at: now,
        role_permissions: { create: permissionIds.map((permission_id) => ({ permission_id })) },
        role_clusters: {
          create: clusterIds.map((intermediano_company_id) => ({ intermediano_company_id })),
        },
      },
      select: roleSelect,
    });
    return { ok: true, data: toRoleSummary(role) };
  } catch (error) {
    if (isUniqueNameError(error)) return { ok: false, error: "A role with this name already exists." };
    console.error("createRole failed", { error });
    return { ok: false, error: "Could not create this role. Try again." };
  }
}

export async function updateRole(roleId: string, input: RoleFormInput): Promise<ActionResult<RoleSummary>> {
  const sessionUserId = await requireManageSession();
  if (!sessionUserId) return { ok: false, error: "You don't have permission to edit roles." };

  const parsedId = roleIdSchema.safeParse(roleId);
  const parsed = roleFormSchema.safeParse(input);
  if (!parsedId.success) return { ok: false, error: "Unknown role." };
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  try {
    const id = BigInt(parsedId.data);
    const existing = await prisma.roles.findUnique({ where: { id }, select: { name: true } });
    if (!existing) return { ok: false, error: "This role no longer exists." };
    if (existing.name === ADMIN_ROLE_NAME) {
      return { ok: false, error: "The admin role always has full access and can't be edited." };
    }
    if (parsed.data.name === ADMIN_ROLE_NAME) {
      return { ok: false, error: "A role with this name already exists." };
    }

    const sessionUser = await prisma.users.findUnique({
      where: { id: BigInt(sessionUserId) },
      select: { role_id: true },
    });
    if (sessionUser?.role_id === id && !parsed.data.permissions.includes(MANAGE_USERS_PERMISSION)) {
      return { ok: false, error: "This is your role. Keep Manage on Users & roles so you don't lock yourself out." };
    }

    const permissionIds = await findPermissionIds(parsed.data.permissions);
    if (!permissionIds) return { ok: false, error: "Some permissions are not set up in the database." };
    const clusterIds = parsed.data.allClusters ? [] : await findClusterIds(parsed.data.clusterIds);
    if (!clusterIds) return { ok: false, error: "Some of the selected clusters no longer exist." };

    const role = await prisma.$transaction(async (tx) => {
      await tx.role_permissions.deleteMany({ where: { role_id: id } });
      await tx.role_clusters.deleteMany({ where: { role_id: id } });
      return tx.roles.update({
        where: { id },
        data: {
          name: parsed.data.name,
          description: parsed.data.description,
          all_clusters: parsed.data.allClusters,
          updated_at: new Date(),
          role_permissions: { create: permissionIds.map((permission_id) => ({ permission_id })) },
          role_clusters: {
            create: clusterIds.map((intermediano_company_id) => ({ intermediano_company_id })),
          },
        },
        select: roleSelect,
      });
    });
    return { ok: true, data: toRoleSummary(role) };
  } catch (error) {
    if (isUniqueNameError(error)) return { ok: false, error: "A role with this name already exists." };
    console.error("updateRole failed", { roleId: parsedId.data, error });
    return { ok: false, error: "Could not save this role. Try again." };
  }
}

export async function deleteRole(roleId: string): Promise<ActionResult<{ id: string }>> {
  if (!(await requireManageSession())) {
    return { ok: false, error: "You don't have permission to delete roles." };
  }

  const parsedId = roleIdSchema.safeParse(roleId);
  if (!parsedId.success) return { ok: false, error: "Unknown role." };

  try {
    const id = BigInt(parsedId.data);
    // users.role_id is ON DELETE SET NULL, so deleting an assigned role would silently lock those users out.
    const result = await prisma.$transaction(async (tx) => {
      const role = await tx.roles.findUnique({ where: { id }, select: { name: true, _count: { select: { users: true } } } });
      if (!role) return "missing" as const;
      if (role.name === ADMIN_ROLE_NAME) return "protected" as const;
      if (role._count.users > 0) return "in_use" as const;
      await tx.roles.delete({ where: { id } });
      return "deleted" as const;
    });

    if (result === "missing") return { ok: false, error: "This role no longer exists." };
    if (result === "protected") return { ok: false, error: "The admin role can't be deleted." };
    if (result === "in_use") return { ok: false, error: "Move everyone off this role before deleting it." };
    return { ok: true, data: { id: parsedId.data } };
  } catch (error) {
    console.error("deleteRole failed", { roleId: parsedId.data, error });
    return { ok: false, error: "Could not delete this role. Try again." };
  }
}
