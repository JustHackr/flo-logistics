import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import { BOOTSTRAP_ADMIN_EMAIL } from "@/lib/auth/bootstrap";
import type { CreateUserInput } from "@/lib/auth/user-input";

export type { CreateUserInput } from "@/lib/auth/user-input";
export { parseCreateUserInput } from "@/lib/auth/user-input";

export async function listUsers() {
  return prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  });
}

export async function createUser(input: CreateUserInput) {
  return prisma.user.create({
    data: {
      email: input.email,
      name: input.name,
      role: input.role,
      passwordHash: hashPassword(input.password),
    },
    select: { id: true },
  });
}

export async function deleteUser(id: string, actorId: string) {
  if (id === actorId) {
    throw new Error("You cannot delete your own account.");
  }
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) throw new Error("User not found.");
  if (target.role === "ADMIN" || target.email === BOOTSTRAP_ADMIN_EMAIL) {
    const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
    if (adminCount <= 1) {
      throw new Error("Cannot delete the last administrator.");
    }
  }
  await prisma.user.delete({ where: { id } });
}
