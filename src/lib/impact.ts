import { prisma } from "@/lib/prisma";
import { getLatestSnapshots } from "@/lib/intelligence/service";
import { getRoutingLogisticsOverview } from "@/lib/routing-overview";
import { RAIN_DISRUPTION_SCENARIO } from "@/lib/demo-scenario";
import { getSlaRiskMetrics } from "@/lib/sla-risk-service";

function round(value: number, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function parseJson<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try { return JSON.parse(value) as T; } catch { return fallback; }
}

export async function getImpactOverview() {
  const now = new Date();
  const [orders, routes, revisions, runs, snapshots, activeExceptions, scenario, slaRisk] = await Promise.all([
    prisma.order.findMany({ select: { id: true, status: true, promisedAt: true, deliveredAt: true } }),
    prisma.routePlan.findMany({ select: { id: true, status: true, totalDurationMin: true, totalDistanceKm: true, estimatedEmissionsKg: true } }),
    prisma.routeRevision.findMany({ orderBy: { createdAt: "desc" }, include: { routePlan: { include: { stops: { include: { order: { select: { promisedAt: true } } } } } } } }),
    prisma.intelligenceIngestionRun.findMany({ where: { startedAt: { gte: new Date(now.getTime() - 24 * 60 * 60_000) } }, orderBy: { startedAt: "desc" }, take: 200 }),
    getLatestSnapshots(),
    prisma.controlTowerException.findMany({ where: { status: { not: "RESOLVED" } }, select: { kind: true, severity: true } }),
    prisma.demoScenarioRun.findUnique({ where: { id: RAIN_DISRUPTION_SCENARIO } }),
    getSlaRiskMetrics(),
  ]);

  const promisedOrders = orders.filter((order) => order.promisedAt);
  const deliveredWithPromise = promisedOrders.filter((order) => order.status === "DELIVERED" && order.deliveredAt);
  const onTime = deliveredWithPromise.filter((order) => order.deliveredAt! <= order.promisedAt!).length;
  const approved = revisions.filter((revision) => revision.status === "APPROVED");
  const draft = revisions.filter((revision) => revision.status === "DRAFT");
  const rejected = revisions.filter((revision) => revision.status === "REJECTED");
  let protectedSlaOrders = 0;
  for (const revision of approved) {
    const preview = parseJson<{ stops: Array<{ orderId: string; etaAt: string | null; revisedEtaAt: string }> }>(revision.previewJson, { stops: [] }).stops;
    const stopsByOrder = new Map(revision.routePlan.stops.map((stop) => [stop.orderId, stop]));
    for (const item of preview) {
      const promise = stopsByOrder.get(item.orderId)?.order.promisedAt;
      if (!promise || !item.etaAt) continue;
      if (new Date(item.etaAt) > promise && new Date(item.revisedEtaAt) <= promise) protectedSlaOrders += 1;
    }
  }

  const ingestionSuccess = runs.filter((run) => run.status === "SUCCEEDED").length;
  const ingestionPartial = runs.filter((run) => run.status === "PARTIAL").length;
  const ingestionFailed = runs.filter((run) => run.status === "FAILED").length;
  const baseline = parseJson<{ totalDurationMin: number; totalDistanceKm: number }>(scenario?.baselineJson ?? null, { totalDurationMin: 0, totalDistanceKm: 0 });
  const activeRoutes = routes.filter((route) => route.status === "PLANNED" || route.status === "IN_PROGRESS");
  const scenarioRoute = scenario?.baselineRoutePlanId ? routes.find((route) => route.id === scenario.baselineRoutePlanId) : null;
  const routeSummary = await getRoutingLogisticsOverview();
  const totalDurationMin = activeRoutes.reduce((sum, route) => sum + route.totalDurationMin, 0);
  const totalDistanceKm = activeRoutes.reduce((sum, route) => sum + route.totalDistanceKm, 0);
  const totalEmissionsKg = activeRoutes.reduce((sum, route) => sum + route.estimatedEmissionsKg, 0);
  const avgDurationChange = revisions.length > 0 ? revisions.reduce((sum, revision) => sum + revision.revisedDurationMin - revision.originalDurationMin, 0) / revisions.length : 0;
  const avgDistanceChange = revisions.length > 0 ? revisions.reduce((sum, revision) => sum + revision.revisedDistanceKm - revision.originalDistanceKm, 0) / revisions.length : 0;

  return {
    generatedAt: now.toISOString(),
    provenance: scenario?.synthetic && scenario.status !== "IDLE" ? "SYNTHETIC" : "LIVE_OR_OPERATIONAL",
    scenario: scenario ? { id: scenario.id, status: scenario.status, step: scenario.step, baselineRoutePlanId: scenario.baselineRoutePlanId } : null,
    operations: {
      activeRoutes: activeRoutes.length,
      totalOrders: orders.length,
      deliveredOrders: orders.filter((order) => order.status === "DELIVERED").length,
      lateOrders: deliveredWithPromise.filter((order) => order.deliveredAt! > order.promisedAt!).length,
      ordersAtRisk: activeExceptions.filter((exception) => ["SLA_RISK", "PREDICTIVE_SLA_RISK", "WEATHER_RISK", "CONGESTION_RISK", "INCIDENT_NEAR_ROUTE"].includes(exception.kind)).length,
      protectedSlaOrders,
      averageRouteDurationMin: round(activeRoutes.length ? totalDurationMin / activeRoutes.length : 0),
      averageRouteDistanceKm: round(activeRoutes.length ? totalDistanceKm / activeRoutes.length : 0),
      totalDistanceKm: round(totalDistanceKm),
      totalFuelCostIdr: routeSummary.operations.totalFuelCostIdr,
      totalFuelSavingsIdr: routeSummary.operations.totalFuelCostSavingsIdr,
      totalEmissionsKg: round(totalEmissionsKg),
    },
    service: {
      promisedOrders: promisedOrders.length,
      deliveredWithPromise: deliveredWithPromise.length,
      onTimeDeliveries: onTime,
      otifPercent: deliveredWithPromise.length ? round((onTime / deliveredWithPromise.length) * 100, 0) : null,
    },
    revisions: {
      previewed: revisions.length,
      approved: approved.length,
      rejected: rejected.length,
      pending: draft.length,
      averageDurationChangeMin: round(avgDurationChange),
      averageDistanceChangeKm: round(avgDistanceChange),
      affectedStops: revisions.reduce((sum, revision) => sum + revision.affectedStops, 0),
      scenarioBaselineDurationMin: baseline.totalDurationMin || null,
      scenarioCurrentDurationMin: scenarioRoute?.totalDurationMin ?? null,
      scenarioDurationChangeMin: scenarioRoute && baseline.totalDurationMin ? round(scenarioRoute.totalDurationMin - baseline.totalDurationMin) : null,
      scenarioBaselineDistanceKm: baseline.totalDistanceKm || null,
      scenarioCurrentDistanceKm: scenarioRoute?.totalDistanceKm ?? null,
    },
    providers: {
      ingestionRuns24h: runs.length,
      successful: ingestionSuccess,
      partial: ingestionPartial,
      failed: ingestionFailed,
      successRatePercent: runs.length ? round((ingestionSuccess / runs.length) * 100, 0) : null,
      staleFeeds: snapshots.filter((snapshot) => snapshot.stale).length,
      latestSnapshots: snapshots.map((snapshot) => ({ dataType: snapshot.dataType, source: snapshot.source, stale: snapshot.stale, observedAt: snapshot.observedAt })),
      lastSuccessfulAt: runs.find((run) => run.status === "SUCCEEDED")?.completedAt?.toISOString() ?? null,
    },
    exceptions: {
      open: activeExceptions.length,
      critical: activeExceptions.filter((exception) => exception.severity === "CRITICAL").length,
    },
    slaRisk,
  };
}
