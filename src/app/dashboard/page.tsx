import { prisma } from "@/lib/prisma";
import {
  enrichVehicle,
  getFleetAvgMaintenanceCost,
} from "@/lib/vehicle-service";
import { DashboardClient } from "@/components/dashboard-client";

export default async function DashboardPage() {
  const vehicles = await prisma.vehicle.findMany({ orderBy: { name: "asc" } });
  const avgCost = getFleetAvgMaintenanceCost(vehicles);
  const enriched = vehicles.map((v) => enrichVehicle(v, avgCost));

  const summary = {
    totalVehicles: enriched.length,
    avgVqi:
      enriched.length > 0
        ? Math.round(
            enriched.reduce((sum, v) => sum + v.vqi, 0) / enriched.length
          )
        : 0,
    highRiskCount: enriched.filter((v) => v.riskLevel === "high").length,
    mediumRiskCount: enriched.filter((v) => v.riskLevel === "medium").length,
    lowRiskCount: enriched.filter((v) => v.riskLevel === "low").length,
    totalMaintenanceCost: enriched.reduce(
      (sum, v) => sum + v.maintenanceCostUnit,
      0
    ),
    byEngineType: ["gasoline", "diesel", "ev"].map((type) => ({
      engineType: type,
      count: enriched.filter((v) => v.engineType === type).length,
    })),
    byVehicleType: ["van", "motorcycle"].map((type) => ({
      vehicleType: type,
      count: enriched.filter((v) => v.vehicleType === type).length,
    })),
    vqiDistribution: [
      { range: "0-39", count: enriched.filter((v) => v.vqi < 40).length },
      {
        range: "40-70",
        count: enriched.filter((v) => v.vqi >= 40 && v.vqi <= 70).length,
      },
      { range: "71-100", count: enriched.filter((v) => v.vqi > 70).length },
    ],
    costByVehicleType: ["van", "motorcycle"].map((type) => ({
      vehicleType: type,
      totalCost: enriched
        .filter((v) => v.vehicleType === type)
        .reduce((sum, v) => sum + v.maintenanceCostUnit, 0),
    })),
    scatterData: enriched.map((v) => ({
      id: v.id,
      name: v.name,
      age: v.vehicleAgeYears,
      odometer: v.odometerKm,
      vqi: v.vqi,
      riskLevel: v.riskLevel,
    })),
  };

  return <DashboardClient summary={summary} vehicles={enriched} />;
}
