import { prisma } from "@/lib/prisma";
import { enrichVehicle, getFleetAvgMaintenanceCost } from "@/lib/vehicle-service";
import type { RiskLevel } from "@/lib/vqi";
import { getLatestSnapshots, getRecentIncidents } from "@/lib/intelligence/service";
import type { ConditionSnapshotView, NormalizedIncident } from "@/lib/intelligence/types";

export type ControlTowerSeverity = "critical" | "high" | "watch";
export type ControlTowerExceptionStatus = "OPEN" | "ACKNOWLEDGED";
export type ControlTowerExceptionKind =
  | "unassigned_order"
  | "sla_risk"
  | "late_stop"
  | "fulfillment_blocked"
  | "fleet_risk"
  | "congestion_risk"
  | "weather_risk"
  | "incident_near_route"
  | "stale_traffic"
  | "stale_weather";

export type ControlTowerException = {
  id: string;
  dedupeKey: string;
  kind: ControlTowerExceptionKind;
  severity: ControlTowerSeverity;
  status: ControlTowerExceptionStatus;
  reason: string;
  sourceSystem?: string | null;
  orderId?: string;
  externalOrderId?: string | null;
  routePlanId?: string;
  vehicleId?: string;
  driverName?: string;
  vehicleName?: string;
  address?: string;
  etaAt?: string | null;
  promisedAt?: string | null;
  fulfillmentStatus?: string | null;
  ageMinutes?: number;
  minutesLate?: number;
  minutesUntilEta?: number;
  vqi?: number;
  riskLevel?: RiskLevel;
  acknowledgedAt?: string | null;
  resolvedAt?: string | null;
  detectedAt?: string | null;
};

export type ControlTowerOverview = {
  generatedAt: string;
  summary: {
    openExceptions: number;
    critical: number;
    high: number;
    watch: number;
    unassignedOrders: number;
    lateStops: number;
    fulfillmentBlocked: number;
    fleetRisks: number;
    activeRoutes: number;
    openOrders: number;
    atRiskOrders: number;
    otifPercent: number | null;
    deliveredWithPromise: number;
  };
  exceptions: ControlTowerException[];
};

export type ControlTowerUnassignedOrder = {
  id: string;
  recipientAddress: string;
  receivedAt: Date | null;
  externalOrderId?: string | null;
  sourceSystem?: string | null;
  promisedAt?: Date | null;
  fulfillmentStatus?: string | null;
};

export type ControlTowerRouteStop = {
  routePlanId: string;
  orderId: string;
  orderStatus: string;
  recipientAddress: string;
  etaAt: Date | null;
  promisedAt?: Date | null;
  externalOrderId?: string | null;
  sourceSystem?: string | null;
  fulfillmentStatus?: string | null;
  driverName: string;
};

export type ControlTowerFleetRisk = {
  routePlanId: string;
  vehicleId: string;
  vehicleName: string;
  driverName: string;
  vqi: number;
  riskLevel: RiskLevel;
};

const SEVERITY_RANK: Record<ControlTowerSeverity, number> = {
  critical: 0,
  high: 1,
  watch: 2,
};

const DB_KIND = {
  unassigned_order: "UNASSIGNED_ORDER",
  sla_risk: "SLA_RISK",
  late_stop: "LATE_STOP",
  fulfillment_blocked: "FULFILLMENT_BLOCKED",
  fleet_risk: "FLEET_RISK",
  congestion_risk: "CONGESTION_RISK",
  weather_risk: "WEATHER_RISK",
  incident_near_route: "INCIDENT_NEAR_ROUTE",
  stale_traffic: "STALE_TRAFFIC",
  stale_weather: "STALE_WEATHER",
} as const;

const DB_SEVERITY = {
  critical: "CRITICAL",
  high: "HIGH",
  watch: "WATCH",
} as const;

function minutesBetween(later: Date, earlier: Date) {
  return Math.max(0, Math.floor((later.getTime() - earlier.getTime()) / 60_000));
}

export function classifyUnassignedSeverity(ageMinutes: number): ControlTowerSeverity {
  if (ageMinutes >= 12 * 60) return "critical";
  if (ageMinutes >= 6 * 60) return "high";
  return "watch";
}

export function classifyDelaySeverity(minutesLate: number): ControlTowerSeverity {
  if (minutesLate >= 60) return "critical";
  return "high";
}

export function buildControlTowerExceptions(input: {
  now: Date;
  unassignedOrders: ControlTowerUnassignedOrder[];
  routeStops: ControlTowerRouteStop[];
  fleetRisks: ControlTowerFleetRisk[];
}): ControlTowerException[] {
  const exceptions: ControlTowerException[] = [];

  for (const order of input.unassignedOrders) {
    const ageMinutes = order.receivedAt
      ? minutesBetween(input.now, order.receivedAt)
      : 0;
    const fulfillmentBlocked = order.fulfillmentStatus === "EXCEPTION";

    exceptions.push({
      id: `unassigned-${order.id}`,
      dedupeKey: `unassigned:${order.id}`,
      kind: "unassigned_order",
      severity: classifyUnassignedSeverity(ageMinutes),
      status: "OPEN",
      reason: fulfillmentBlocked
        ? "Order is unassigned and fulfillment is blocked."
        : "Order has not been assigned to an active route.",
      sourceSystem: order.sourceSystem,
      orderId: order.id,
      externalOrderId: order.externalOrderId,
      address: order.recipientAddress,
      promisedAt: order.promisedAt?.toISOString() ?? null,
      fulfillmentStatus: order.fulfillmentStatus,
      ageMinutes,
    });

    if (fulfillmentBlocked) {
      exceptions.push({
        id: `fulfillment-${order.id}`,
        dedupeKey: `fulfillment:${order.id}`,
        kind: "fulfillment_blocked",
        severity: "high",
        status: "OPEN",
        reason: "WMS reported an exception that needs warehouse action.",
        sourceSystem: order.sourceSystem,
        orderId: order.id,
        externalOrderId: order.externalOrderId,
        address: order.recipientAddress,
        promisedAt: order.promisedAt?.toISOString() ?? null,
        fulfillmentStatus: order.fulfillmentStatus,
      });
    }
  }

  for (const stop of input.routeStops) {
    if (stop.orderStatus === "DELIVERED") continue;

    const etaDelta = stop.etaAt
      ? Math.floor((stop.etaAt.getTime() - input.now.getTime()) / 60_000)
      : null;
    const promiseDelta = stop.promisedAt
      ? Math.floor((stop.promisedAt.getTime() - input.now.getTime()) / 60_000)
      : null;

    if (etaDelta !== null && etaDelta < 0) {
      const minutesLate = Math.abs(etaDelta);
      exceptions.push({
        id: `late-${stop.orderId}`,
        dedupeKey: `late:${stop.orderId}`,
        kind: "late_stop",
        severity: classifyDelaySeverity(minutesLate),
        status: "OPEN",
        reason: `Stop is ${minutesLate} minutes past its ETA.`,
        sourceSystem: stop.sourceSystem,
        orderId: stop.orderId,
        externalOrderId: stop.externalOrderId,
        routePlanId: stop.routePlanId,
        driverName: stop.driverName,
        address: stop.recipientAddress,
        etaAt: stop.etaAt?.toISOString() ?? null,
        promisedAt: stop.promisedAt?.toISOString() ?? null,
        fulfillmentStatus: stop.fulfillmentStatus,
        minutesLate,
      });
    } else if (etaDelta !== null && etaDelta <= 30) {
      exceptions.push({
        id: `sla-watch-${stop.orderId}`,
        dedupeKey: `sla:${stop.orderId}`,
        kind: "sla_risk",
        severity: "watch",
        status: "OPEN",
        reason: `Stop ETA is in ${etaDelta} minutes.`,
        sourceSystem: stop.sourceSystem,
        orderId: stop.orderId,
        externalOrderId: stop.externalOrderId,
        routePlanId: stop.routePlanId,
        driverName: stop.driverName,
        address: stop.recipientAddress,
        etaAt: stop.etaAt?.toISOString() ?? null,
        promisedAt: stop.promisedAt?.toISOString() ?? null,
        fulfillmentStatus: stop.fulfillmentStatus,
        minutesUntilEta: etaDelta,
      });
    }

    if (promiseDelta !== null && promiseDelta < 0 && stop.orderStatus !== "DELIVERED") {
      const key = `sla-promise:${stop.orderId}`;
      if (!exceptions.some((exception) => exception.dedupeKey === key)) {
        exceptions.push({
          id: `sla-promise-${stop.orderId}`,
          dedupeKey: key,
          kind: "sla_risk",
          severity: "high",
          status: "OPEN",
          reason: "Projected delivery is beyond the customer promise time.",
          sourceSystem: stop.sourceSystem,
          orderId: stop.orderId,
          externalOrderId: stop.externalOrderId,
          routePlanId: stop.routePlanId,
          driverName: stop.driverName,
          address: stop.recipientAddress,
          etaAt: stop.etaAt?.toISOString() ?? null,
          promisedAt: stop.promisedAt?.toISOString() ?? null,
          fulfillmentStatus: stop.fulfillmentStatus,
        });
      }
    }

    if (stop.fulfillmentStatus === "EXCEPTION") {
      exceptions.push({
        id: `fulfillment-route-${stop.orderId}`,
        dedupeKey: `fulfillment:${stop.orderId}`,
        kind: "fulfillment_blocked",
        severity: "high",
        status: "OPEN",
        reason: "WMS reported an exception for an order already on a route.",
        sourceSystem: stop.sourceSystem,
        orderId: stop.orderId,
        externalOrderId: stop.externalOrderId,
        routePlanId: stop.routePlanId,
        driverName: stop.driverName,
        address: stop.recipientAddress,
        etaAt: stop.etaAt?.toISOString() ?? null,
        promisedAt: stop.promisedAt?.toISOString() ?? null,
        fulfillmentStatus: stop.fulfillmentStatus,
      });
    }
  }

  for (const fleetRisk of input.fleetRisks) {
    exceptions.push({
      id: `fleet-${fleetRisk.vehicleId}`,
      dedupeKey: `fleet:${fleetRisk.vehicleId}`,
      kind: "fleet_risk",
      severity: fleetRisk.riskLevel === "high" ? "high" : "watch",
      status: "OPEN",
      reason: `Vehicle health risk is ${fleetRisk.riskLevel}.`,
      routePlanId: fleetRisk.routePlanId,
      vehicleId: fleetRisk.vehicleId,
      driverName: fleetRisk.driverName,
      vehicleName: fleetRisk.vehicleName,
      vqi: fleetRisk.vqi,
      riskLevel: fleetRisk.riskLevel,
    });
  }

  return exceptions.sort((a, b) => {
    const severity = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
    if (severity !== 0) return severity;
    return (b.minutesLate ?? b.ageMinutes ?? b.vqi ?? 0) -
      (a.minutesLate ?? a.ageMinutes ?? a.vqi ?? 0);
  });
}

export function buildIntelligenceExceptions(input: {
  snapshots: ConditionSnapshotView[];
  incidents: NormalizedIncident[];
}): ControlTowerException[] {
  const exceptions: ControlTowerException[] = [];
  for (const snapshot of input.snapshots) {
    if (snapshot.stale && snapshot.source === "google") {
      exceptions.push({ id: `stale-traffic-${snapshot.regionId}`, dedupeKey: `stale-traffic:${snapshot.regionId}`, kind: "stale_traffic", severity: "watch", status: "OPEN", reason: "Traffic data is stale; routing is using the last known or local fallback.", sourceSystem: snapshot.source });
    }
    if (snapshot.stale && snapshot.source === "open_meteo") {
      exceptions.push({ id: `stale-weather-${snapshot.regionId}`, dedupeKey: `stale-weather:${snapshot.regionId}`, kind: "stale_weather", severity: "watch", status: "OPEN", reason: "Weather data is stale; weather adjustments are paused until refreshed.", sourceSystem: snapshot.source });
    }
    if (snapshot.congestionRatio !== null) {
      const severity = snapshot.congestionRatio >= 2 ? "critical" : snapshot.congestionRatio >= 1.6 ? "high" : snapshot.congestionRatio >= 1.3 ? "watch" : null;
      if (severity) exceptions.push({ id: `congestion-${snapshot.regionId}-${snapshot.source}`, dedupeKey: `congestion:${snapshot.regionId}:${snapshot.source}`, kind: "congestion_risk", severity, status: "OPEN", reason: `Traffic congestion ratio is ${snapshot.congestionRatio.toFixed(2)}.`, sourceSystem: snapshot.source });
    }
    if (snapshot.precipitationMmPerHour !== null) {
      const rain = snapshot.precipitationMmPerHour;
      const severity = rain >= 25 ? "critical" : rain >= 10 ? "high" : rain >= 5 ? "watch" : null;
      if (severity) exceptions.push({ id: `weather-${snapshot.regionId}-${snapshot.source}`, dedupeKey: `weather:rain:${snapshot.regionId}:${snapshot.source}`, kind: "weather_risk", severity, status: "OPEN", reason: `Rainfall is ${rain.toFixed(1)} mm/h.`, sourceSystem: snapshot.source });
      if (snapshot.visibilityMeters !== null && snapshot.visibilityMeters < 1000) exceptions.push({ id: `visibility-${snapshot.regionId}-${snapshot.source}`, dedupeKey: `weather:visibility:${snapshot.regionId}:${snapshot.source}`, kind: "weather_risk", severity: "high", status: "OPEN", reason: `Visibility is ${Math.round(snapshot.visibilityMeters)}m.`, sourceSystem: snapshot.source });
    }
  }
  for (const incident of input.incidents) {
    const severity = incident.roadClosed || incident.severity === "CRITICAL" ? "critical" : incident.severity === "MAJOR" ? "high" : "watch";
    exceptions.push({ id: `incident-${incident.source}-${incident.externalId}`, dedupeKey: `incident:${incident.source}:${incident.externalId}`, kind: "incident_near_route", severity, status: "OPEN", reason: incident.description ?? `Traffic incident: ${incident.category}.`, sourceSystem: incident.source, address: `${incident.lat.toFixed(4)}, ${incident.lng.toFixed(4)}` });
  }
  return exceptions;
}

async function syncExceptionRecords(desired: ControlTowerException[], now: Date) {
  const desiredKeys = desired.map((exception) => exception.dedupeKey);

  await prisma.$transaction(async (tx) => {
    for (const exception of desired) {
      const existing = await tx.controlTowerException.findUnique({
        where: { dedupeKey: exception.dedupeKey },
        select: { id: true, status: true },
      });
      const data = {
        kind: DB_KIND[exception.kind],
        severity: DB_SEVERITY[exception.severity],
        reason: exception.reason,
        sourceSystem: exception.sourceSystem ?? null,
        orderId: exception.orderId ?? null,
        routePlanId: exception.routePlanId ?? null,
        vehicleId: exception.vehicleId ?? null,
      };

      if (!existing) {
        await tx.controlTowerException.create({
          data: { dedupeKey: exception.dedupeKey, ...data },
        });
      } else {
        await tx.controlTowerException.update({
          where: { id: existing.id },
          data:
            existing.status === "RESOLVED"
              ? { ...data, status: "OPEN", resolvedAt: null, resolvedByUserId: null, resolutionNote: null }
              : data,
        });
      }
    }

    const stale = await tx.controlTowerException.findMany({
      where: {
        status: { not: "RESOLVED" },
        ...(desiredKeys.length > 0 ? { dedupeKey: { notIn: desiredKeys } } : {}),
      },
      select: { id: true },
    });
    if (stale.length > 0) {
      await tx.controlTowerException.updateMany({
        where: { id: { in: stale.map((exception) => exception.id) } },
        data: {
          status: "RESOLVED",
          resolvedAt: now,
          resolutionNote: "Condition cleared automatically.",
        },
      });
    }
  });
}

function mapStoredException(exception: {
  id: string;
  dedupeKey: string;
  kind: string;
  severity: string;
  status: string;
  reason: string;
  sourceSystem: string | null;
  detectedAt: Date;
  acknowledgedAt: Date | null;
  resolvedAt: Date | null;
  order: { id: string; externalOrderId: string | null; recipientAddress: string; promisedAt: Date | null; fulfillmentStatus: string } | null;
  routePlan: { id: string; driver: { name: string } } | null;
  vehicle: { id: string; name: string } | null;
}): ControlTowerException {
  return {
    id: exception.id,
    dedupeKey: exception.dedupeKey,
    kind: exception.kind.toLowerCase() as ControlTowerExceptionKind,
    severity: exception.severity.toLowerCase() as ControlTowerSeverity,
    status: exception.status as ControlTowerExceptionStatus,
    reason: exception.reason,
    sourceSystem: exception.sourceSystem,
    orderId: exception.order?.id,
    externalOrderId: exception.order?.externalOrderId,
    address: exception.order?.recipientAddress,
    promisedAt: exception.order?.promisedAt?.toISOString() ?? null,
    fulfillmentStatus: exception.order?.fulfillmentStatus,
    routePlanId: exception.routePlan?.id,
    driverName: exception.routePlan?.driver.name,
    vehicleId: exception.vehicle?.id,
    vehicleName: exception.vehicle?.name,
    acknowledgedAt: exception.acknowledgedAt?.toISOString() ?? null,
    resolvedAt: exception.resolvedAt?.toISOString() ?? null,
    detectedAt: exception.detectedAt.toISOString(),
  };
}

export async function getControlTowerOverview(): Promise<ControlTowerOverview> {
  const now = new Date();
  const [unassignedOrders, routePlans, vehicles] = await Promise.all([
    prisma.order.findMany({
      where: { routePlanId: null, status: { not: "DELIVERED" } },
      orderBy: { receivedAt: "asc" },
      select: {
        id: true,
        recipientAddress: true,
        receivedAt: true,
        externalOrderId: true,
        sourceSystem: true,
        promisedAt: true,
        fulfillmentStatus: true,
      },
    }),
    prisma.routePlan.findMany({
      where: { status: { in: ["PLANNED", "IN_PROGRESS"] } },
      include: {
        driver: { include: { vehicle: true } },
        stops: {
          orderBy: { sequence: "asc" },
          include: { order: true },
        },
      },
    }),
    prisma.vehicle.findMany(),
  ]);

  const averageMaintenanceCost = getFleetAvgMaintenanceCost(vehicles);
  const routeStops: ControlTowerRouteStop[] = [];
  const fleetRisks: ControlTowerFleetRisk[] = [];
  let openRouteOrders = 0;

  for (const route of routePlans) {
    const analysis = enrichVehicle(route.driver.vehicle, averageMaintenanceCost);
    if (analysis.riskLevel !== "low") {
      fleetRisks.push({
        routePlanId: route.id,
        vehicleId: route.driver.vehicle.id,
        vehicleName: route.driver.vehicle.name,
        driverName: route.driver.name,
        vqi: analysis.vqi,
        riskLevel: analysis.riskLevel,
      });
    }

    for (const stop of route.stops) {
      if (stop.order.status === "DELIVERED") continue;
      openRouteOrders += 1;
      routeStops.push({
        routePlanId: route.id,
        orderId: stop.orderId,
        orderStatus: stop.order.status,
        recipientAddress: stop.order.recipientAddress,
        etaAt: stop.etaAt,
        promisedAt: stop.order.promisedAt,
        externalOrderId: stop.order.externalOrderId,
        sourceSystem: stop.order.sourceSystem,
        fulfillmentStatus: stop.order.fulfillmentStatus,
        driverName: route.driver.name,
      });
    }
  }

  const desired = buildControlTowerExceptions({ now, unassignedOrders, routeStops, fleetRisks });
  const [snapshots, incidents] = await Promise.all([getLatestSnapshots(), getRecentIncidents()]);
  const intelligenceExceptions = buildIntelligenceExceptions({
    snapshots,
    incidents: incidents.map((incident) => ({ source: incident.source as NormalizedIncident["source"], externalId: incident.externalId, observedAt: incident.observedAt, validUntil: incident.expiresAt, category: incident.category, severity: incident.severity as NormalizedIncident["severity"], lat: incident.lat, lng: incident.lng, description: incident.description ?? undefined, roadClosed: incident.roadClosed })),
  });
  await syncExceptionRecords([...desired, ...intelligenceExceptions], now);
  const stored = await prisma.controlTowerException.findMany({
    where: { status: { not: "RESOLVED" } },
    orderBy: [{ severity: "asc" }, { detectedAt: "asc" }],
    include: {
      order: {
        select: { id: true, externalOrderId: true, recipientAddress: true, promisedAt: true, fulfillmentStatus: true },
      },
      routePlan: { select: { id: true, driver: { select: { name: true } } } },
      vehicle: { select: { id: true, name: true } },
    },
  });
  const exceptions = stored.map(mapStoredException);
  const atRiskOrderIds = new Set(
    exceptions.filter((exception) => exception.orderId).map((exception) => exception.orderId),
  );

  const deliveredOrders = await prisma.order.findMany({
    where: { status: "DELIVERED", promisedAt: { not: null }, deliveredAt: { not: null } },
    select: { promisedAt: true, deliveredAt: true },
  });
  const deliveredWithPromise = deliveredOrders.length;
  const deliveredOnTime = deliveredOrders.filter(
    (order) => order.promisedAt && order.deliveredAt && order.deliveredAt <= order.promisedAt,
  ).length;

  return {
    generatedAt: now.toISOString(),
    summary: {
      openExceptions: exceptions.length,
      critical: exceptions.filter((e) => e.severity === "critical").length,
      high: exceptions.filter((e) => e.severity === "high").length,
      watch: exceptions.filter((e) => e.severity === "watch").length,
      unassignedOrders: unassignedOrders.length,
      lateStops: exceptions.filter((e) => e.kind === "late_stop").length,
      fulfillmentBlocked: exceptions.filter((e) => e.kind === "fulfillment_blocked").length,
      fleetRisks: fleetRisks.length,
      activeRoutes: routePlans.length,
      openOrders: unassignedOrders.length + openRouteOrders,
      atRiskOrders: atRiskOrderIds.size,
      otifPercent: deliveredWithPromise > 0 ? Math.round((deliveredOnTime / deliveredWithPromise) * 100) : null,
      deliveredWithPromise,
    },
    exceptions,
  };
}
