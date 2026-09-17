import { LogisticsDashboardClient } from "@/components/routing/logistics-dashboard-client";
import { getSession } from "@/lib/auth/session";

export default async function RoutingDashboardPage() {
  const session = await getSession();
  return <LogisticsDashboardClient canApproveRevisions={session?.role === "ADMIN" || session?.role === "OPS_MANAGER"} canRefreshRisk={session?.role === "ADMIN" || session?.role === "OPS_MANAGER" || session?.role === "WAREHOUSE"} />;
}

