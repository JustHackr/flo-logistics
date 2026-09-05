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
import { WelcomeTutorial } from "@/components/welcome-tutorial";
import { LogisticsChartsPanel } from "@/components/routing/logistics-charts";
import { CvSessionReportsPanel } from "@/components/computer-vision/cv-session-reports-panel";
import { useI18n } from "@/components/i18n/use-i18n";
import { formatCurrencyShort, formatDate } from "@/lib/format";
import { DTI_PENALTY_PER_MIN } from "@/lib/routing/dti";
import { RISK_THRESHOLDS } from "@/lib/vqi";
import { cn } from "@/lib/utils";
import type { MasterOverview } from "@/lib/master-overview";
import type { TranslationParams } from "@/lib/i18n/t";

type Translate = (key: string, params?: TranslationParams) => string;

const PIPELINE_KEYS = [
  "RECEIVED",
  "PREPARING",
  "ON_ROUTE",
  "DELIVERED",
] as const;

function pipelineLabelKey(
  key: (typeof PIPELINE_KEYS)[number]
): string {
  switch (key) {
    case "RECEIVED":
      return "home.pipeline.received";
    case "PREPARING":
      return "home.pipeline.preparing";
    case "ON_ROUTE":
      return "home.pipeline.onRoute";
    case "DELIVERED":
      return "home.pipeline.delivered";
  }
}

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

function formatDuration(t: Translate, totalMin: number) {
  if (!Number.isFinite(totalMin)) return "—";
  const hours = Math.floor(totalMin / 60);
  const minutes = Math.round(totalMin % 60);
  if (hours <= 0) return t("common.durationMinutes", { minutes });
  return t("common.durationHoursMinutes", { hours, minutes });
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

function getMetricHelp(t: Translate) {
  return {
    activeRoutes: t("home.metricHelp.activeRoutes"),
    totalRoutes: t("home.metricHelp.totalRoutes"),
    deliveryProgress: t("home.metricHelp.deliveryProgress"),
    ordersOnRoute: t("home.metricHelp.ordersOnRoute"),
    totalOrders: t("home.metricHelp.totalOrders"),
    activeDistance: t("home.metricHelp.activeDistance"),
    activeDuration: t("home.metricHelp.activeDuration"),
    activeEmissions: t("home.metricHelp.activeEmissions"),
    avgDti: t("home.metricHelp.avgDti", { penalty: DTI_PENALTY_PER_MIN }),
    avgCfi: t("home.metricHelp.avgCfi"),
    activeDrivers: t("home.metricHelp.activeDrivers"),
    tripFuelCost: t("home.metricHelp.tripFuelCost"),
    fuelSavings: t("home.metricHelp.fuelSavings"),
    pipelineReceived: t("home.metricHelp.pipelineReceived"),
    pipelinePreparing: t("home.metricHelp.pipelinePreparing"),
    pipelineOnRoute: t("home.metricHelp.pipelineOnRoute"),
    pipelineDelivered: t("home.metricHelp.pipelineDelivered"),
    totalVehicles: t("home.metricHelp.totalVehicles"),
    avgVqi: t("home.metricHelp.avgVqi"),
    highRisk: t("home.metricHelp.highRisk", {
      threshold: RISK_THRESHOLDS.highBelow,
    }),
    mediumRisk: t("home.metricHelp.mediumRisk", {
      highBelow: RISK_THRESHOLDS.highBelow,
      lowAbove: RISK_THRESHOLDS.lowAbove,
    }),
    lowRisk: t("home.metricHelp.lowRisk", {
      threshold: RISK_THRESHOLDS.lowAbove,
    }),
    upcomingMaintenance: t("home.metricHelp.upcomingMaintenance"),
    fleetMaintenanceBudget: t("home.metricHelp.fleetMaintenanceBudget"),
  } as const;
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
  const { t } = useI18n();
  const metricHelp = getMetricHelp(t);

  const pipelineHelp = {
    RECEIVED: metricHelp.pipelineReceived,
    PREPARING: metricHelp.pipelinePreparing,
    ON_ROUTE: metricHelp.pipelineOnRoute,
    DELIVERED: metricHelp.pipelineDelivered,
  } as const;

  const pipelineChartData = Object.entries(data.pipeline).map(([key, count]) => ({
    stage: PIPELINE_KEYS.includes(key as (typeof PIPELINE_KEYS)[number])
      ? t(pipelineLabelKey(key as (typeof PIPELINE_KEYS)[number]))
      : key,
    count,
  }));

  const hasRoutes = data.routeCounts.total > 0;
  const hasOrders = data.totalOrders > 0;
  const isEmpty = !hasOrders && !hasRoutes;

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1.5">
          <h2 className="text-2xl font-semibold tracking-tight">
            {t("home.title")}
          </h2>
          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
            {t("home.subtitle")}
          </p>
        </div>
        <WelcomeTutorial />
      </div>

      {isEmpty && (
        <div className="rounded-xl border border-dashed border-primary/20 bg-primary/[0.03] px-5 py-6">
          <p className="text-sm font-medium text-foreground">
            {t("home.empty.title")}
          </p>
          <p className="mt-1 max-w-lg text-sm text-muted-foreground">
            {t("home.empty.description")}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="sm" render={<Link href="/routing/orders" />}>
              {t("home.empty.importOrders")}
            </Button>
            <Button size="sm" variant="outline" render={<Link href="/routing/plan" />}>
              {t("home.empty.planRoute")}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              render={<Link href="/admin/mockup-data" />}
            >
              {t("home.empty.loadSample")}
            </Button>
          </div>
        </div>
      )}

      <section className="space-y-4">
        <SectionHeader
          title={t("home.sections.atAGlance.title")}
          description={t("home.sections.atAGlance.description")}
        />
        <div className="grid auto-rows-fr gap-4 sm:grid-cols-2 xl:grid-cols-4 [&>*]:h-full">
          <MetricCard
            title={t("home.metrics.activeRoutes")}
            value={data.operations.inProgressRoutes}
            detail={t("home.metrics.activeRoutesDetail", {
              planned: data.routeCounts.planned,
              completed: data.routeCounts.completed,
            })}
            helpText={metricHelp.activeRoutes}
          />
          <MetricCard
            title={t("home.metrics.deliveryProgress")}
            value={`${data.operations.deliveryProgressPercent}%`}
            detail={t("home.metrics.deliveryProgressDetail", {
              delivered: data.operations.deliveredStops,
              total: data.operations.totalDeliveryStops,
            })}
            helpText={metricHelp.deliveryProgress}
          />
          <MetricCard
            title={t("home.metrics.highRiskVehicles")}
            value={data.fleetHealth.highRiskCount}
            detail={t("home.metrics.highRiskDetail")}
            helpText={metricHelp.highRisk}
          />
          <MetricCard
            title={t("home.metrics.avgFleetVqi")}
            value={data.fleetHealth.avgVqi}
            detail={t("home.metrics.avgFleetVqiDetail")}
            helpText={metricHelp.avgVqi}
          />
        </div>
      </section>

      <section className="space-y-4">
        <SectionHeader
          title={t("home.sections.needsAttention.title")}
          description={t("home.sections.needsAttention.description")}
        />
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">
                {t("home.attention.activeRoutes")}
              </CardTitle>
              <Button variant="outline" size="sm" render={<Link href="/routing/dashboard" />}>
                {t("common.viewAll")}
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.attentionRoutes.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t("home.attention.emptyRoutes")}
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
                        {t("home.attention.nextStop", {
                          address: route.nextStopAddress,
                          eta: formatDateTime(route.nextStopEta),
                        })}
                      </p>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">
                {t("home.attention.fleetRisk")}
              </CardTitle>
              <Button variant="outline" size="sm" render={<Link href="/vehicles" />}>
                {t("home.attention.viewFleet")}
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.highRiskVehicles.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t("home.attention.emptyFleet")}
                </p>
              ) : (
                data.highRiskVehicles.map((vehicle) => (
                  <div key={vehicle.id} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{vehicle.name}</span>
                      <RiskBadge risk={vehicle.riskLevel} vqi={vehicle.vqi} />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t("home.attention.nextMaint", {
                        date: formatDate(vehicle.predictedNextMaintenance),
                        cost: formatCurrencyShort(vehicle.estimatedCost),
                      })}
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

      <section className="space-y-4">
        <SectionHeader
          title={t("home.sections.logisticsOps.title")}
          description={t("home.sections.logisticsOps.description")}
          href="/routing/dashboard"
          linkLabel={t("home.sections.logisticsOps.link")}
        />
        <div className="grid auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 [&>*]:h-full">
          <MetricCard
            title={t("home.metrics.totalRoutes")}
            value={data.routeCounts.total}
            detail={t("home.metrics.totalRoutesDetail")}
            helpText={metricHelp.totalRoutes}
          />
          <MetricCard
            title={t("home.metrics.ordersOnRoute")}
            value={data.operations.ordersOnRoute}
            detail={t("home.metrics.ordersOnRouteDetail")}
            helpText={metricHelp.ordersOnRoute}
          />
          <MetricCard
            title={t("home.metrics.totalOrders")}
            value={data.totalOrders}
            detail={t("home.metrics.totalOrdersDetail")}
            helpText={metricHelp.totalOrders}
          />
          <MetricCard
            title={t("home.metrics.activeDrivers")}
            value={data.driverCount}
            detail={t("home.metrics.activeDriversDetail")}
            helpText={metricHelp.activeDrivers}
          />
          <MetricCard
            title={t("home.metrics.activeDistance")}
            value={t("home.metrics.activeDistanceValue", {
              km: data.operations.totalDistanceKm,
            })}
            detail={t("home.metrics.activeDistanceDetail")}
            helpText={metricHelp.activeDistance}
          />
          <MetricCard
            title={t("home.metrics.activeDuration")}
            value={formatDuration(t, data.operations.totalDurationMin)}
            detail={t("home.metrics.activeDurationDetail")}
            helpText={metricHelp.activeDuration}
          />
          <MetricCard
            title={t("home.metrics.activeEmissions")}
            value={t("home.metrics.activeEmissionsValue", {
              kg: data.operations.totalEmissionsKg,
            })}
            detail={t("home.metrics.activeEmissionsDetail")}
            helpText={metricHelp.activeEmissions}
          />
          <MetricCard
            title={t("home.metrics.avgDti")}
            value={data.operations.avgDti ?? "—"}
            detail={t("home.metrics.avgDtiDetail", {
              count: data.operations.deliveredOrdersWithDti,
            })}
            helpText={metricHelp.avgDti}
          />
          <MetricCard
            title={t("home.metrics.avgCfi")}
            value={data.operations.avgCfi ?? "—"}
            detail={t("home.metrics.avgCfiDetail")}
            helpText={metricHelp.avgCfi}
          />
          <MetricCard
            title={t("home.metrics.tripFuelCost")}
            value={formatCurrencyShort(data.operations.totalFuelCostIdr)}
            detail={
              data.fuelPrices
                ? t("home.metrics.tripFuelCostDetailRegion", {
                    region: data.fuelPrices.region,
                  })
                : t("home.metrics.tripFuelCostDetailActive")
            }
            helpText={metricHelp.tripFuelCost}
          />
          <MetricCard
            title={t("home.metrics.fuelSavings")}
            value={formatCurrencyShort(data.operations.totalFuelCostSavingsIdr)}
            detail={t("home.metrics.fuelSavingsDetail", {
              percent: data.operations.totalFuelCostSavingsPercent,
            })}
            helpText={metricHelp.fuelSavings}
          />
        </div>
        {data.fuelPrices && (
          <p className="text-xs text-muted-foreground">
            {t("home.fuelPrices.fetched", {
              time: formatDateTime(data.fuelPrices.fetchedAt),
            })}
            {data.fuelPrices.effectiveLabel
              ? ` · ${t("home.fuelPrices.effective", {
                  label: data.fuelPrices.effectiveLabel,
                })}`
              : ""}
            {" · "}
            <Link href="/system/gas-price" className="font-medium underline">
              {t("home.fuelPrices.viewList")}
            </Link>
          </p>
        )}
      </section>

      <section className="space-y-4">
        <SectionHeader
          title={t("home.sections.orderPipeline.title")}
          description={t("home.sections.orderPipeline.description")}
          href="/routing/orders"
          linkLabel={t("home.sections.orderPipeline.link")}
        />
        <div className="grid auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-4 [&>*]:h-full">
          {PIPELINE_KEYS.map((key) => (
            <MetricCard
              key={key}
              title={t(pipelineLabelKey(key))}
              value={data.pipeline[key] ?? 0}
              helpText={pipelineHelp[key]}
            />
          ))}
        </div>
      </section>

      <CvSessionReportsPanel
        title={t("home.cvPanel.title")}
        description={t("home.cvPanel.description")}
      />

      <section className="space-y-4">
        <SectionHeader
          title={t("home.sections.fleetHealth.title")}
          description={t("home.sections.fleetHealth.description")}
          href="/dashboard"
          linkLabel={t("home.sections.fleetHealth.link")}
        />
        <div className="grid auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 [&>*]:h-full">
          <MetricCard
            title={t("home.metrics.totalVehicles")}
            value={data.fleetHealth.totalVehicles}
            detail={t("home.metrics.totalVehiclesDetail")}
            helpText={metricHelp.totalVehicles}
          />
          <MetricCard
            title={t("home.metrics.mediumRisk")}
            value={data.fleetHealth.mediumRiskCount}
            detail={t("home.metrics.mediumRiskDetail")}
            helpText={metricHelp.mediumRisk}
          />
          <MetricCard
            title={t("home.metrics.lowRisk")}
            value={data.fleetHealth.lowRiskCount}
            detail={t("home.metrics.lowRiskDetail")}
            helpText={metricHelp.lowRisk}
          />
          <MetricCard
            title={t("home.metrics.upcomingMaintCost")}
            value={formatCurrencyShort(data.fleetHealth.upcomingMaintenanceCost)}
            detail={t("home.metrics.upcomingMaintDetail", {
              count: data.fleetHealth.upcomingMaintenanceCount,
            })}
            helpText={metricHelp.upcomingMaintenance}
          />
          <MetricCard
            title={t("home.metrics.fleetMaintBudget")}
            value={formatCurrencyShort(data.fleetHealth.totalMaintenanceCost)}
            detail={t("home.metrics.fleetMaintBudgetDetail")}
            helpText={metricHelp.fleetMaintenanceBudget}
          />
        </div>
      </section>

      <section className="space-y-4">
        <SectionHeader
          title={t("home.sections.operationsCharts.title")}
          description={t("home.sections.operationsCharts.description")}
          href="/routing/reports"
          linkLabel={t("home.sections.operationsCharts.link")}
        />
        <LogisticsChartsPanel charts={data.charts} compact />
      </section>

      <section className="space-y-4">
        <SectionHeader
          title={t("home.sections.fleetCharts.title")}
          description={t("home.sections.fleetCharts.description")}
          href="/reports"
          linkLabel={t("home.sections.fleetCharts.link")}
        />
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {t("home.charts.vqiDistribution")}
              </CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.fleetHealth.vqiDistribution}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="range" />
                  <YAxis allowDecimals={false} />
                  <RechartsTooltip />
                  <Bar dataKey="count" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {t("home.charts.orderPipeline")}
              </CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pipelineChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="stage" />
                  <YAxis allowDecimals={false} />
                  <RechartsTooltip />
                  <Bar dataKey="count" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
