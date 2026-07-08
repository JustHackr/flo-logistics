import { prisma } from "@/lib/prisma";
import {
  enrichVehicle,
  getFleetAvgMaintenanceCost,
} from "@/lib/vehicle-service";
import { DriversClient } from "@/components/routing/drivers-client";

export default async function DriversPage() {
  const [drivers, vehicles] = await Promise.all([
    prisma.driver.findMany({
      orderBy: { name: "asc" },
      include: { vehicle: true },
    }),
    prisma.vehicle.findMany({ orderBy: { name: "asc" } }),
  ]);

  const fleetAvg = getFleetAvgMaintenanceCost(vehicles);
  const enrichedVehicles = vehicles.map((v) => ({
    id: v.id,
    name: v.name,
    vehicleType: v.vehicleType,
    engineType: v.engineType,
    vqi: enrichVehicle(v, fleetAvg).vqi,
    riskLevel: enrichVehicle(v, fleetAvg).riskLevel,
  }));

  const driverRows = drivers.map((d) => {
    const enriched = enrichVehicle(d.vehicle, fleetAvg);
    return {
      id: d.id,
      name: d.name,
      phone: d.phone,
      employeeId: d.employeeId,
      licenseNumber: d.licenseNumber,
      status: d.status,
      vehicleId: d.vehicleId,
      vehicleName: d.vehicle.name,
      vehicleType: d.vehicle.vehicleType,
      engineType: d.vehicle.engineType,
      vqi: enriched.vqi,
      riskLevel: enriched.riskLevel,
    };
  });

  return (
    <DriversClient drivers={driverRows} vehicles={enrichedVehicles} />
  );
}
