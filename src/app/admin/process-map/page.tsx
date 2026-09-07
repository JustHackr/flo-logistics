import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { defaultHomeForRole } from "@/lib/auth/roles";
import { getLocale } from "@/lib/i18n/get-locale";
import { getProcessMapStats } from "@/lib/process-map/live-stats";
import { ProcessMapClient } from "@/components/admin/process-map-client";

export default async function ProcessMapPage() {
  // Defence in depth on top of the proxy redirect: this page is admin-only.
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    redirect(defaultHomeForRole(session?.role ?? "ADMIN"));
  }

  await getLocale();
  const live = await getProcessMapStats();

  return <ProcessMapClient live={live} />;
}
