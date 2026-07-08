import { getRoutingLogisticsOverview } from "@/lib/routing-overview";
import { LogisticsReportsClient } from "@/components/routing/logistics-reports-client";

export default async function LogisticsReportsPage() {
  const overview = await getRoutingLogisticsOverview();
  return <LogisticsReportsClient overview={overview} />;
}
