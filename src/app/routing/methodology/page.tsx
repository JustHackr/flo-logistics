import { prisma } from "@/lib/prisma";
import {
  enrichVehicle,
  getFleetAvgMaintenanceCost,
} from "@/lib/vehicle-service";
import { RoutingMethodologyClient } from "@/components/routing/routing-methodology-client";

export default async function RoutingMethodologyPage() {
  const drivers = await prisma.driver.findMany({
    include: { vehicle: true },
    orderBy: { name: "asc" },
  });
  const fleetVehicles = await prisma.vehicle.findMany();
  const fleetAvgMaintenanceCost = getFleetAvgMaintenanceCost(fleetVehicles);

  const enrichedDrivers = drivers.map((d) => {
    const enriched = enrichVehicle(d.vehicle, fleetAvgMaintenanceCost);
    return {
      id: d.id,
      name: d.name,
      phone: d.phone,
      employeeId: d.employeeId,
      vehicleType: d.vehicle.vehicleType,
      vehicleName: d.vehicle.name,
      vqi: enriched.vqi,
      riskLevel: enriched.riskLevel,
    };
  });

  return <RoutingMethodologyClient drivers={enrichedDrivers} />;
}
