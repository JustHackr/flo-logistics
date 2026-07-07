import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import {
  enrichVehicle,
  getFleetAvgMaintenanceCost,
} from "@/lib/vehicle-service";
import { VehiclesTable } from "@/components/vehicles-table";

export default async function VehiclesPage() {
  const vehicles = await prisma.vehicle.findMany({ orderBy: { name: "asc" } });
  const avgCost = getFleetAvgMaintenanceCost(vehicles);
  const enriched = vehicles.map((v) => enrichVehicle(v, avgCost));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Vehicles</h2>
          <p className="text-muted-foreground">
            Manage fleet vehicles and view Vehicle Quality Index scores.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/vehicles/import"
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            Import CSV
          </Link>
          <Link href="/vehicles/new" className={cn(buttonVariants())}>
            Add Vehicle
          </Link>
        </div>
      </div>
      <VehiclesTable vehicles={enriched} />
    </div>
  );
}
