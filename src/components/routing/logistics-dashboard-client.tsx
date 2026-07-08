"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FileBarChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RiskBadge } from "@/components/risk-badge";
import { formatCurrency, formatCurrencyShort, formatNumber } from "@/lib/format";
import type { RoutingLogisticsOverview } from "@/lib/routing-overview";
import { RouteWaypointRow } from "@/components/routing/plan-preview-utils";
import { RouteMapView } from "@/components/routing/route-map-view";
import { DtiBadge } from "@/components/dti-badge";
import { CfiBadge } from "@/components/cfi-badge";
import { LogisticsChartsPanel } from "@/components/routing/logistics-charts";

type DriverInfo = RoutingLogisticsOverview["roster"][number];

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

function DriverVehicleCard({
  title,
  driver,
}: {
  title: string;
  driver: DriverInfo;
}) {
  return (
    <div className="rounded-lg border p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-sm font-semibold">{title}</div>
          <div className="mt-1 text-base font-bold">{driver.name}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            {driver.employeeId ?? "No employee ID"} · {driver.phone ?? "No phone"}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            License: {driver.licenseNumber ?? "—"} · Status:{" "}
            <span className="capitalize">{driver.status}</span>
          </div>
        </div>
        <RiskBadge risk={driver.vehicle.riskLevel} vqi={driver.vehicle.vqi} />
      </div>
      <div className="mt-3 rounded-md bg-muted/50 p-3">
        <div className="text-sm font-medium">{driver.vehicle.name}</div>
        <div className="mt-2 grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
          <div>
            Type: <span className="font-medium text-foreground capitalize">{driver.vehicle.vehicleType}</span>
          </div>
          <div>
            Engine: <span className="font-medium text-foreground uppercase">{driver.vehicle.engineType}</span>
          </div>
          <div>
            Odometer: <span className="font-medium text-foreground">{formatNumber(driver.vehicle.odometerKm)} km</span>
          </div>
          <div>
            Age: <span className="font-medium text-foreground">{formatNumber(driver.vehicle.vehicleAgeYears, 1)} yr</span>
          </div>
          <div>
            Maint. cost: <span className="font-medium text-foreground">{formatCurrency(driver.vehicle.maintenanceCostUnit)}</span>
          </div>
          <div>
            VQI: <span className="font-medium text-foreground">{driver.vehicle.vqi}/100</span>
          </div>
        </div>
        {driver.vehicle.recommendedAction && (
          <p className="mt-2 text-xs text-muted-foreground">
            {driver.vehicle.recommendedAction}
          </p>
        )}
      </div>
    </div>
  );
}

export function LogisticsDashboardClient() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<RoutingLogisticsOverview | null>(null);
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
            Track driver identity, assigned vehicles, route progress, and delivery status from Blok M Square.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" render={<Link href="/routing/reports" />}>
            <FileBarChart className="mr-2 h-4 w-4" />
            Reports
          </Button>
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Active Routes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{data.operations.inProgressRoutes}</div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {data.routeCounts.planned} planned · {data.routeCounts.completed} completed
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Delivery Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{data.operations.deliveryProgressPercent}%</div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {data.operations.deliveredStops}/{data.operations.totalDeliveryStops} stops
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Distance (active)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{data.operations.totalDistanceKm} km</div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {Math.floor(data.operations.totalDurationMin / 60)} h{" "}
                  {data.operations.totalDurationMin % 60} min drive
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Emissions (active)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{data.operations.totalEmissionsKg} kg</div>
                <p className="mt-1 text-xs text-muted-foreground">CO₂e estimated</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Avg DTI
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{data.operations.avgDti ?? "—"}</div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {data.operations.deliveredOrdersWithDti} scored deliveries
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Avg CFI
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{data.operations.avgCfi ?? "—"}</div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {data.operations.ordersOnRoute} orders on route
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Trip Fuel Cost
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {formatCurrencyShort(data.operations.totalFuelCostIdr)}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Active routes</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Fuel Savings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {formatCurrencyShort(data.operations.totalFuelCostSavingsIdr)}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {data.operations.totalFuelCostSavingsPercent}% vs naive trips
                </p>
              </CardContent>
            </Card>
          </div>

          {data.fuelPrices && (
            <p className="text-xs text-muted-foreground">
              Pertamina prices · {data.fuelPrices.region} · fetched{" "}
              {formatDateTime(data.fuelPrices.fetchedAt)}
              {data.fuelPrices.effectiveLabel
                ? ` · effective ${data.fuelPrices.effectiveLabel}`
                : ""}
              {" · "}
              <Link href="/system/gas-price" className="font-medium underline">
                Gas price list
              </Link>
            </p>
          )}

          <LogisticsChartsPanel charts={data.report.charts} compact />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {(
              [
                ["RECEIVED", "Received"],
                ["PREPARING", "Preparing"],
                ["ON_ROUTE", "On route"],
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

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle>Driver roster & assigned vehicles</CardTitle>
                <Link href="/routing/drivers" className="text-sm font-medium text-primary hover:underline">
                  Manage drivers
                </Link>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              {(data.roster ?? []).map((driver) => (
                <DriverVehicleCard
                  key={driver.id}
                  title="Courier / driver"
                  driver={driver}
                />
              ))}
              {(data.roster ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No drivers seeded yet. Run `npm run db:seed`.
                </p>
              )}
            </CardContent>
          </Card>

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
                        Route for {route.driver.name}
                      </CardTitle>
                      <div className="text-sm text-muted-foreground">
                        Warehouse: {route.warehouse.name} · Stops: {route.totals.totalStops}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">
                      Progress {route.totals.deliveredStops}/{route.totals.totalStops} · {route.totals.progressPercent}%
                    </Badge>
                    {route.totals.avgDti != null && (
                      <DtiBadge score={route.totals.avgDti} risk={route.totals.avgDti >= 70 ? "low" : route.totals.avgDti >= 40 ? "medium" : "high"} />
                    )}
                    <CfiBadge score={route.totals.routeCfi} engineType={route.driver.vehicle.engineType} />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <DriverVehicleCard
                    title="Assigned driver & vehicle"
                    driver={route.driver}
                  />

                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
                      <div className="text-xs text-muted-foreground">Emissions</div>
                      <div className="mt-1 text-lg font-bold">
                        {route.totals.estimatedEmissionsKg} kg CO₂e
                      </div>
                    </div>
                    <div className="rounded-lg border p-3">
                      <div className="text-xs text-muted-foreground">Fuel cost</div>
                      <div className="mt-1 text-lg font-bold">
                        {formatCurrency(route.totals.fuelCostIdr)}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {route.totals.fuelProductName} · save{" "}
                        {formatCurrencyShort(route.totals.fuelCostSavingsIdr)} (
                        {route.totals.fuelCostSavingsPercent}%)
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

                  {(route.waypoints ?? []).length > 0 && (
                    <RouteMapView waypoints={route.waypoints} className="h-64" />
                  )}

                  <div className="space-y-2">
                    <div className="text-sm font-semibold">Route waypoints (sorted)</div>
                    <div className="space-y-2">
                      {(route.waypoints ?? []).map((wp) => (
                        <RouteWaypointRow
                          key={`${route.routePlanId}-${wp.stopType}-${wp.sequence}-${wp.stopType === "delivery" ? wp.orderId : wp.role}`}
                          waypoint={wp}
                          action={
                            wp.stopType === "delivery" ? (
                              <>
                                <Badge
                                  variant={
                                    wp.orderStatus === "DELIVERED"
                                      ? "default"
                                      : wp.orderStatus === "ON_ROUTE"
                                      ? "secondary"
                                      : "outline"
                                  }
                                  className="capitalize"
                                >
                                  {wp.orderStatus}
                                </Badge>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => void setDelivered(wp.orderId)}
                                  disabled={loading || wp.orderStatus === "DELIVERED"}
                                >
                                  Mark delivered
                                </Button>
                              </>
                            ) : undefined
                          }
                        />
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
