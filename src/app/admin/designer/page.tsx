import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { defaultHomeForRole } from "@/lib/auth/roles";
import { FloDesignerClient } from "@/components/admin/flo-designer-client";

export default async function DesignerPage() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    redirect(defaultHomeForRole(session?.role ?? "ADMIN"));
  }
  return <FloDesignerClient />;
}
