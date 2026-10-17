import { ControlTowerClient } from "@/components/control-tower-client";
import { getControlTowerOverview } from "@/lib/control-tower";

export default async function ControlTowerPage() {
  const data = await getControlTowerOverview();
  return <ControlTowerClient initialData={data} />;
}
