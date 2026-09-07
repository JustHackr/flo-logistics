"use client";

import { withBasePath } from "@/lib/base-path";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RiskBadge } from "@/components/risk-badge";
import { formatDate, formatNumber } from "@/lib/format";
import { getVehicleFuelDisplay } from "@/lib/vehicle-fuel";
import type { VehicleWithAnalysis } from "@/lib/types";
import { useI18n } from "@/components/i18n/use-i18n";

type SortKey =
  | keyof Pick<
      VehicleWithAnalysis,
      "name" | "vehicleAgeYears" | "odometerKm" | "vqi" | "engineType" | "vehicleType"
    >
  | "fuel";

function fuelBadgeClass(tier: ReturnType<typeof getVehicleFuelDisplay>["tier"]) {
  if (tier === "zero") return "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
  if (tier === "subsidized") return "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-400";
  return "";
}

export function VehiclesTable({
  vehicles: initialVehicles,
}: {
  vehicles: VehicleWithAnalysis[];
}) {
  const { t, locale } = useI18n();
  const [vehicles, setVehicles] = useState(initialVehicles);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const sorted = useMemo(() => {
    return [...vehicles].sort((a, b) => {
      let aVal: string | number;
      let bVal: string | number;

      if (sortKey === "fuel") {
        aVal = getVehicleFuelDisplay(a.vehicleType, a.engineType).shortLabel;
        bVal = getVehicleFuelDisplay(b.vehicleType, b.engineType).shortLabel;
      } else {
        aVal = a[sortKey];
        bVal = b[sortKey];
      }

      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      }
      return sortDir === "asc"
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
  }, [vehicles, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    const res = await fetch(withBasePath(`/api/vehicles/${deleteId}`), { method: "DELETE" });
    if (res.ok) {
      setVehicles((prev) => prev.filter((v) => v.id !== deleteId));
    }
    setDeleting(false);
    setDeleteId(null);
  }

  function sortLabel(key: SortKey, label: string) {
    const arrow = sortKey === key ? (sortDir === "asc" ? " ↑" : " ↓") : "";
    return `${label}${arrow}`;
  }

  return (
    <>
      <div className="rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <button type="button" onClick={() => toggleSort("name")}>
                  {sortLabel("name", t("fleet.vehicles.name"))}
                </button>
              </TableHead>
              <TableHead>
                <button type="button" onClick={() => toggleSort("vehicleType")}>
                  {sortLabel("vehicleType", t("fleet.vehicles.type"))}
                </button>
              </TableHead>
              <TableHead>
                <button type="button" onClick={() => toggleSort("fuel")}>
                  {sortLabel("fuel", t("fleet.vehicles.fuel"))}
                </button>
              </TableHead>
              <TableHead>
                <button type="button" onClick={() => toggleSort("engineType")}>
                  {sortLabel("engineType", t("fleet.vehicles.engine"))}
                </button>
              </TableHead>
              <TableHead>
                <button type="button" onClick={() => toggleSort("vehicleAgeYears")}>
                  {sortLabel("vehicleAgeYears", t("fleet.vehicles.age"))}
                </button>
              </TableHead>
              <TableHead>
                <button type="button" onClick={() => toggleSort("odometerKm")}>
                  {sortLabel("odometerKm", t("fleet.vehicles.odometer"))}
                </button>
              </TableHead>
              <TableHead>
                <button type="button" onClick={() => toggleSort("vqi")}>
                  {sortLabel("vqi", "VQI")}
                </button>
              </TableHead>
              <TableHead>{t("fleet.vehicles.nextMaintenance")}</TableHead>
              <TableHead className="text-right">{t("common.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((vehicle) => {
              const fuel = getVehicleFuelDisplay(vehicle.vehicleType, vehicle.engineType);
              return (
                <TableRow key={vehicle.id}>
                  <TableCell className="font-medium">{vehicle.name}</TableCell>
                  <TableCell className="capitalize">{vehicle.vehicleType}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn("text-xs", fuelBadgeClass(fuel.tier))}>
                      {fuel.shortLabel}
                    </Badge>
                  </TableCell>
                  <TableCell className="uppercase">{vehicle.engineType}</TableCell>
                  <TableCell>
                    {t("fleet.vehicles.ageValue", {
                      value: formatNumber(vehicle.vehicleAgeYears, 1, locale),
                    })}
                  </TableCell>
                  <TableCell>
                    {t("common.kmValue", {
                      value: formatNumber(vehicle.odometerKm, 0, locale),
                    })}
                  </TableCell>
                  <TableCell>
                    <RiskBadge risk={vehicle.riskLevel} vqi={vehicle.vqi} />
                  </TableCell>
                  <TableCell>{formatDate(vehicle.nextMaintenanceDate, locale)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Link
                        href={`/vehicles/${vehicle.id}/edit`}
                        className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
                      >
                        <Pencil className="h-4 w-4" />
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteId(vehicle.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("fleet.vehicles.deleteTitle")}</DialogTitle>
            <DialogDescription>
              {t("fleet.vehicles.deleteDescription")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? t("common.deleting") : t("common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
