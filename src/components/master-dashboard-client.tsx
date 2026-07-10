"use client";

import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { RiskBadge } from "@/components/risk-badge";
import { LogisticsChartsPanel } from "@/components/routing/logistics-charts";
import { formatCurrencyShort, formatDate } from "@/lib/format";
import { DTI_PENALTY_PER_MIN } from "@/lib/routing/dti";
import { RISK_THRESHOLDS } from "@/lib/vqi";
import { cn } from "@/lib/utils";
import type { MasterOverview } from "@/lib/master-overview";

const PIPELINE_LABELS: Record<string, string> = {
  RECEIVED: "Received",
  PREPARING: "Preparing",
  ON_ROUTE: "On route",
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
  helpText,
}: {
  title: string;
  value: string | number;
  detail?: string;
  helpText?: string;
}) {
  const card = (
    <Card
      className={cn(
        "h-full",
        helpText && "transition-colors hover:bg-muted/40"
      )}
    >
      <CardHeader className="pb-0">
        <CardTitle className="min-h-[2.5rem] text-sm font-medium leading-snug text-muted-foreground">
          <span className="line-clamp-2">{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 pt-2">
        <p className="flex h-9 items-end text-2xl font-bold leading-none tabular-nums">
          {value}
        </p>
        <p
          className={cn(
            "min-h-[2.5rem] text-xs leading-snug text-muted-foreground",
            !detail && "invisible"
          )}
        >
          <span className="line-clamp-2">{detail ?? "\u00a0"}</span>
        </p>
      </CardContent>
    </Card>
  );

  if (!helpText) return card;

  return (
    <Tooltip>
      <TooltipTrigger
        className="block h-full w-full cursor-help rounded-xl text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        delay={200}
      >
        {card}
      </TooltipTrigger>
      <TooltipContent
        side="top"
        align="start"
        className="max-w-sm whitespace-normal px-3 py-2 text-left leading-relaxed"
      >
        {helpText}
      </TooltipContent>
    </Tooltip>
  );
}

const METRIC_HELP = {
  activeRoutes:
    "Count of route plans with status IN_PROGRESS — routes currently being executed by drivers.",
  totalRoutes:
    "Total route plans in the system: PLANNED + IN_PROGRESS + COMPLETED.",
  deliveryProgress:
    "Delivered stops ÷ total stops across all active routes × 100. A stop counts as delivered when its order status is DELIVERED.",
  ordersOnRoute:
    "Orders with status ON_ROUTE — assigned to a route, departed, and not yet delivered.",
  totalOrders: "Sum of orders across all pipeline stages (Received through Delivered).",
  activeDistance:
    "Σ totalDistanceKm for IN_PROGRESS routes. Distance comes from optimized nearest-neighbor TSP legs (warehouse → stops → warehouse).",
  activeDuration:
    "Σ totalDurationMin for IN_PROGRESS routes. Includes drive time (OSRM/Google + Jakarta traffic model) plus per-stop service time.",
  activeEmissions:
    "Σ estimatedEmissionsKg for IN_PROGRESS routes. CO₂e ≈ distance × engine factor (EV 0.05, gasoline 0.15, diesel 0.22 kg/km).",
  avgDti: `Mean Delivery Trip Index across delivered orders with complete timestamps. DTI = 100 − min(100, max(0, slackMin) × ${DTI_PENALTY_PER_MIN}) where slack = actualLead − plannedLead (receivedAt → deliveredAt vs planned ETA).`,
  avgCfi:
    "Mean Carbon Footprint Index across active and completed routes. CFI = 100 × (dieselKg − actualKg) ÷ (dieselKg − evKg) on the same distance. 100 = EV-equivalent, 0 = diesel.",
  activeDrivers: "Number of drivers in the roster (each linked to one fleet vehicle).",
  tripFuelCost:
    "Σ trip fuel cost for IN_PROGRESS routes. ICE: (distance ÷ km/L) × Pertamina price; EV: distance × kWh/km × PLN rate. Product matched by vehicle type + engine.",
  fuelSavings:
    "Σ fuel savings vs naive baseline for IN_PROGRESS routes. Baseline = separate warehouse round-trip per stop (2 × distance × 1.35). Savings = baseline cost − optimized route cost.",
  pipelineReceived: "Orders with status RECEIVED — accepted, awaiting warehouse prep.",
  pipelinePreparing: "Orders with status PREPARING — being packed at the warehouse.",
  pipelineOnRoute:
    "Orders with status ON_ROUTE — assigned to a route and en route to the recipient.",
  pipelineDelivered: "Orders with status DELIVERED — confirmed handover to recipient.",
  totalVehicles: "Total vehicles registered in the fleet database.",
  avgVqi:
    "Mean Vehicle Quality Index. VQI = 100 − (age + odometer + cost + planning penalties). Higher is healthier; max penalty per factor is capped at 30/30/20/20 pts.",
  highRisk: `Vehicles with VQI below ${RISK_THRESHOLDS.highBelow} — prioritize maintenance or replacement.`,
  mediumRisk: `Vehicles with VQI ${RISK_THRESHOLDS.highBelow}–${RISK_THRESHOLDS.lowAbove} — schedule inspection soon.`,
  lowRisk: `Vehicles with VQI above ${RISK_THRESHOLDS.lowAbove} — within acceptable health range.`,
  upcomingMaintenance:
    "Sum of estimated next-service costs for vehicles with predicted maintenance within the next 90 days.",
  fleetMaintenanceBudget:
    "Sum of maintenanceCostUnit across all vehicles — total recorded maintenance spend per fleet unit.",
} as const;

const PIPELINE_HELP: Record<
  "RECEIVED" | "PREPARING" | "ON_ROUTE" | "DELIVERED",
  string
> = {
  RECEIVED: METRIC_HELP.pipelineReceived,
  PREPARING: METRIC_HELP.pipelinePreparing,
  ON_ROUTE: METRIC_HELP.pipelineOnRoute,
  DELIVERED: METRIC_HELP.pipelineDelivered,
};

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
        <div className="grid auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 [&>*]:h-full">
          <MetricCard
            title="Active Routes"
            value={data.operations.inProgressRoutes}
            detail={`${data.routeCounts.planned} planned · ${data.routeCounts.completed} completed`}
            helpText={METRIC_HELP.activeRoutes}
          />
          <MetricCard
            title="Total Routes"
            value={data.routeCounts.total}
            detail="All route plans"
            helpText={METRIC_HELP.totalRoutes}
          />
          <MetricCard
            title="Delivery Progress"
            value={`${data.operations.deliveryProgressPercent}%`}
            detail={`${data.operations.deliveredStops}/${data.operations.totalDeliveryStops} stops`}
            helpText={METRIC_HELP.deliveryProgress}
          />
          <MetricCard
            title="Orders On Route"
            value={data.operations.ordersOnRoute}
            detail="ON_ROUTE status"
            helpText={METRIC_HELP.ordersOnRoute}
          />
          <MetricCard
            title="Total Orders"
            value={data.totalOrders}
            detail="All pipeline stages"
            helpText={METRIC_HELP.totalOrders}
          />
          <MetricCard
            title="Active Distance"
            value={`${data.operations.totalDistanceKm} km`}
            detail="In-progress routes"
            helpText={METRIC_HELP.activeDistance}
          />
          <MetricCard
            title="Active Duration"
            value={formatDuration(data.operations.totalDurationMin)}
            detail="Estimated drive time"
            helpText={METRIC_HELP.activeDuration}
          />
          <MetricCard
            title="Active Emissions"
            value={`${data.operations.totalEmissionsKg} kg`}
            detail="CO₂e estimated"
            helpText={METRIC_HELP.activeEmissions}
          />
          <MetricCard
            title="Avg DTI"
            value={data.operations.avgDti ?? "—"}
            detail={`${data.operations.deliveredOrdersWithDti} scored deliveries`}
            helpText={METRIC_HELP.avgDti}
          />
          <MetricCard
            title="Avg CFI"
            value={data.operations.avgCfi ?? "—"}
            detail="100 = EV-equivalent"
            helpText={METRIC_HELP.avgCfi}
          />
          <MetricCard
            title="Active Drivers"
            value={data.driverCount}
            detail="Assigned couriers"
            helpText={METRIC_HELP.activeDrivers}
          />
          <MetricCard
            title="Trip Fuel Cost"
            value={formatCurrencyShort(data.operations.totalFuelCostIdr)}
            detail={
              data.fuelPrices
                ? `Pertamina ${data.fuelPrices.region}`
                : "Active routes"
            }
            helpText={METRIC_HELP.tripFuelCost}
          />
          <MetricCard
            title="Fuel Savings"
            value={formatCurrencyShort(data.operations.totalFuelCostSavingsIdr)}
            detail={`${data.operations.totalFuelCostSavingsPercent}% vs naive round trips`}
            helpText={METRIC_HELP.fuelSavings}
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
        <div className="grid auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-4 [&>*]:h-full">
          {(
            [
              ["RECEIVED", "Received"],
              ["PREPARING", "Preparing"],
              ["ON_ROUTE", "On route"],
              ["DELIVERED", "Delivered"],
            ] as const
          ).map(([key, label]) => (
            <MetricCard
              key={key}
              title={label}
              value={data.pipeline[key] ?? 0}
              helpText={PIPELINE_HELP[key]}
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
        <div className="grid auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 [&>*]:h-full">
          <MetricCard
            title="Total Vehicles"
            value={data.fleetHealth.totalVehicles}
            detail="Entire fleet"
            helpText={METRIC_HELP.totalVehicles}
          />
          <MetricCard
            title="Avg Fleet VQI"
            value={data.fleetHealth.avgVqi}
            detail="Vehicle quality index"
            helpText={METRIC_HELP.avgVqi}
          />
          <MetricCard
            title="High Risk"
            value={data.fleetHealth.highRiskCount}
            detail="VQI below 40"
            helpText={METRIC_HELP.highRisk}
          />
          <MetricCard
            title="Medium Risk"
            value={data.fleetHealth.mediumRiskCount}
            detail="VQI 40–70"
            helpText={METRIC_HELP.mediumRisk}
          />
          <MetricCard
            title="Low Risk"
            value={data.fleetHealth.lowRiskCount}
            detail="VQI above 70"
            helpText={METRIC_HELP.lowRisk}
          />
          <MetricCard
            title="90-Day Maint. Cost"
            value={formatCurrencyShort(data.fleetHealth.upcomingMaintenanceCost)}
            detail={`${data.fleetHealth.upcomingMaintenanceCount} vehicles due`}
            helpText={METRIC_HELP.upcomingMaintenance}
          />
          <MetricCard
            title="Fleet Maint. Budget"
            value={formatCurrencyShort(data.fleetHealth.totalMaintenanceCost)}
            detail="Sum of unit costs"
            helpText={METRIC_HELP.fleetMaintenanceBudget}
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
                  <RechartsTooltip />
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
                  <RechartsTooltip />
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
