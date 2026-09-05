import { notFound } from "next/navigation";
import { VehicleForm } from "@/components/vehicle-form";
import { prisma } from "@/lib/prisma";
import {
  enrichVehicle,
  getFleetAvgMaintenanceCost,
} from "@/lib/vehicle-service";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/dictionary";
import { t } from "@/lib/i18n/t";

type PageProps = { params: Promise<{ id: string }> };

export default async function EditVehiclePage({ params }: PageProps) {
  const dict = await getDictionary(await getLocale());
  const { id } = await params;
  const vehicle = await prisma.vehicle.findUnique({ where: { id } });
  if (!vehicle) notFound();

  const vehicles = await prisma.vehicle.findMany();
  const avgCost = getFleetAvgMaintenanceCost(vehicles);
  const enriched = enrichVehicle(vehicle, avgCost);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{t(dict, "fleet.vehicles.editVehicle")}</h2>
        <p className="text-muted-foreground">{t(dict, "fleet.vehicles.editSubtitle")}</p>
      </div>
      <VehicleForm mode="edit" initial={enriched} />
    </div>
  );
}
