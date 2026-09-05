"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RiskBadge } from "@/components/risk-badge";
import { useI18n } from "@/components/i18n/use-i18n";
import type { RiskLevel } from "@/lib/vqi";

type VehicleOption = {
  id: string;
  name: string;
  vehicleType: string;
  engineType: string;
  vqi: number;
  riskLevel: RiskLevel;
};

type DriverRow = {
  id: string;
  name: string;
  phone: string | null;
  employeeId: string | null;
  licenseNumber: string | null;
  status: string;
  vehicleId: string;
  vehicleName: string;
  vehicleType: string;
  engineType: string;
  vqi: number;
  riskLevel: RiskLevel;
};

const emptyForm = {
  name: "",
  phone: "",
  employeeId: "",
  licenseNumber: "",
  status: "available",
  vehicleId: "",
};

export function DriversClient({
  drivers: initialDrivers,
  vehicles,
}: {
  drivers: DriverRow[];
  vehicles: VehicleOption[];
}) {
  const { t } = useI18n();
  const [drivers, setDrivers] = useState(initialDrivers);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function openCreate() {
    setEditingId(null);
    setFormOpen(true);
    setForm({
      ...emptyForm,
      vehicleId: vehicles[0]?.id ?? "",
    });
  }

  function openEdit(driver: DriverRow) {
    setEditingId(driver.id);
    setFormOpen(true);
    setForm({
      name: driver.name,
      phone: driver.phone ?? "",
      employeeId: driver.employeeId ?? "",
      licenseNumber: driver.licenseNumber ?? "",
      status: driver.status,
      vehicleId: driver.vehicleId,
    });
  }

  async function saveDriver() {
    setError(null);
    setLoading(true);
    try {
      const payload = {
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        employeeId: form.employeeId.trim() || null,
        licenseNumber: form.licenseNumber.trim() || null,
        status: form.status,
        vehicleId: form.vehicleId,
      };

      const res = await fetch(
        editingId ? `/api/routing/drivers/${editingId}` : "/api/routing/drivers",
        {
          method: editingId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? t("routing.drivers.saveFailed"));

      const vehicle = vehicles.find((v) => v.id === data.vehicleId);
      const row: DriverRow = {
        id: data.id,
        name: data.name,
        phone: data.phone,
        employeeId: data.employeeId,
        licenseNumber: data.licenseNumber,
        status: data.status,
        vehicleId: data.vehicleId,
        vehicleName: data.vehicle?.name ?? vehicle?.name ?? "—",
        vehicleType: data.vehicle?.vehicleType ?? vehicle?.vehicleType ?? "—",
        engineType: data.vehicle?.engineType ?? vehicle?.engineType ?? "—",
        vqi: vehicle?.vqi ?? 0,
        riskLevel: vehicle?.riskLevel ?? "medium",
      };

      if (editingId) {
        setDrivers((prev) => prev.map((d) => (d.id === editingId ? row : d)));
      } else {
        setDrivers((prev) => [...prev, row].sort((a, b) => a.name.localeCompare(b.name)));
      }
      setEditingId(null);
      setFormOpen(false);
      setForm(emptyForm);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("routing.drivers.saveFailed"));
    } finally {
      setLoading(false);
    }
  }

  async function confirmDelete() {
    if (!deleteId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/routing/drivers/${deleteId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data?.error ??
            (res.status === 409
              ? t("routing.drivers.deleteBlocked")
              : t("routing.drivers.deleteFailed"))
        );
      }
      setDrivers((prev) => prev.filter((d) => d.id !== deleteId));
      setDeleteId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("routing.drivers.deleteFailed"));
    } finally {
      setLoading(false);
    }
  }

  const showForm = formOpen;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t("routing.drivers.title")}</h2>
          <p className="text-muted-foreground">
            {t("routing.drivers.subtitle")}{" "}
            <Link href="/routing/methodology" className="font-medium text-primary hover:underline">
              {t("routing.drivers.matchingGuide")}
            </Link>
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          {t("routing.drivers.addDriver")}
        </Button>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {(showForm || editingId) && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingId ? t("routing.drivers.editDriver") : t("routing.drivers.new")}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="driver-name">{t("common.name")}</Label>
              <Input
                id="driver-name"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="driver-phone">{t("routing.drivers.phone")}</Label>
              <Input
                id="driver-phone"
                value={form.phone}
                onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                placeholder="+62 812-3456-7801"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="driver-emp">{t("routing.drivers.employeeId")}</Label>
              <Input
                id="driver-emp"
                value={form.employeeId}
                onChange={(e) => setForm((p) => ({ ...p, employeeId: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="driver-license">{t("routing.drivers.license")}</Label>
              <Input
                id="driver-license"
                value={form.licenseNumber}
                onChange={(e) => setForm((p) => ({ ...p, licenseNumber: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("common.status")}</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm((p) => ({ ...p, status: v ?? "available" }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">{t("routing.drivers.statusAvailable")}</SelectItem>
                  <SelectItem value="on_route">{t("routing.drivers.statusOnRoute")}</SelectItem>
                  <SelectItem value="off_duty">{t("routing.drivers.statusOffDuty")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("routing.drivers.assignedVehicle")}</Label>
              <Select
                value={form.vehicleId}
                onValueChange={(v) => setForm((p) => ({ ...p, vehicleId: v ?? "" }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("common.selectVehicle")} />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {t("routing.drivers.vehicleOption", {
                        name: v.name,
                        type: v.vehicleType,
                        vqi: v.vqi,
                      })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 sm:col-span-2">
              <Button
                onClick={() => void saveDriver()}
                disabled={loading || !form.name.trim() || !form.vehicleId}
              >
                {editingId
                  ? t("routing.drivers.updateDriver")
                  : t("routing.drivers.createDriver")}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setEditingId(null);
                  setFormOpen(false);
                  setForm(emptyForm);
                }}
              >
                {t("common.cancel")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t("routing.drivers.rosterTitle")}</CardTitle>
          <CardDescription>{t("routing.drivers.rosterDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("common.name")}</TableHead>
                  <TableHead>{t("common.contact")}</TableHead>
                  <TableHead>{t("common.vehicle")}</TableHead>
                  <TableHead>VQI</TableHead>
                  <TableHead>{t("common.status")}</TableHead>
                  <TableHead className="text-right">{t("common.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {drivers.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>
                      <div className="font-medium">{d.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {d.employeeId ?? "—"}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {d.phone ?? "—"}
                      <div className="text-xs text-muted-foreground">
                        {d.licenseNumber ?? "—"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{d.vehicleName}</div>
                      <div className="text-xs capitalize text-muted-foreground">
                        {d.vehicleType} · {d.engineType}
                      </div>
                    </TableCell>
                    <TableCell>
                      <RiskBadge risk={d.riskLevel} vqi={d.vqi} />
                    </TableCell>
                    <TableCell className="capitalize text-sm">{d.status}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(d)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteId(d.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {drivers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      {t("routing.drivers.emptyHint")}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={Boolean(deleteId)} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("routing.drivers.deleteTitle")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t("routing.drivers.deleteDescription")}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              {t("common.cancel")}
            </Button>
            <Button variant="destructive" onClick={() => void confirmDelete()} disabled={loading}>
              {t("common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
