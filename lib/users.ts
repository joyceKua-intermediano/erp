import { z } from "zod"

export type AdminUser = {
  id: string
  name: string
  email: string
  avatarUrl: string | null
  roleId: string | null
  roleName: string | null
  createdAt: string | null
}

export const userIdSchema = z.string().regex(/^\d+$/, "Invalid user id.")

export const userFormSchema = z.object({
  name: z.string().trim().min(1, "Enter the person's full name.").max(255, "Name is too long."),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(255, "Email is too long.")
    .pipe(z.email("Enter a valid work email.")),
  roleId: z.string().regex(/^\d+$/, "Choose a role."),
})

export type UserFormInput = z.input<typeof userFormSchema>
