import { VehicleForm } from "@/components/vehicle-form";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/dictionary";
import { t } from "@/lib/i18n/t";

export default async function NewVehiclePage() {
  const dict = await getDictionary(await getLocale());
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{t(dict, "fleet.vehicles.addVehicle")}</h2>
        <p className="text-muted-foreground">
          {t(dict, "fleet.vehicles.addSubtitle")}
        </p>
      </div>
      <VehicleForm mode="create" />
    </div>
  );
}
