import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { defaultHomeForRole } from "@/lib/auth/roles";
import { listUsers } from "@/lib/auth/users";
import { UsersClient } from "@/components/admin/users-client";

export default async function AdminUsersPage() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    redirect(defaultHomeForRole(session?.role ?? "ADMIN"));
  }
  const users = await listUsers();
  return <UsersClient users={users} currentUserId={session.id} />;
}
