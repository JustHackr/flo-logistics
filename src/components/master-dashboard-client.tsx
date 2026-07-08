"use client";

import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RiskBadge } from "@/components/risk-badge";
import { LogisticsChartsPanel } from "@/components/routing/logistics-charts";
import { formatCurrencyShort, formatDate } from "@/lib/format";
import type { MasterOverview } from "@/lib/master-overview";

const PIPELINE_LABELS: Record<string, string> = {
  RECEIVED: "Received",
  PREPARING: "Preparing",
  ON_ROUTE: "On route",
  ETA: "ETA",
  DELIVERED: "Delivered",
};

function formatDateTime(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("id-ID", {
    hour12: false,
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(totalMin: number) {
  if (!Number.isFinite(totalMin)) return "—";
  const hours = Math.floor(totalMin / 60);
  const minutes = Math.round(totalMin % 60);
  if (hours <= 0) return `${minutes} min`;
  return `${hours} h ${minutes} min`;
}

function MetricCard({
  title,
  value,
  detail,
}: {
  title: string;
  value: string | number;
  detail?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold">{value}</p>
        {detail && (
          <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
        )}
      </CardContent>
    </Card>
  );
}

function SectionHeader({
  title,
  description,
  href,
  linkLabel,
}: {
  title: string;
  description: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {href && linkLabel && (
        <Button variant="outline" size="sm" render={<Link href={href} />}>
          {linkLabel}
        </Button>
      )}
    </div>
  );
}

export function MasterDashboardClient({ data }: { data: MasterOverview }) {
  const pipelineChartData = Object.entries(data.pipeline).map(([key, count]) => ({
    stage: PIPELINE_LABELS[key] ?? key,
    count,
  }));

  const hasRoutes = data.routeCounts.total > 0;
  const hasOrders = data.totalOrders > 0;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Overview</h2>
        <p className="text-muted-foreground">
          High-level visibility across logistics operations, fleet health, and
          delivery performance.
        </p>
      </div>

      <section className="space-y-4">
        <SectionHeader
          title="Logistics Operations"
          description="Routing, delivery progress, and environmental impact."
          href="/routing/dashboard"
          linkLabel="Logistics dashboard"
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <MetricCard
            title="Active Routes"
            value={data.operations.inProgressRoutes}
            detail={`${data.routeCounts.planned} planned · ${data.routeCounts.completed} completed`}
          />
          <MetricCard
            title="Total Routes"
            value={data.routeCounts.total}
            detail="All route plans"
          />
          <MetricCard
            title="Delivery Progress"
            value={`${data.operations.deliveryProgressPercent}%`}
            detail={`${data.operations.deliveredStops}/${data.operations.totalDeliveryStops} stops`}
          />
          <MetricCard
            title="Orders On Route"
            value={data.operations.ordersOnRoute}
            detail="ON_ROUTE + ETA status"
          />
          <MetricCard
            title="Total Orders"
            value={data.totalOrders}
            detail="All pipeline stages"
          />
          <MetricCard
            title="Active Distance"
            value={`${data.operations.totalDistanceKm} km`}
            detail="In-progress routes"
          />
          <MetricCard
            title="Active Duration"
            value={formatDuration(data.operations.totalDurationMin)}
            detail="Estimated drive time"
          />
          <MetricCard
            title="Active Emissions"
            value={`${data.operations.totalEmissionsKg} kg`}
            detail="CO₂e estimated"
          />
          <MetricCard
            title="Avg DTI"
            value={data.operations.avgDti ?? "—"}
            detail={`${data.operations.deliveredOrdersWithDti} scored deliveries`}
          />
          <MetricCard
            title="Avg CFI"
            value={data.operations.avgCfi ?? "—"}
            detail="100 = EV-equivalent"
          />
          <MetricCard
            title="Active Drivers"
            value={data.driverCount}
            detail="Assigned couriers"
          />
          <MetricCard
            title="Trip Fuel Cost"
            value={formatCurrencyShort(data.operations.totalFuelCostIdr)}
            detail={
              data.fuelPrices
                ? `Pertamina ${data.fuelPrices.region}`
                : "Active routes"
            }
          />
          <MetricCard
            title="Fuel Savings"
            value={formatCurrencyShort(data.operations.totalFuelCostSavingsIdr)}
            detail={`${data.operations.totalFuelCostSavingsPercent}% vs naive round trips`}
          />
        </div>
        {data.fuelPrices && (
          <p className="text-xs text-muted-foreground">
            Fuel prices fetched {formatDateTime(data.fuelPrices.fetchedAt)}
            {data.fuelPrices.effectiveLabel
              ? ` · effective ${data.fuelPrices.effectiveLabel}`
              : ""}
            {" · "}
            <Link href="/system/gas-price" className="font-medium underline">
              View gas price list
            </Link>
          </p>
        )}
      </section>

      <section className="space-y-4">
        <SectionHeader
          title="Order Pipeline"
          description="Orders by fulfillment stage."
          href="/routing/orders"
          linkLabel="View orders"
        />
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
            <MetricCard
              key={key}
              title={label}
              value={data.pipeline[key] ?? 0}
            />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <SectionHeader
          title="Fleet Health"
          description="Predictive maintenance and vehicle quality."
          href="/dashboard"
          linkLabel="Maintenance dashboard"
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <MetricCard
            title="Total Vehicles"
            value={data.fleetHealth.totalVehicles}
            detail="Entire fleet"
          />
          <MetricCard
            title="Avg Fleet VQI"
            value={data.fleetHealth.avgVqi}
            detail="Vehicle quality index"
          />
          <MetricCard
            title="High Risk"
            value={data.fleetHealth.highRiskCount}
            detail="VQI below 40"
          />
          <MetricCard
            title="Medium Risk"
            value={data.fleetHealth.mediumRiskCount}
            detail="VQI 40–70"
          />
          <MetricCard
            title="Low Risk"
            value={data.fleetHealth.lowRiskCount}
            detail="VQI above 70"
          />
          <MetricCard
            title="90-Day Maint. Cost"
            value={formatCurrencyShort(data.fleetHealth.upcomingMaintenanceCost)}
            detail={`${data.fleetHealth.upcomingMaintenanceCount} vehicles due`}
          />
          <MetricCard
            title="Fleet Maint. Budget"
            value={formatCurrencyShort(data.fleetHealth.totalMaintenanceCost)}
            detail="Sum of unit costs"
          />
        </div>
      </section>

      {!hasOrders && !hasRoutes && (
        <Card>
          <CardContent className="py-6">
            <p className="text-sm text-muted-foreground">
              No routing data yet. Import orders from{" "}
              <Link href="/routing/orders" className="font-medium text-foreground underline">
                Routing Orders
              </Link>{" "}
              or generate sample data from{" "}
              <Link href="/admin/mockup-data" className="font-medium text-foreground underline">
                Mockup Data
              </Link>
              .
            </p>
          </CardContent>
        </Card>
      )}

      <section className="space-y-4">
        <SectionHeader
          title="Operations Charts"
          description="Pipeline, routes, DTI, CFI, emissions, and driver VQI."
          href="/routing/reports"
          linkLabel="Full reports"
        />
        <LogisticsChartsPanel charts={data.charts} compact />
      </section>

      <section className="space-y-4">
        <SectionHeader
          title="Fleet Charts"
          description="VQI distribution across the fleet."
          href="/reports"
          linkLabel="Maintenance reports"
        />
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">VQI Distribution</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.fleetHealth.vqiDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="range" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Order Pipeline</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pipelineChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="stage" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="space-y-4">
        <SectionHeader
          title="Needs Attention"
          description="Active routes and vehicles requiring follow-up."
        />
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Active Routes</CardTitle>
              <Button variant="outline" size="sm" render={<Link href="/routing/dashboard" />}>
                View all
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.attentionRoutes.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No active or planned routes. Optimize orders to create a route plan.
                </p>
              ) : (
                data.attentionRoutes.map((route) => (
                  <div key={route.routePlanId} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{route.driverName}</span>
                      <Badge variant="secondary">
                        {route.deliveredStops}/{route.totalStops} · {route.progressPercent}%
                      </Badge>
                    </div>
                    {route.nextStopAddress && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Next: {route.nextStopAddress} · ETA {formatDateTime(route.nextStopEta)}
                      </p>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Fleet Risk</CardTitle>
              <Button variant="outline" size="sm" render={<Link href="/vehicles" />}>
                View fleet
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.highRiskVehicles.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No medium or high-risk vehicles in the top attention list.
                </p>
              ) : (
                data.highRiskVehicles.map((vehicle) => (
                  <div key={vehicle.id} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{vehicle.name}</span>
                      <RiskBadge risk={vehicle.riskLevel} vqi={vehicle.vqi} />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Next maint.: {formatDate(vehicle.predictedNextMaintenance)} · Est.{" "}
                      {formatCurrencyShort(vehicle.estimatedCost)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {vehicle.recommendedAction}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
