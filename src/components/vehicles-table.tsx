"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
import type { VehicleWithAnalysis } from "@/lib/types";

type SortKey = keyof Pick<
  VehicleWithAnalysis,
  "name" | "vehicleAgeYears" | "odometerKm" | "vqi" | "engineType" | "vehicleType"
>;

export function VehiclesTable({
  vehicles: initialVehicles,
}: {
  vehicles: VehicleWithAnalysis[];
}) {
  const [vehicles, setVehicles] = useState(initialVehicles);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const sorted = useMemo(() => {
    return [...vehicles].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
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
    const res = await fetch(`/api/vehicles/${deleteId}`, { method: "DELETE" });
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
                  {sortLabel("name", "Name")}
                </button>
              </TableHead>
              <TableHead>
                <button type="button" onClick={() => toggleSort("vehicleType")}>
                  {sortLabel("vehicleType", "Type")}
                </button>
              </TableHead>
              <TableHead>
                <button type="button" onClick={() => toggleSort("engineType")}>
                  {sortLabel("engineType", "Engine")}
                </button>
              </TableHead>
              <TableHead>
                <button type="button" onClick={() => toggleSort("vehicleAgeYears")}>
                  {sortLabel("vehicleAgeYears", "Age")}
                </button>
              </TableHead>
              <TableHead>
                <button type="button" onClick={() => toggleSort("odometerKm")}>
                  {sortLabel("odometerKm", "Odometer")}
                </button>
              </TableHead>
              <TableHead>
                <button type="button" onClick={() => toggleSort("vqi")}>
                  {sortLabel("vqi", "VQI")}
                </button>
              </TableHead>
              <TableHead>Next Maintenance</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((vehicle) => (
              <TableRow key={vehicle.id}>
                <TableCell className="font-medium">{vehicle.name}</TableCell>
                <TableCell className="capitalize">{vehicle.vehicleType}</TableCell>
                <TableCell className="uppercase">{vehicle.engineType}</TableCell>
                <TableCell>{formatNumber(vehicle.vehicleAgeYears, 1)} yr</TableCell>
                <TableCell>{formatNumber(vehicle.odometerKm)} km</TableCell>
                <TableCell>
                  <RiskBadge risk={vehicle.riskLevel} vqi={vehicle.vqi} />
                </TableCell>
                <TableCell>{formatDate(vehicle.nextMaintenanceDate)}</TableCell>
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
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete vehicle?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. The vehicle record will be permanently
              removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
