import { addDays, isBefore, isAfter } from "date-fns";
import { prisma } from "@/lib/prisma";
import {
  enrichVehicle,
  getFleetAvgMaintenanceCost,
} from "@/lib/vehicle-service";
import { ReportsClient } from "@/components/reports-client";

export default async function ReportsPage() {
  const vehicles = await prisma.vehicle.findMany({ orderBy: { name: "asc" } });
  const avgCost = getFleetAvgMaintenanceCost(vehicles);
  const enriched = vehicles.map((v) => enrichVehicle(v, avgCost));

  const today = new Date();
  const windowEnd = addDays(today, 90);

  const timeline = enriched
    .filter((v) => v.predictedNextMaintenance)
    .map((v) => {
      const date = new Date(v.predictedNextMaintenance!);
      return {
        name: v.name,
        date: v.predictedNextMaintenance,
        estimatedCost: v.estimatedCost,
        riskLevel: v.riskLevel,
        inWindow: !isBefore(date, today) && !isAfter(date, windowEnd),
      };
    })
    .sort(
      (a, b) =>
        new Date(a.date!).getTime() - new Date(b.date!).getTime()
    );

  return (
    <ReportsClient
      generatedAt={new Date().toISOString()}
      vehicles={enriched}
      timeline={timeline}
    />
  );
}
