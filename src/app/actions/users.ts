"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { createUser, deleteUser } from "@/lib/auth/users";
import { parseCreateUserInput } from "@/lib/auth/user-input";

export type UserActionResult = { ok: true } | { ok: false; message: string };

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return null;
  }
  return session;
}

export async function createUserAction(
  formData: FormData,
): Promise<UserActionResult> {
  const session = await requireAdmin();
  if (!session) return { ok: false, message: "Admin role required." };
  try {
    const parsed = parseCreateUserInput({
      email: String(formData.get("email") ?? ""),
      name: String(formData.get("name") ?? ""),
      password: String(formData.get("password") ?? ""),
      role: String(formData.get("role") ?? ""),
    });
    await createUser(parsed);
    revalidatePath("/admin/users");
    return { ok: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not create user.";
    if (message.includes("Unique constraint")) {
      return { ok: false, message: "That email is already in use." };
    }
    return { ok: false, message };
  }
}

export async function deleteUserAction(userId: string): Promise<UserActionResult> {
  const session = await requireAdmin();
  if (!session) return { ok: false, message: "Admin role required." };
  try {
    await deleteUser(userId, session.id);
    revalidatePath("/admin/users");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Could not delete user.",
    };
  }
}
