import { prisma } from "@/lib/prisma";
import {
  enrichVehicle,
  getFleetAvgMaintenanceCost,
} from "@/lib/vehicle-service";
import { MethodologyClient } from "@/components/methodology-client";

export default async function MethodologyPage() {
  const vehicles = await prisma.vehicle.findMany({ orderBy: { name: "asc" } });
  const avgCost = getFleetAvgMaintenanceCost(vehicles);
  const enriched = vehicles.map((v) => enrichVehicle(v, avgCost));

  return (
    <MethodologyClient
      vehicles={enriched}
      fleetAvgMaintenanceCost={avgCost}
    />
  );
}
