import { getMasterOverview } from "@/lib/master-overview";
import { MasterDashboardClient } from "@/components/master-dashboard-client";

export default async function HomePage() {
  const data = await getMasterOverview();
  return <MasterDashboardClient data={data} />;
}
