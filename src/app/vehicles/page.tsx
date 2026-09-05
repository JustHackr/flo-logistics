import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import {
  enrichVehicle,
  getFleetAvgMaintenanceCost,
} from "@/lib/vehicle-service";
import { aggregateFleetFuelMix } from "@/lib/vehicle-fuel";
import { VehiclesTable } from "@/components/vehicles-table";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/dictionary";
import { t } from "@/lib/i18n/t";
import type { EngineType, VehicleType } from "@/lib/types";

function fuelMixBadgeClass(tier: "zero" | "subsidized" | "standard") {
  if (tier === "zero") return "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
  if (tier === "subsidized") return "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-400";
  return "";
}

export default async function VehiclesPage() {
  const [locale, vehicles] = await Promise.all([
    getLocale(),
    prisma.vehicle.findMany({ orderBy: { name: "asc" } }),
  ]);
  const dict = await getDictionary(locale);
  const avgCost = getFleetAvgMaintenanceCost(vehicles);
  const enriched = vehicles.map((v) => enrichVehicle(v, avgCost));
  const fuelMix = aggregateFleetFuelMix(
    enriched.map((v) => ({
      vehicleType: v.vehicleType as VehicleType,
      engineType: v.engineType as EngineType,
    }))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {t(dict, "fleet.vehicles.title")}
          </h2>
          <p className="text-muted-foreground">
            {t(dict, "fleet.vehicles.subtitle")}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/vehicles/import"
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            {t(dict, "fleet.vehicles.importCsv")}
          </Link>
          <Link href="/vehicles/new" className={cn(buttonVariants())}>
            {t(dict, "fleet.vehicles.addVehicle")}
          </Link>
        </div>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium">
              {t(dict, "fleet.vehicles.fuelMix")}
            </p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {t(dict, "fleet.vehicles.zeroEmissionPercent", {
                percent: fuelMix.zeroEmissionPercent,
              })}
            </p>
            <p className="text-xs text-muted-foreground">
              {t(dict, "fleet.vehicles.zeroEmissionCount", {
                count: fuelMix.zeroEmissionCount,
                total: fuelMix.total,
              })}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {fuelMix.byProduct.map((item) => (
              <Badge
                key={item.label}
                variant="outline"
                className={cn("text-xs", fuelMixBadgeClass(item.tier))}
              >
                {item.count} {item.label}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <VehiclesTable vehicles={enriched} />
    </div>
  );
}
