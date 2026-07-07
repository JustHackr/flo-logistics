import { VehicleForm } from "@/components/vehicle-form";

export default function NewVehiclePage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Add Vehicle</h2>
        <p className="text-muted-foreground">
          Enter vehicle details manually for predictive maintenance analysis.
        </p>
      </div>
      <VehicleForm mode="create" />
    </div>
  );
}
