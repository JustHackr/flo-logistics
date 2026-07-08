"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RiskBadge } from "@/components/risk-badge";

type OrderStatus =
  | "RECEIVED"
  | "PREPARING"
  | "ON_ROUTE"
  | "ETA"
  | "DELIVERED";

type RoutingStop = {
  sequence: number;
  orderId: string;
  recipientAddress: string;
  orderStatus: OrderStatus;
  etaAt: string | null;
  distanceKm: number;
  durationMin: number;
};

type ActiveRoute = {
  routePlanId: string;
  status: string;
  warehouse: { id: string; name: string };
  driver: {
    id: string;
    name: string;
    vehicle: {
      id: string;
      engineType: string;
      vehicleType: string;
      odometerKm: number;
      vqi: number;
      riskLevel: "low" | "medium" | "high";
    };
  };
  totals: {
    totalStops: number;
    deliveredStops: number;
    progressPercent: number;
    totalDistanceKm: number;
    totalDurationMin: number;
    estimatedEmissionsKg: number;
  };
  nextStop: null | {
    orderId: string;
    recipientAddress: string;
    etaAt: string | null;
    orderStatus: OrderStatus;
  };
  stops: RoutingStop[];
};

type Overview = {
  generatedAt: string;
  pipeline: Record<string, number>;
  activeRoutes: ActiveRoute[];
};

function formatDateTime(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("id-ID", {
    hour12: false,
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function LogisticsDashboardClient() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/routing/logistics/overview");
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to load overview");
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load overview");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function setDelivered(orderId: string) {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/routing/orders/${orderId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "DELIVERED" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to update order");
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update order");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Logistics Dashboard
          </h2>
          <p className="text-muted-foreground">
            Admin view of driver status, route progress, and per-order timestamps. Use
            “Mark delivered” to simulate completion and see progress update.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void load()} disabled={loading}>
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {!data && loading && (
        <div className="text-sm text-muted-foreground">Loading dashboard...</div>
      )}

      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {(
              [
                ["RECEIVED", "Received"],
                ["PREPARING", "Preparing"],
                ["ON_ROUTE", "On route"],
                ["ETA", "ETA"],
                ["DELIVERED", "Delivered"],
              ] as const
            ).map(([key, label]) => (
              <Card key={key}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{data.pipeline[key] ?? 0}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="space-y-4">
            {data.activeRoutes.length === 0 && (
              <div className="text-sm text-muted-foreground">
                No optimized routes yet. Go to <span className="font-medium">Routing Orders</span>, select orders, and optimize.
              </div>
            )}

            {data.activeRoutes.map((route) => (
              <Card key={route.routePlanId}>
                <CardHeader>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <CardTitle className="text-base">
                        Driver: {route.driver.name} · Vehicle {route.driver.vehicle.vehicleType} (
                        {route.driver.vehicle.engineType})
                      </CardTitle>
                      <div className="text-sm text-muted-foreground">
                        Warehouse: {route.warehouse.name} · Total stops: {route.totals.totalStops}
                      </div>
                    </div>
                    <div className="flex flex-col items-start gap-2 sm:items-end">
                      <RiskBadge
                        risk={route.driver.vehicle.riskLevel}
                        vqi={route.driver.vehicle.vqi}
                      />
                      <Badge variant="secondary">
                        Progress {route.totals.deliveredStops}/{route.totals.totalStops} · {route.totals.progressPercent}%
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-lg border p-3">
                      <div className="text-xs text-muted-foreground">Distance</div>
                      <div className="mt-1 text-lg font-bold">{route.totals.totalDistanceKm} km</div>
                    </div>
                    <div className="rounded-lg border p-3">
                      <div className="text-xs text-muted-foreground">Duration</div>
                      <div className="mt-1 text-lg font-bold">
                        {Math.floor(route.totals.totalDurationMin / 60)} h{" "}
                        {Math.round(route.totals.totalDurationMin % 60)} min
                      </div>
                    </div>
                    <div className="rounded-lg border p-3">
                      <div className="text-xs text-muted-foreground">Emissions (mock)</div>
                      <div className="mt-1 text-lg font-bold">
                        {route.totals.estimatedEmissionsKg} kg CO₂e
                      </div>
                    </div>
                  </div>

                  {route.nextStop && (
                    <div className="rounded-lg bg-muted p-3 text-sm">
                      <div className="font-medium">Next stop</div>
                      <div className="text-muted-foreground">
                        {route.nextStop.recipientAddress} · ETA:{" "}
                        {formatDateTime(route.nextStop.etaAt)} · Current status:{" "}
                        {route.nextStop.orderStatus}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="text-sm font-semibold">Route waypoints (sorted)</div>
                    <div className="space-y-2">
                      {route.stops.map((s) => (
                        <div
                          key={s.orderId}
                          className="flex items-start justify-between gap-3 rounded-md border p-3"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold">#{s.sequence}</span>
                              <span className="truncate text-sm font-medium">
                                {s.recipientAddress}
                              </span>
                              <Badge
                                variant={
                                  s.orderStatus === "DELIVERED"
                                    ? "default"
                                    : s.orderStatus === "ETA"
                                    ? "secondary"
                                    : "outline"
                                }
                                className="capitalize"
                              >
                                {s.orderStatus}
                              </Badge>
                            </div>
                            <div className="mt-1 text-xs text-muted-foreground">
                              ETA: {formatDateTime(s.etaAt)} · Leg: {s.distanceKm} km /{" "}
                              {Math.round(s.durationMin)} min
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => void setDelivered(s.orderId)}
                              disabled={loading || s.orderStatus === "DELIVERED"}
                            >
                              Mark delivered
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

