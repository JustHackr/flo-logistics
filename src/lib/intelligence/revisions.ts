import { prisma } from "@/lib/prisma";
import { adjustedDurationMin } from "./risk";
import { assessRouteConditions, associateRouteConditions } from "./service";
import { recordAuditEventSafe } from "@/lib/audit";

type RevisionStop = { routeStopId: string; orderId: string; etaAt: string | null; durationMin: number; revisedEtaAt: string; revisedDurationMin: number };

export async function createRouteRevisionPreview(routePlanId: string, userId: string, scenarioKey?: string) {
  const route = await prisma.routePlan.findUnique({ where: { id: routePlanId }, include: { warehouse: true, stops: { orderBy: { sequence: "asc" }, include: { order: true } } } });
  if (!route) throw new Error("Route plan not found");
  const points = [{ lat: route.warehouse.lat, lng: route.warehouse.lng }, ...route.stops.map((stop) => ({ lat: stop.order.lat, lng: stop.order.lng }))];
  await associateRouteConditions({ routePlanId, points, stops: route.stops.map((stop) => ({ routeStopId: stop.id, lat: stop.order.lat, lng: stop.order.lng })) });
  const assessment = await assessRouteConditions({ points });
  let clock = route.routeStartAt ?? new Date();
  const stops: RevisionStop[] = route.stops.map((stop) => {
    const revisedDurationMin = adjustedDurationMin(stop.durationMin, assessment, true);
    const revisedEtaAt = new Date(clock.getTime() + revisedDurationMin * 60_000);
    clock = new Date(revisedEtaAt.getTime() + 10 * 60_000);
    return { routeStopId: stop.id, orderId: stop.orderId, etaAt: stop.etaAt?.toISOString() ?? null, durationMin: stop.durationMin, revisedEtaAt: revisedEtaAt.toISOString(), revisedDurationMin };
  });
  const revisedDurationMin = Math.round(route.totalDurationMin * assessment.weatherPenaltyFactor * assessment.incidentPenaltyFactor * 10) / 10;
  const revision = await prisma.routeRevision.create({ data: { routePlanId, status: "DRAFT", originalDurationMin: route.totalDurationMin, revisedDurationMin, originalDistanceKm: route.totalDistanceKm, revisedDistanceKm: route.totalDistanceKm, affectedStops: stops.filter((stop) => stop.revisedDurationMin !== stop.durationMin).length, reasonsJson: JSON.stringify(assessment.reasons), previewJson: JSON.stringify({ assessment, stops }), createdByUserId: userId, scenarioKey: scenarioKey ?? null } });
  await recordAuditEventSafe({ eventType: "ROUTE_REVISION", action: "PREVIEW", summary: "Route revision preview created.", reason: assessment.reasons.join(" "), actorUserId: userId, entityType: "RouteRevision", entityId: revision.id, routePlanId, routeRevisionId: revision.id, before: { totalDurationMin: revision.originalDurationMin, totalDistanceKm: revision.originalDistanceKm }, after: { totalDurationMin: revision.revisedDurationMin, totalDistanceKm: revision.revisedDistanceKm, affectedStops: revision.affectedStops }, metadata: { assessment } });
  return { id: revision.id, routePlanId, status: revision.status, originalDurationMin: revision.originalDurationMin, revisedDurationMin: revision.revisedDurationMin, originalDistanceKm: revision.originalDistanceKm, revisedDistanceKm: revision.revisedDistanceKm, affectedStops: revision.affectedStops, reasons: assessment.reasons, assessment, stops };
}

export async function approveRouteRevision(revisionId: string, userId: string) {
  const revision = await prisma.routeRevision.findUnique({ where: { id: revisionId } });
  if (!revision) throw new Error("Route revision not found");
  if (revision.status !== "DRAFT") throw new Error("Only draft revisions can be approved");
  const preview = JSON.parse(revision.previewJson) as { stops: RevisionStop[] };
  await prisma.$transaction(async (tx) => {
    await tx.routePlan.update({ where: { id: revision.routePlanId }, data: { totalDurationMin: revision.revisedDurationMin, totalDistanceKm: revision.revisedDistanceKm } });
    for (const stop of preview.stops) await tx.routeStop.update({ where: { id: stop.routeStopId }, data: { etaAt: new Date(stop.revisedEtaAt), durationMin: stop.revisedDurationMin } });
    await tx.routeRevision.update({ where: { id: revisionId }, data: { status: "APPROVED", approvedAt: new Date(), approvedByUserId: userId } });
  });
  await recordAuditEventSafe({ eventType: "ROUTE_REVISION", action: "APPROVE", summary: "Route revision approved and applied.", actorUserId: userId, entityType: "RouteRevision", entityId: revision.id, routePlanId: revision.routePlanId, routeRevisionId: revision.id, before: { status: "DRAFT", totalDurationMin: revision.originalDurationMin, totalDistanceKm: revision.originalDistanceKm }, after: { status: "APPROVED", totalDurationMin: revision.revisedDurationMin, totalDistanceKm: revision.revisedDistanceKm }, metadata: { affectedStops: revision.affectedStops } });
  return { ok: true, revisionId, status: "APPROVED" as const };
}

export async function rejectRouteRevision(revisionId: string, userId: string) {
  const revision = await prisma.routeRevision.findUnique({ where: { id: revisionId }, select: { id: true, status: true, routePlanId: true } });
  if (!revision) throw new Error("Route revision not found");
  if (revision.status !== "DRAFT") throw new Error("Only draft revisions can be rejected");
  await prisma.routeRevision.update({ where: { id: revisionId }, data: { status: "REJECTED", rejectedAt: new Date(), rejectedByUserId: userId } });
  await recordAuditEventSafe({ eventType: "ROUTE_REVISION", action: "REJECT", summary: "Route revision rejected; active route unchanged.", actorUserId: userId, entityType: "RouteRevision", entityId: revision.id, routePlanId: revision.routePlanId, routeRevisionId: revision.id, before: { status: "DRAFT" }, after: { status: "REJECTED" } });
  return { ok: true, revisionId, status: "REJECTED" as const };
}
