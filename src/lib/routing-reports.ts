import { DTI_THRESHOLDS } from "@/lib/routing/dti";
import type {
  ActiveRouteSummary,
  DriverRosterEntry,
  OrderPipeline,
  RoutingLogisticsOverview,
} from "@/lib/routing-overview";

const PIPELINE_LABELS: Record<keyof OrderPipeline, string> = {
  RECEIVED: "Received",
  PREPARING: "Preparing",
  ON_ROUTE: "On route",
  DELIVERED: "Delivered",
};

const ROUTE_STATUS_LABELS: Record<string, string> = {
  PLANNED: "Planned",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
};

export type LogisticsCharts = {
  pipeline: Array<{ stage: string; count: number }>;
  routeStatus: Array<{ status: string; count: number }>;
  driverVqi: Array<{ name: string; vqi: number }>;
  routePerformance: Array<{
    name: string;
    dti: number | null;
    cfi: number;
    progress: number;
  }>;
  emissionsByRoute: Array<{ name: string; emissionsKg: number }>;
  dtiDistribution: Array<{ range: string; count: number }>;
  engineCfi: Array<{ engineType: string; avgCfi: number; routes: number }>;
};

export type RouteReportRow = {
  routePlanId: string;
  driverName: string;
  status: string;
  warehouse: string;
  totalStops: number;
  deliveredStops: number;
  progressPercent: number;
  distanceKm: number;
  durationMin: number;
  emissionsKg: number;
  avgDti: number | null;
  routeCfi: number;
  fuelCostIdr: number;
  fuelCostSavingsIdr: number;
  fuelProductName: string;
  engineType: string;
  vehicleType: string;
  vehicleName: string;
};

export type DeliveryReportRow = {
  orderId: string;
  recipientAddress: string;
  driverName: string;
  routePlanId: string;
  routeStatus: string;
  sequence: number;
  orderStatus: string;
  receivedAt: string | null;
  plannedEtaAt: string | null;
  deliveredAt: string | null;
  dtiScore: number | null;
  slackMin: number | null;
  cfiScore: number | null;
  distanceKm: number;
};

export type LogisticsReportBundle = {
  charts: LogisticsCharts;
  routes: RouteReportRow[];
  deliveries: DeliveryReportRow[];
};

function buildDtiDistribution(scores: number[]) {
  const buckets = [
    { range: `0–${DTI_THRESHOLDS.highBelow - 1}`, count: 0 },
    {
      range: `${DTI_THRESHOLDS.highBelow}–${DTI_THRESHOLDS.lowAbove}`,
      count: 0,
    },
    { range: `${DTI_THRESHOLDS.lowAbove + 1}–100`, count: 0 },
  ];

  for (const score of scores) {
    if (score < DTI_THRESHOLDS.highBelow) buckets[0].count += 1;
    else if (score <= DTI_THRESHOLDS.lowAbove) buckets[1].count += 1;
    else buckets[2].count += 1;
  }

  return buckets;
}

function buildEngineCfi(routes: ActiveRouteSummary[]) {
  const byEngine = new Map<string, { total: number; count: number }>();

  for (const route of routes) {
    const engine = route.driver.vehicle.engineType;
    const entry = byEngine.get(engine) ?? { total: 0, count: 0 };
    entry.total += route.totals.routeCfi;
    entry.count += 1;
    byEngine.set(engine, entry);
  }

  return [...byEngine.entries()]
    .map(([engineType, { total, count }]) => ({
      engineType: engineType.toUpperCase(),
      avgCfi: count > 0 ? Math.round(total / count) : 0,
      routes: count,
    }))
    .sort((a, b) => b.avgCfi - a.avgCfi);
}

function buildDeliveryRows(routes: ActiveRouteSummary[]): DeliveryReportRow[] {
  const rows: DeliveryReportRow[] = [];

  for (const route of routes) {
    for (const stop of route.stops) {
      rows.push({
        orderId: stop.orderId,
        recipientAddress: stop.recipientAddress,
        driverName: route.driver.name,
        routePlanId: route.routePlanId,
        routeStatus: ROUTE_STATUS_LABELS[route.status] ?? route.status,
        sequence: stop.sequence,
        orderStatus: stop.orderStatus,
        receivedAt: stop.receivedAt,
        plannedEtaAt: stop.etaAt,
        deliveredAt: stop.deliveredAt,
        dtiScore: stop.dtiScore,
        slackMin: stop.slackMin,
        cfiScore: stop.cfiScore,
        distanceKm: stop.distanceKm,
      });
    }
  }

  return rows.sort(
    (a, b) =>
      a.driverName.localeCompare(b.driverName) || a.sequence - b.sequence
  );
}

function buildRouteRows(routes: ActiveRouteSummary[]): RouteReportRow[] {
  return routes.map((route) => ({
    routePlanId: route.routePlanId,
    driverName: route.driver.name,
    status: ROUTE_STATUS_LABELS[route.status] ?? route.status,
    warehouse: route.warehouse.name,
    totalStops: route.totals.totalStops,
    deliveredStops: route.totals.deliveredStops,
    progressPercent: route.totals.progressPercent,
    distanceKm: route.totals.totalDistanceKm,
    durationMin: route.totals.totalDurationMin,
    emissionsKg: route.totals.estimatedEmissionsKg,
    avgDti: route.totals.avgDti,
    routeCfi: route.totals.routeCfi,
    fuelCostIdr: route.totals.fuelCostIdr,
    fuelCostSavingsIdr: route.totals.fuelCostSavingsIdr,
    fuelProductName: route.totals.fuelProductName,
    engineType: route.driver.vehicle.engineType,
    vehicleType: route.driver.vehicle.vehicleType,
    vehicleName: route.driver.vehicle.name,
  }));
}

export function buildLogisticsReportBundle(
  overview: Pick<
    RoutingLogisticsOverview,
    "pipeline" | "routeCounts" | "activeRoutes" | "roster"
  >
): LogisticsReportBundle {
  const { pipeline, routeCounts, activeRoutes, roster } = overview;

  const pipelineChart = (
    Object.entries(pipeline) as Array<[keyof OrderPipeline, number]>
  ).map(([key, count]) => ({
    stage: PIPELINE_LABELS[key],
    count,
  }));

  const routeStatusChart = [
    { status: "Planned", count: routeCounts.planned },
    { status: "In progress", count: routeCounts.inProgress },
    { status: "Completed", count: routeCounts.completed },
  ].filter((item) => item.count > 0);

  const driverVqi = roster
    .map((d: DriverRosterEntry) => ({
      name: d.name.split(" ")[0],
      vqi: d.vehicle.vqi,
    }))
    .sort((a, b) => b.vqi - a.vqi);

  const routePerformance = activeRoutes.map((route) => ({
    name: route.driver.name.split(" ")[0],
    dti: route.totals.avgDti ?? 0,
    cfi: route.totals.routeCfi,
    progress: route.totals.progressPercent,
  }));

  const emissionsByRoute = activeRoutes.map((route) => ({
    name: route.driver.name.split(" ")[0],
    emissionsKg: route.totals.estimatedEmissionsKg,
  }));

  const dtiScores = activeRoutes.flatMap((route) =>
    route.stops
      .filter((stop) => stop.dtiScore != null)
      .map((stop) => stop.dtiScore as number)
  );

  return {
    charts: {
      pipeline: pipelineChart,
      routeStatus: routeStatusChart,
      driverVqi,
      routePerformance,
      emissionsByRoute,
      dtiDistribution: buildDtiDistribution(dtiScores),
      engineCfi: buildEngineCfi(activeRoutes),
    },
    routes: buildRouteRows(activeRoutes),
    deliveries: buildDeliveryRows(activeRoutes),
  };
}
