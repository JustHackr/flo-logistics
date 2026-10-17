import { prisma } from "@/lib/prisma";
import { recordAuditEventSafe } from "@/lib/audit";
import { distanceToRouteKm } from "@/lib/intelligence/geo";
import { getLatestSnapshots, getRecentIncidents, getRegions } from "@/lib/intelligence/service";
import { isInRegion } from "@/lib/intelligence/regions";
import { assessSlaRisk, type SlaRiskConfidence, type SlaRiskLevel, type SlaRiskResult } from "@/lib/sla-risk";
import { enrichVehicle, getFleetAvgMaintenanceCost } from "@/lib/vehicle-service";
import type { Vehicle } from "@/generated/prisma/client";

type RecalculateInput = {
  orderId?: string;
  actorUserId?: string;
  actorRole?: string;
  trigger?: "WORKER" | "MANUAL" | "WMS_UPDATE" | "ROUTE_UPDATE" | "DEMO";
};

export type SlaRiskPredictionView = {
  id: string;
  orderId: string;
  externalOrderId: string | null;
  recipientAddress: string;
  routePlanId: string | null;
  routeStopId: string | null;
  score: number;
  riskLevel: SlaRiskLevel;
  confidence: SlaRiskConfidence;
  promisedAt: string;
  predictedDeliveryAt: string | null;
  remainingBufferMin: number | null;
  factors: SlaRiskResult["factors"];
  reasons: string[];
  recommendation: string;
  sourceSnapshotIds: string[];
  dataSources: string[];
  generatedAt: string;
  expiresAt: string;
  stale: boolean;
  previousScore: number | null;
  previousRiskLevel: string | null;
  scoreChange: number | null;
};

type OrderContext = {
  id: string;
  externalOrderId: string | null;
  recipientAddress: string;
  lat: number;
  lng: number;
  status: string;
  promisedAt: Date | null;
  fulfillmentStatus: string;
  priority: string | null;
  serviceLevel: string | null;
  routePlanId: string | null;
  routeStop: { id: string; etaAt: Date | null; durationMin: number } | null;
  routePlan: {
    id: string;
    status: string;
    totalDurationMin: number;
    stops: Array<{ id: string; orderId: string; etaAt: Date | null; order: { status: string; lat: number; lng: number } }>;
    driver: { status: string; vehicle: { vehicleType: string } };
    warehouse: { lat: number; lng: number };
  } | null;
};

function parseJson<T>(value: string, fallback: T): T {
  try { return JSON.parse(value) as T; } catch { return fallback; }
}

function sourceRank(source: string) {
  return ({ google: 0, open_meteo: 0, tomtom: 0, fixture: 1, fallback: 2 } as Record<string, number>)[source] ?? 3;
}

function toView(row: {
  id: string; orderId: string; score: number; riskLevel: string; confidence: string; promisedAt: Date; predictedDeliveryAt: Date | null; remainingBufferMin: number | null; factorsJson: string; reasonsJson: string; recommendation: string; sourceSnapshotIdsJson: string; dataSourcesJson?: string; generatedAt: Date; expiresAt: Date; stale: boolean; previousScore: number | null; previousRiskLevel: string | null; scoreChange: number | null; routePlanId: string | null; routeStopId: string | null;
  order: { externalOrderId: string | null; recipientAddress: string };
  dataSources?: string[];
}): SlaRiskPredictionView {
  const factors = parseJson<SlaRiskResult["factors"]>(row.factorsJson, { slaPressure: 0, fulfillmentDelay: 0, traffic: 0, weather: 0, driverFleet: 0, historical: 0 });
  return { id: row.id, orderId: row.orderId, externalOrderId: row.order.externalOrderId, recipientAddress: row.order.recipientAddress, routePlanId: row.routePlanId, routeStopId: row.routeStopId, score: row.score, riskLevel: row.riskLevel as SlaRiskLevel, confidence: row.confidence as SlaRiskConfidence, promisedAt: row.promisedAt.toISOString(), predictedDeliveryAt: row.predictedDeliveryAt?.toISOString() ?? null, remainingBufferMin: row.remainingBufferMin, factors, reasons: parseJson<string[]>(row.reasonsJson, []), recommendation: row.recommendation, sourceSnapshotIds: parseJson<string[]>(row.sourceSnapshotIdsJson, []), dataSources: parseJson<string[]>(row.dataSourcesJson ?? "[]", []), generatedAt: row.generatedAt.toISOString(), expiresAt: row.expiresAt.toISOString(), stale: row.stale || row.expiresAt < new Date(), previousScore: row.previousScore, previousRiskLevel: row.previousRiskLevel, scoreChange: row.scoreChange };
}

function activeRouteDuration(order: OrderContext, now: Date) {
  if (order.routeStop?.etaAt) return Math.max(0, (order.routeStop.etaAt.getTime() - now.getTime()) / 60_000);
  if (!order.routePlan) return 120;
  const remaining = order.routePlan.stops.filter((stop) => stop.order.status !== "DELIVERED").length;
  return Math.max(order.routeStop?.durationMin ?? 0, order.routePlan.totalDurationMin * (remaining / Math.max(1, order.routePlan.stops.length)));
}

function capacityRatio(order: OrderContext) {
  if (!order.routePlan) return null;
  const maxStops = /van|truck/i.test(order.routePlan.driver.vehicle.vehicleType) ? 20 : 10;
  return order.routePlan.stops.length / maxStops;
}

async function loadOrderContexts(orderId?: string): Promise<OrderContext[]> {
  return prisma.order.findMany({
    where: { status: { not: "DELIVERED" }, promisedAt: { not: null }, ...(orderId ? { id: orderId } : {}) },
    include: { routeStop: true, routePlan: { include: { driver: { include: { vehicle: true } }, warehouse: true, stops: { include: { order: { select: { status: true, lat: true, lng: true } } } } } } },
  }) as unknown as Promise<OrderContext[]>;
}

async function upsertRiskException(input: { order: OrderContext; predictionId: string; result: SlaRiskResult; actorUserId?: string; actorRole?: string }) {
  const prefix = `sla-risk:${input.order.id}:`;
  const currentKey = `${prefix}${input.result.riskLevel}:${input.result.dominantCause}`;
  await prisma.$transaction(async (tx) => {
    const old = await tx.controlTowerException.findMany({ where: { orderId: input.order.id, kind: "PREDICTIVE_SLA_RISK", status: { not: "RESOLVED" }, dedupeKey: { not: currentKey } }, select: { id: true } });
    if (old.length > 0) await tx.controlTowerException.updateMany({ where: { id: { in: old.map((item) => item.id) } }, data: { status: "RESOLVED", resolvedAt: new Date(), resolutionNote: "Risk band or dominant cause changed; superseded by a newer prediction." } });
    if (input.result.riskLevel === "LOW") return;
    const severity = (input.result.riskLevel === "CRITICAL" ? "CRITICAL" : input.result.riskLevel === "HIGH" ? "HIGH" : "WATCH") as "CRITICAL" | "HIGH" | "WATCH";
    const reason = `${input.result.score.toFixed(1)}% ${input.result.riskLevel} SLA risk (${input.result.confidence} confidence). ${input.result.reasons.slice(0, 3).join(" ")} Recommended: ${input.result.recommendation}`;
    const existing = await tx.controlTowerException.findUnique({ where: { dedupeKey: currentKey }, select: { id: true, status: true } });
    const data = { kind: "PREDICTIVE_SLA_RISK" as const, severity, sourceSystem: "FLO_SLA_ENGINE", reason, orderId: input.order.id, routePlanId: input.order.routePlanId, slaRiskPredictionId: input.predictionId };
    if (!existing) await tx.controlTowerException.create({ data: { dedupeKey: currentKey, ...data } });
    else await tx.controlTowerException.update({ where: { id: existing.id }, data: existing.status === "RESOLVED" ? { ...data, status: "OPEN", resolvedAt: null, resolvedByUserId: null, resolutionNote: null } : data });
  });
  await recordAuditEventSafe({ eventType: "SLA_RISK", action: "EXCEPTION_SYNC", summary: `Predictive SLA ${input.result.riskLevel.toLowerCase()} exception synchronized.`, reason: input.result.reasons.join(" "), actorUserId: input.actorUserId, actorRole: input.actorRole, entityType: "SlaRiskPrediction", entityId: input.predictionId, slaRiskPredictionId: input.predictionId, routePlanId: input.order.routePlanId, after: { riskLevel: input.result.riskLevel, score: input.result.score, confidence: input.result.confidence, dedupeKey: currentKey } });
}

export async function recalculateSlaRisk(input: RecalculateInput = {}) {
  const now = new Date();
  const [orders, snapshots, incidents, history, fleetVehicles, regions] = await Promise.all([
    loadOrderContexts(input.orderId),
    getLatestSnapshots(),
    getRecentIncidents(),
    prisma.order.findMany({ where: { status: "DELIVERED", promisedAt: { not: null }, deliveredAt: { not: null } }, select: { promisedAt: true, deliveredAt: true }, take: 1000 }),
    prisma.vehicle.findMany(),
    getRegions(),
  ]);
  const fleetAvgMaintenanceCost = getFleetAvgMaintenanceCost(fleetVehicles);
  const configs = await prisma.intelligenceConfig.findMany({ select: { regionId: true, thresholdsJson: true } });
  const thresholdsByRegion = new Map(configs.map((config) => [config.regionId, parseJson<Record<string, number>>(config.thresholdsJson, {})]));
  await prisma.controlTowerException.updateMany({
    where: { kind: "PREDICTIVE_SLA_RISK", status: { not: "RESOLVED" }, order: { status: "DELIVERED" } },
    data: { status: "RESOLVED", resolvedAt: now, resolutionNote: "Order delivered; predictive risk closed." },
  });
  const averageDelayMin = history.length ? history.reduce((sum, item) => sum + Math.max(0, (item.deliveredAt!.getTime() - item.promisedAt!.getTime()) / 60_000), 0) / history.length : 0;
  const historical = { averageDelayMin, samples: history.length };
  const results: SlaRiskPredictionView[] = [];
  for (const order of orders) {
    if (!order.promisedAt) continue;
    const routePoints = order.routePlan ? [{ lat: order.routePlan.warehouse.lat, lng: order.routePlan.warehouse.lng }, ...order.routePlan.stops.map((stop) => ({ lat: stop.order.lat, lng: stop.order.lng }))] : [{ lat: order.lat, lng: order.lng }];
    const region = regions.find((item) => routePoints.some((point) => isInRegion(item, point.lat, point.lng))) ?? regions[0];
    const regionSnapshots = region ? snapshots.filter((item) => item.regionId === region.id) : snapshots;
    const traffic = [...regionSnapshots.filter((item) => item.dataType === "TRAFFIC")].sort((a, b) => Number(a.stale) - Number(b.stale) || sourceRank(a.source) - sourceRank(b.source))[0];
    const weather = [...regionSnapshots.filter((item) => item.dataType === "WEATHER")].sort((a, b) => Number(a.stale) - Number(b.stale) || sourceRank(a.source) - sourceRank(b.source))[0];
    const nearbyIncident = incidents.filter((incident) => !region || isInRegion(region, incident.lat, incident.lng)).map((incident) => ({ incident, distanceKm: distanceToRouteKm({ lat: incident.lat, lng: incident.lng }, routePoints) })).sort((a, b) => a.distanceKm - b.distanceKm)[0];
    const enrichedVehicle = order.routePlan?.driver.vehicle ? enrichVehicle(order.routePlan.driver.vehicle as unknown as Vehicle, fleetAvgMaintenanceCost) : null;
    const configuredThresholds = region ? thresholdsByRegion.get(region.id) ?? {} : {};
    const result = assessSlaRisk({ now, promisedAt: order.promisedAt, predictedDeliveryAt: order.routeStop?.etaAt, remainingDurationMin: activeRouteDuration(order, now), remainingStops: order.routePlan?.stops.filter((stop) => stop.order.status !== "DELIVERED").length ?? 0, fulfillmentStatus: order.fulfillmentStatus, routeAssigned: Boolean(order.routePlanId && order.routeStop), driverAssigned: Boolean(order.routePlan?.driver), driverStatus: order.routePlan?.driver.status, vehicleRiskLevel: enrichedVehicle?.riskLevel ?? null, capacityRatio: capacityRatio(order), priority: order.priority, serviceLevel: order.serviceLevel, traffic: traffic ? { congestionRatio: traffic.congestionRatio, stale: traffic.stale, source: traffic.source } : null, weather: weather ? { precipitationMmPerHour: weather.precipitationMmPerHour, visibilityMeters: weather.visibilityMeters, windKmh: weather.windKmh, stale: weather.stale, source: weather.source } : null, incident: nearbyIncident && nearbyIncident.distanceKm <= 5 ? { roadClosed: nearbyIncident.incident.roadClosed, severity: nearbyIncident.incident.severity as "MINOR" | "MAJOR" | "CRITICAL", distanceKm: nearbyIncident.distanceKm, source: nearbyIncident.incident.source } : null, historical, thresholds: { watchScore: configuredThresholds.slaRiskWatchScore, highScore: configuredThresholds.slaRiskHighScore, criticalScore: configuredThresholds.slaRiskCriticalScore } });
    const previous = await prisma.slaRiskPrediction.findFirst({ where: { orderId: order.id }, orderBy: { generatedAt: "desc" }, select: { score: true, riskLevel: true } });
    const snapshotIds = [traffic?.id, weather?.id, region ? regionSnapshots.find((item) => item.dataType === "INCIDENT")?.id : undefined].filter((id): id is string => Boolean(id));
    const prediction = await prisma.slaRiskPrediction.create({ data: { orderId: order.id, routePlanId: order.routePlanId, routeStopId: order.routeStop?.id ?? null, score: result.score, riskLevel: result.riskLevel, confidence: result.confidence, promisedAt: order.promisedAt, predictedDeliveryAt: result.predictedDeliveryAt, remainingBufferMin: result.remainingBufferMin, factorsJson: JSON.stringify(result.factors), reasonsJson: JSON.stringify(result.reasons), recommendation: result.recommendation, sourceSnapshotIdsJson: JSON.stringify(snapshotIds), dataSourcesJson: JSON.stringify(result.dataSources), generatedAt: now, expiresAt: new Date(now.getTime() + 5 * 60_000), stale: result.stale, previousScore: previous?.score ?? null, previousRiskLevel: previous?.riskLevel ?? null, scoreChange: previous ? Math.round((result.score - previous.score) * 10) / 10 : null } });
    await upsertRiskException({ order, predictionId: prediction.id, result, actorUserId: input.actorUserId, actorRole: input.actorRole });
    await recordAuditEventSafe({ eventType: "SLA_RISK", action: "CALCULATE", summary: `Predictive SLA risk calculated for ${order.externalOrderId ?? order.id}.`, reason: result.reasons.join(" "), actorUserId: input.actorUserId, actorRole: input.actorRole, entityType: "SlaRiskPrediction", entityId: prediction.id, slaRiskPredictionId: prediction.id, routePlanId: order.routePlanId, after: { score: result.score, riskLevel: result.riskLevel, confidence: result.confidence, factors: result.factors, dataSources: result.dataSources, trigger: input.trigger ?? "MANUAL" } });
    results.push(toView({ ...prediction, order: { externalOrderId: order.externalOrderId, recipientAddress: order.recipientAddress }, dataSources: result.dataSources }));
  }
  return { generatedAt: now.toISOString(), predictions: results, scanned: orders.length, highRisk: results.filter((item) => item.riskLevel === "HIGH" || item.riskLevel === "CRITICAL").length };
}

export async function listLatestSlaRiskPredictions(input: { orderId?: string; routePlanId?: string; includeDelivered?: boolean; driverId?: string } = {}) {
  const rows = await prisma.slaRiskPrediction.findMany({ where: { ...(input.orderId ? { orderId: input.orderId } : {}), ...(input.routePlanId ? { routePlanId: input.routePlanId } : {}), ...(input.driverId ? { routePlan: { driverId: input.driverId } } : {}), ...(input.includeDelivered ? {} : { order: { status: { not: "DELIVERED" } } }) }, orderBy: { generatedAt: "desc" }, take: 1000, include: { order: { select: { externalOrderId: true, recipientAddress: true } } } });
  const seen = new Set<string>();
  return rows.filter((row) => { if (seen.has(row.orderId)) return false; seen.add(row.orderId); return true; }).map((row) => toView(row));
}

export async function acknowledgeSlaRisk(orderId: string, actorUserId: string, actorRole: string, action: "ACKNOWLEDGE" | "MONITOR", note?: string) {
  const exception = await prisma.controlTowerException.findFirst({ where: { orderId, kind: "PREDICTIVE_SLA_RISK", status: { not: "RESOLVED" } }, orderBy: { detectedAt: "desc" } });
  if (!exception) return null;
  const resolutionNote = note?.trim() || (action === "MONITOR" ? "Ops marked the prediction for monitoring." : "Ops acknowledged the predictive SLA risk.");
  const updated = await prisma.controlTowerException.update({ where: { id: exception.id }, data: { status: "ACKNOWLEDGED", acknowledgedAt: new Date(), acknowledgedByUserId: actorUserId } });
  await recordAuditEventSafe({ eventType: "SLA_RISK", action, summary: action === "MONITOR" ? "Predictive SLA risk placed under monitoring." : "Predictive SLA risk acknowledged.", reason: resolutionNote, actorUserId, actorRole, entityType: "ControlTowerException", entityId: exception.id, exceptionId: exception.id, routePlanId: exception.routePlanId, after: { status: updated.status, orderId } });
  return { id: updated.id, status: updated.status, note: resolutionNote };
}

export async function getSlaRiskPrediction(orderId: string) {
  const row = await prisma.slaRiskPrediction.findFirst({ where: { orderId }, orderBy: { generatedAt: "desc" }, include: { order: { select: { externalOrderId: true, recipientAddress: true } } } });
  return row ? toView(row) : null;
}

export async function getSlaRiskHistory(orderId: string) {
  const rows = await prisma.slaRiskPrediction.findMany({ where: { orderId }, orderBy: { generatedAt: "desc" }, take: 50, include: { order: { select: { externalOrderId: true, recipientAddress: true } } } });
  return rows.map((row) => toView(row));
}

export async function getSlaRiskMetrics() {
  const [predictions, delivered] = await Promise.all([
    prisma.slaRiskPrediction.findMany({ orderBy: { generatedAt: "desc" }, take: 2000, include: { order: { select: { status: true, promisedAt: true, deliveredAt: true } } } }),
    prisma.order.findMany({ where: { status: "DELIVERED", promisedAt: { not: null }, deliveredAt: { not: null } }, select: { promisedAt: true, deliveredAt: true } }),
  ]);
  const latest = new Map<string, typeof predictions[number]>();
  for (const prediction of predictions) if (!latest.has(prediction.orderId)) latest.set(prediction.orderId, prediction);
  const active = [...latest.values()].filter((prediction) => prediction.order.status !== "DELIVERED");
  const evaluated = [...latest.values()].filter((prediction) => prediction.order.status === "DELIVERED" && prediction.order.promisedAt && prediction.order.deliveredAt);
  const predictedLate = evaluated.filter((prediction) => prediction.riskLevel === "HIGH" || prediction.riskLevel === "CRITICAL");
  const actualLate = evaluated.filter((prediction) => prediction.order.deliveredAt! > prediction.order.promisedAt!);
  const correct = evaluated.filter((prediction) => (prediction.riskLevel === "HIGH" || prediction.riskLevel === "CRITICAL") === (prediction.order.deliveredAt! > prediction.order.promisedAt!)).length;
  const earlyWarnings = evaluated.filter((prediction) => (prediction.riskLevel === "HIGH" || prediction.riskLevel === "CRITICAL") && prediction.generatedAt < prediction.promisedAt).map((prediction) => (prediction.promisedAt.getTime() - prediction.generatedAt.getTime()) / 60_000);
  return { generatedAt: new Date().toISOString(), activeOrders: active.length, activeHighRisk: active.filter((prediction) => prediction.riskLevel === "HIGH" || prediction.riskLevel === "CRITICAL").length, activeCritical: active.filter((prediction) => prediction.riskLevel === "CRITICAL").length, predictionsGenerated: predictions.length, evaluatedPredictions: evaluated.length, actualLateOrders: actualLate.length, predictedLateOrders: predictedLate.length, preventedLateDeliveriesEstimate: evaluated.filter((prediction) => (prediction.riskLevel === "HIGH" || prediction.riskLevel === "CRITICAL") && prediction.order.deliveredAt! <= prediction.order.promisedAt!).length, averageWarningMin: earlyWarnings.length ? Math.round(earlyWarnings.reduce((sum, value) => sum + value, 0) / earlyWarnings.length) : null, accuracyPercent: evaluated.length ? Math.round((correct / evaluated.length) * 100) : null, falsePositiveRatePercent: evaluated.length ? Math.round((predictedLate.filter((prediction) => prediction.order.deliveredAt! <= prediction.order.promisedAt!).length / Math.max(1, predictedLate.length)) * 100) : null, byRiskLevel: ["LOW", "WATCH", "HIGH", "CRITICAL"].map((riskLevel) => ({ riskLevel, count: active.filter((prediction) => prediction.riskLevel === riskLevel).length })), note: delivered.length < 3 ? "Accuracy is provisional until at least three delivered orders have prediction history." : "Accuracy compares the latest prediction available before delivery with the delivered outcome." };
}
