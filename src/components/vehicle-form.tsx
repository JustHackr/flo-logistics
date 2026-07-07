"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { VehicleWithAnalysis } from "@/lib/types";

type VehicleFormProps = {
  initial?: Partial<VehicleWithAnalysis>;
  mode: "create" | "edit";
};

const defaultValues = {
  name: "",
  vehicleType: "car",
  engineType: "gasoline",
  vehicleAgeYears: "1",
  odometerKm: "0",
  kilometersPerFleet: "0",
  vehicleLifetimeYears: "12",
  expectedLifetimeKm: "250000",
  maintenanceCostUnit: "450000",
  lastMaintenanceDate: "",
  nextMaintenanceDate: "",
  maintenanceIntervalKm: "10000",
  notes: "",
  dataSource: "manual",
};

export function VehicleForm({ initial, mode }: VehicleFormProps) {
  const router = useRouter();
  const [form, setForm] = useState({
    ...defaultValues,
    name: initial?.name ?? defaultValues.name,
    vehicleType: initial?.vehicleType ?? defaultValues.vehicleType,
    engineType: initial?.engineType ?? defaultValues.engineType,
    vehicleAgeYears: String(initial?.vehicleAgeYears ?? defaultValues.vehicleAgeYears),
    odometerKm: String(initial?.odometerKm ?? defaultValues.odometerKm),
    kilometersPerFleet: String(initial?.kilometersPerFleet ?? defaultValues.kilometersPerFleet),
    vehicleLifetimeYears: String(initial?.vehicleLifetimeYears ?? defaultValues.vehicleLifetimeYears),
    expectedLifetimeKm: String(initial?.expectedLifetimeKm ?? defaultValues.expectedLifetimeKm),
    maintenanceCostUnit: String(initial?.maintenanceCostUnit ?? defaultValues.maintenanceCostUnit),
    lastMaintenanceDate: initial?.lastMaintenanceDate
      ? initial.lastMaintenanceDate.slice(0, 10)
      : "",
    nextMaintenanceDate: initial?.nextMaintenanceDate
      ? initial.nextMaintenanceDate.slice(0, 10)
      : "",
    maintenanceIntervalKm: String(initial?.maintenanceIntervalKm ?? defaultValues.maintenanceIntervalKm),
    notes: initial?.notes ?? "",
    dataSource: initial?.dataSource ?? "manual",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload = {
      ...form,
      vehicleAgeYears: Number(form.vehicleAgeYears),
      odometerKm: Number(form.odometerKm),
      kilometersPerFleet: Number(form.kilometersPerFleet),
      vehicleLifetimeYears: Number(form.vehicleLifetimeYears),
      expectedLifetimeKm: Number(form.expectedLifetimeKm),
      maintenanceCostUnit: Number(form.maintenanceCostUnit),
      maintenanceIntervalKm: Number(form.maintenanceIntervalKm),
      lastMaintenanceDate: form.lastMaintenanceDate || null,
      nextMaintenanceDate: form.nextMaintenanceDate || null,
      notes: form.notes || null,
      connectorId: null,
    };

    const url =
      mode === "create" ? "/api/vehicles" : `/api/vehicles/${initial?.id}`;
    const method = mode === "create" ? "POST" : "PUT";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to save vehicle");
      setLoading(false);
      return;
    }

    router.push("/vehicles");
    router.refresh();
  }

  function updateField(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {mode === "create" ? "Add Vehicle" : "Edit Vehicle"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="name">Vehicle Name</Label>
            <Input
              id="name"
              required
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Vehicle Type</Label>
            <Select
              value={form.vehicleType}
              onValueChange={(v) => updateField("vehicleType", v ?? "car")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="car">Car</SelectItem>
                <SelectItem value="motorcycle">Motorcycle</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Engine Type</Label>
            <Select
              value={form.engineType}
              onValueChange={(v) => updateField("engineType", v ?? "gasoline")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gasoline">Gasoline</SelectItem>
                <SelectItem value="diesel">Diesel</SelectItem>
                <SelectItem value="ev">EV</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="vehicleAgeYears">Vehicle Age (years)</Label>
            <Input
              id="vehicleAgeYears"
              type="number"
              step="0.1"
              required
              value={form.vehicleAgeYears}
              onChange={(e) => updateField("vehicleAgeYears", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="odometerKm">Odometer (km)</Label>
            <Input
              id="odometerKm"
              type="number"
              required
              value={form.odometerKm}
              onChange={(e) => updateField("odometerKm", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="kilometersPerFleet">Kilometers per Fleet</Label>
            <Input
              id="kilometersPerFleet"
              type="number"
              required
              value={form.kilometersPerFleet}
              onChange={(e) => updateField("kilometersPerFleet", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="vehicleLifetimeYears">Vehicle Lifetime (years)</Label>
            <Input
              id="vehicleLifetimeYears"
              type="number"
              step="0.1"
              required
              value={form.vehicleLifetimeYears}
              onChange={(e) => updateField("vehicleLifetimeYears", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="expectedLifetimeKm">Expected Lifetime (km)</Label>
            <Input
              id="expectedLifetimeKm"
              type="number"
              required
              value={form.expectedLifetimeKm}
              onChange={(e) => updateField("expectedLifetimeKm", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="maintenanceCostUnit">Maintenance Cost (Rp)</Label>
            <Input
              id="maintenanceCostUnit"
              type="number"
              step="1000"
              required
              value={form.maintenanceCostUnit}
              onChange={(e) => updateField("maintenanceCostUnit", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="maintenanceIntervalKm">Maintenance Interval (km)</Label>
            <Input
              id="maintenanceIntervalKm"
              type="number"
              required
              value={form.maintenanceIntervalKm}
              onChange={(e) => updateField("maintenanceIntervalKm", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lastMaintenanceDate">Last Maintenance Date</Label>
            <Input
              id="lastMaintenanceDate"
              type="date"
              value={form.lastMaintenanceDate}
              onChange={(e) => updateField("lastMaintenanceDate", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="nextMaintenanceDate">Next Maintenance Date</Label>
            <Input
              id="nextMaintenanceDate"
              type="date"
              value={form.nextMaintenanceDate}
              onChange={(e) => updateField("nextMaintenanceDate", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Data Source</Label>
            <Select
              value={form.dataSource}
              onValueChange={(v) => updateField("dataSource", v ?? "manual")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Manual</SelectItem>
                <SelectItem value="csv">CSV Import</SelectItem>
                <SelectItem value="connector" disabled>
                  Connector (coming soon)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={form.notes}
              onChange={(e) => updateField("notes", e.target.value)}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive md:col-span-2">{error}</p>
          )}

          <div className="flex gap-2 md:col-span-2">
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : mode === "create" ? "Create Vehicle" : "Update Vehicle"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/vehicles")}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
