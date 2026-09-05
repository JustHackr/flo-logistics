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
import { RouteMapView, GoogleMapsProvider } from "@/components/routing/route-map-view";
import { DtiBadge } from "@/components/dti-badge";
import { CfiBadge } from "@/components/cfi-badge";
import { LogisticsChartsPanel } from "@/components/routing/logistics-charts";
import { RouteTotalsMetricGrid } from "@/components/routing/route-totals-metric-grid";
import { CvSessionReportsPanel } from "@/components/computer-vision/cv-session-reports-panel";
import { useI18n } from "@/components/i18n/use-i18n";
import { toIntlLocale, type Locale } from "@/lib/i18n/config";
import type { TranslationParams } from "@/lib/i18n/t";

type DriverInfo = RoutingLogisticsOverview["roster"][number];

function formatDateTime(iso: string | null | undefined, locale: Locale) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(toIntlLocale(locale), {
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
  t,
  locale,
}: {
  title: string;
  driver: DriverInfo;
  t: (key: string, params?: TranslationParams) => string;
  locale: Locale;
}) {
  return (
    <div className="rounded-lg border p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-sm font-semibold">{title}</div>
          <div className="mt-1 text-base font-bold">{driver.name}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            {driver.employeeId ?? t("routing.dashboard.noEmployeeId")} ·{" "}
            {driver.phone ?? t("common.noPhone")}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {t("routing.dashboard.licenseStatus", {
              license: driver.licenseNumber ?? "—",
            })}{" "}
            <span className="capitalize">{driver.status}</span>
          </div>
        </div>
        <RiskBadge risk={driver.vehicle.riskLevel} vqi={driver.vehicle.vqi} />
      </div>
      <div className="mt-3 rounded-md bg-muted/50 p-3">
        <div className="text-sm font-medium">{driver.vehicle.name}</div>
        <div className="mt-2 grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
          <div>
            {t("routing.dashboard.typeLabel")}{" "}
            <span className="font-medium text-foreground capitalize">
              {driver.vehicle.vehicleType}
            </span>
          </div>
          <div>
            {t("routing.dashboard.engineLabel")}{" "}
            <span className="font-medium text-foreground uppercase">
              {driver.vehicle.engineType}
            </span>
          </div>
          <div>
            {t("routing.dashboard.odometerLabel")}{" "}
            <span className="font-medium text-foreground">
              {t("common.kmValue", {
                value: formatNumber(driver.vehicle.odometerKm, 0, locale),
              })}
            </span>
          </div>
          <div>
            {t("routing.dashboard.ageLabel")}{" "}
            <span className="font-medium text-foreground">
              {formatNumber(driver.vehicle.vehicleAgeYears, 1, locale)}{" "}
              {t("common.yearShort")}
            </span>
          </div>
          <div>
            {t("routing.dashboard.maintCostLabel")}{" "}
            <span className="font-medium text-foreground">
              {formatCurrency(driver.vehicle.maintenanceCostUnit, locale)}
            </span>
          </div>
          <div>
            {t("routing.dashboard.vqiLabel")}{" "}
            <span className="font-medium text-foreground">{driver.vehicle.vqi}/100</span>
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
  const { t, locale } = useI18n();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<RoutingLogisticsOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/routing/logistics/overview");
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? t("routing.dashboard.loadFailed"));
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("routing.dashboard.loadFailed"));
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
      if (!res.ok) throw new Error(json?.error ?? t("routing.dashboard.updateFailed"));
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("routing.dashboard.updateFailed"));
      setLoading(false);
    }
  }

  const pipelineLabels = [
    ["RECEIVED", t("routing.dashboard.statusReceived")],
    ["PREPARING", t("routing.dashboard.statusPreparing")],
    ["ON_ROUTE", t("routing.dashboard.statusOnRoute")],
    ["DELIVERED", t("routing.dashboard.statusDelivered")],
  ] as const;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {t("routing.dashboard.title")}
          </h2>
          <p className="text-muted-foreground">{t("routing.dashboard.subtitle")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" render={<Link href="/routing/reports" />}>
            <FileBarChart className="mr-2 h-4 w-4" />
            {t("routing.dashboard.reports")}
          </Button>
          <Button variant="outline" onClick={() => void load()} disabled={loading}>
            {t("common.refresh")}
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {!data && loading && (
        <div className="text-sm text-muted-foreground">{t("routing.dashboard.loading")}</div>
      )}

      {data && (
        <>
          <CvSessionReportsPanel
            title={t("routing.dashboard.cvTitle")}
            description={t("routing.dashboard.cvDescription")}
          />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t("routing.dashboard.activeRoutes")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{data.operations.inProgressRoutes}</div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("routing.dashboard.routeCounts", {
                    planned: data.routeCounts.planned,
                    completed: data.routeCounts.completed,
                  })}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t("routing.dashboard.deliveryProgress")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{data.operations.deliveryProgressPercent}%</div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("routing.dashboard.stopsDetail", {
                    delivered: data.operations.deliveredStops,
                    total: data.operations.totalDeliveryStops,
                  })}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t("routing.dashboard.distanceActive")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {t("common.kmValue", { value: data.operations.totalDistanceKm })}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("routing.dashboard.driveTime", {
                    hours: Math.floor(data.operations.totalDurationMin / 60),
                    minutes: data.operations.totalDurationMin % 60,
                  })}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t("routing.dashboard.emissionsActive")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {t("common.kgValue", { value: data.operations.totalEmissionsKg })}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("routing.dashboard.co2Estimated")}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t("routing.dashboard.avgDti")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{data.operations.avgDti ?? "—"}</div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("routing.dashboard.scoredDeliveries", {
                    count: data.operations.deliveredOrdersWithDti,
                  })}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t("routing.dashboard.avgCfi")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{data.operations.avgCfi ?? "—"}</div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("routing.dashboard.ordersOnRoute", {
                    count: data.operations.ordersOnRoute,
                  })}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t("routing.dashboard.tripFuelCost")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {formatCurrencyShort(data.operations.totalFuelCostIdr, locale)}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("routing.dashboard.activeRoutesShort")}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t("routing.dashboard.fuelSavings")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {formatCurrencyShort(data.operations.totalFuelCostSavingsIdr, locale)}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("routing.dashboard.fuelSavingsDetail", {
                    percent: data.operations.totalFuelCostSavingsPercent,
                  })}
                </p>
              </CardContent>
            </Card>
          </div>

          {data.fuelPrices && (
            <p className="text-xs text-muted-foreground">
              {t("routing.dashboard.fuelPrices", {
                region: data.fuelPrices.region,
                time: formatDateTime(data.fuelPrices.fetchedAt, locale),
              })}
              {data.fuelPrices.effectiveLabel
                ? t("routing.dashboard.fuelPricesEffective", {
                    label: data.fuelPrices.effectiveLabel,
                  })
                : ""}
              {" · "}
              <Link href="/system/gas-price" className="font-medium underline">
                {t("routing.dashboard.gasPriceList")}
              </Link>
            </p>
          )}

          <LogisticsChartsPanel charts={data.report.charts} compact />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {pipelineLabels.map(([key, label]) => (
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
                <CardTitle>{t("routing.dashboard.rosterTitle")}</CardTitle>
                <Link href="/routing/drivers" className="text-sm font-medium text-primary hover:underline">
                  {t("routing.dashboard.manageDrivers")}
                </Link>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              {(data.roster ?? []).map((driver) => (
                <DriverVehicleCard
                  key={driver.id}
                  title={t("routing.dashboard.courierDriver")}
                  driver={driver}
                  t={t}
                  locale={locale}
                />
              ))}
              {(data.roster ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground">
                  {t("routing.dashboard.noDriversSeeded")}
                </p>
              )}
            </CardContent>
          </Card>

          <GoogleMapsProvider>
            <div className="space-y-4">
              {data.activeRoutes.length === 0 && (
                <div className="text-sm text-muted-foreground">
                  {t("routing.dashboard.noRoutes", {
                    orders: t("routing.dashboard.ordersLink"),
                  })}
                </div>
              )}

              {data.activeRoutes.map((route) => (
              <Card key={route.routePlanId}>
                <CardHeader>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <CardTitle className="text-base">
                        {t("routing.dashboard.routeFor", { name: route.driver.name })}
                      </CardTitle>
                      <div className="text-sm text-muted-foreground">
                        {t("routing.dashboard.warehouseStops", {
                          warehouse: route.warehouse.name,
                          stops: route.totals.totalStops,
                        })}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">
                      {t("routing.dashboard.progressBadge", {
                        delivered: route.totals.deliveredStops,
                        total: route.totals.totalStops,
                        percent: route.totals.progressPercent,
                      })}
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
                    title={t("routing.dashboard.assignedDriverVehicle")}
                    driver={route.driver}
                    t={t}
                    locale={locale}
                  />

                  <RouteTotalsMetricGrid route={route} />

                  {route.nextStop && (
                    <div className="rounded-lg bg-muted p-3 text-sm">
                      <div className="font-medium">{t("routing.dashboard.nextStop")}</div>
                      <div className="text-muted-foreground">
                        {t("routing.dashboard.nextStopDetail", {
                          address: route.nextStop.recipientAddress,
                          eta: formatDateTime(route.nextStop.etaAt, locale),
                          status: route.nextStop.orderStatus,
                        })}
                      </div>
                    </div>
                  )}

                  {(route.waypoints ?? []).length > 0 && (
                    <RouteMapView
                      waypoints={route.waypoints}
                      encodedPolyline={route.encodedPolyline}
                      className="h-64"
                    />
                  )}

                  <div className="space-y-2">
                    <div className="text-sm font-semibold">
                      {t("routing.dashboard.waypointsTitle")}
                    </div>
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
                                  {t("routing.dashboard.markDelivered")}
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
          </GoogleMapsProvider>
        </>
      )}
    </div>
  );
}
