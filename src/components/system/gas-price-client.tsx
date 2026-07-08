"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ExternalLink, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/format";
import type { FuelPriceSnapshotView } from "@/lib/fuel-price-service";
import {
  FUEL_CONSUMPTION_KM_PER_LITER,
  EV_KWH_PER_KM,
} from "@/lib/routing/fuel-cost";
import {
  PERTAMINA_FUEL_SOURCE_URL,
  resolveFuelProductForVehicle,
} from "@/lib/routing/fuel-prices";

const VEHICLE_MAPPINGS = [
  {
    label: "Motorcycle · gasoline",
    vehicleType: "motorcycle" as const,
    engineType: "gasoline" as const,
  },
  {
    label: "Car · gasoline",
    vehicleType: "car" as const,
    engineType: "gasoline" as const,
  },
  {
    label: "Car · diesel",
    vehicleType: "car" as const,
    engineType: "diesel" as const,
  },
  {
    label: "Car · EV",
    vehicleType: "car" as const,
    engineType: "ev" as const,
  },
];

export function GasPriceClient({
  initialSnapshot,
}: {
  initialSnapshot: FuelPriceSnapshotView | null;
}) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [history, setHistory] = useState<FuelPriceSnapshotView[]>(
    initialSnapshot ? [initialSnapshot] : []
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/system/fuel-prices", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Refresh failed");
      setSnapshot(json.snapshot);
      setHistory((prev) => [json.snapshot, ...prev.filter((h) => h.id !== json.snapshot.id)].slice(0, 8));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Refresh failed");
    } finally {
      setLoading(false);
    }
  }

  if (!snapshot) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">No fuel price snapshot yet.</p>
        <Button onClick={() => void refresh()} disabled={loading}>
          Load Pertamina prices
        </Button>
      </div>
    );
  }

  const priceLookup = new Map(snapshot.items.map((item) => [item.productCode, item]));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Gas Price</h2>
          <p className="text-muted-foreground">
            Pertamina Patra Niaga reference prices for trip fuel cost and routing savings.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void refresh()} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh from Pertamina
          </Button>
          <Button variant="outline" render={<Link href="/routing/dashboard" />}>
            Logistics dashboard
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Latest price list</CardTitle>
          <CardDescription className="flex flex-wrap items-center gap-2">
            <span>
              Fetched {format(new Date(snapshot.fetchedAt), "PPpp")} · {snapshot.region}
            </span>
            {snapshot.effectiveLabel && (
              <Badge variant="secondary">Effective {snapshot.effectiveLabel}</Badge>
            )}
            <Badge variant="outline">{snapshot.fetchMethod.replace("_", " ")}</Badge>
            <a
              href={PERTAMINA_FUEL_SOURCE_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              Source <ExternalLink className="h-3 w-3" />
            </a>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Price / L</TableHead>
                <TableHead>Subsidy</TableHead>
                <TableHead>Fleet mapping</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {snapshot.items.map((item) => (
                <TableRow key={item.productCode}>
                  <TableCell className="font-medium">{item.productName}</TableCell>
                  <TableCell>{formatCurrency(item.pricePerLiter)}</TableCell>
                  <TableCell>{item.subsidy ? "Yes" : "No"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {item.vehicleTypes.join(", ")} · {item.engineTypes.join(", ")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Vehicle type matching</CardTitle>
          <CardDescription>
            Fuel product and consumption assumptions used for trip cost calculations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fleet profile</TableHead>
                <TableHead>Pertamina product</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Consumption</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {VEHICLE_MAPPINGS.map((mapping) => {
                const productCode = resolveFuelProductForVehicle(
                  mapping.vehicleType,
                  mapping.engineType
                );
                const product = priceLookup.get(productCode);
                const kmPerLiter =
                  mapping.engineType === "ev"
                    ? null
                    : FUEL_CONSUMPTION_KM_PER_LITER[mapping.vehicleType][
                        mapping.engineType
                      ];
                return (
                  <TableRow key={mapping.label}>
                    <TableCell className="font-medium">{mapping.label}</TableCell>
                    <TableCell>{product?.productName ?? productCode}</TableCell>
                    <TableCell>
                      {product ? formatCurrency(product.pricePerLiter) : "—"}
                      {mapping.engineType === "ev" ? " / kWh" : " / L"}
                    </TableCell>
                    <TableCell>
                      {mapping.engineType === "ev"
                        ? `${EV_KWH_PER_KM[mapping.vehicleType]} kWh/km`
                        : kmPerLiter
                          ? `${kmPerLiter} km/L`
                          : "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Price history</CardTitle>
          <CardDescription>Recent snapshots stored in BALON.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {history.map((row) => (
            <div
              key={row.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm"
            >
              <div>
                <span className="font-medium">{format(new Date(row.fetchedAt), "PPpp")}</span>
                <span className="text-muted-foreground"> · {row.region}</span>
              </div>
              <Badge variant="outline">{row.fetchMethod.replace("_", " ")}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
