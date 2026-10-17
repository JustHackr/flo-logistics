import type { ActorView, CustodyEventView, CustodyGraph, ResponsibilityWindow } from "./types";

export function buildCustodyGraph(events: CustodyEventView[]): CustodyGraph {
  const nodes = new Map<string, ActorView>();
  const edges = events.map((event) => {
    if (event.fromActor) nodes.set(event.fromActor.id, event.fromActor);
    if (event.toActor) nodes.set(event.toActor.id, event.toActor);
    return { eventId: event.id, from: event.fromActor, to: event.toActor, eventType: event.eventType, observedAt: event.observedAt, hubCode: event.hubCode, validationStatus: event.validationStatus, confidenceDelta: event.confidenceDelta };
  });
  return { nodes: [...nodes.values()], edges };
}

export function calculateResponsibilityWindow(events: CustodyEventView[], anomalies: Array<{ kind: string; eventIds: string[] }>): ResponsibilityWindow {
  const sorted = [...events].sort((a, b) => a.observedAt.localeCompare(b.observedAt));
  const good = sorted.filter((event) => ["VERIFIED", "PARTIALLY_VERIFIED"].includes(event.validationStatus));
  const badIds = new Set(anomalies.flatMap((anomaly) => anomaly.eventIds));
  const bad = sorted.find((event) => badIds.has(event.id) || event.validationStatus === "CONFLICTING" || event.eventType === "INSPECTION_COMPLETED");
  const lastGood = good.filter((event) => !bad || event.observedAt <= bad.observedAt).at(-1) ?? null;
  const firstBad = bad ?? sorted.find((event) => event.eventType === "INSPECTION_COMPLETED") ?? null;
  const actors = [...new Map(sorted.flatMap((event) => [event.fromActor, event.toActor]).filter(Boolean).map((actor) => [actor!.id, actor!])).values()];
  const locations = [...new Set(sorted.map((event) => event.hubCode).filter((value): value is string => Boolean(value)))];
  const missingEvidence = anomalies.some((a) => a.kind === "CUSTODY_MISSING_HANDOFF") ? ["Receiving scan or vehicle loading evidence"] : [];
  const from = lastGood?.observedAt ?? null; const to = firstBad?.observedAt ?? null;
  const statement = from && to ? `Review window: ${new Date(from).toLocaleString("en-ID")}–${new Date(to).toLocaleString("en-ID")}. FLO found a custody gap; this is an operational review window, not automatic blame.` : "A complete responsibility window is not available yet.";
  return { lastKnownGood: lastGood ? { eventId: lastGood.id, label: lastGood.eventType, location: lastGood.hubCode ?? "Unknown location", observedAt: lastGood.observedAt } : null, firstKnownBad: firstBad ? { eventId: firstBad.id, label: firstBad.eventType, location: firstBad.hubCode ?? "Unknown location", observedAt: firstBad.observedAt } : null, from, to, candidateCustodians: actors, candidateLocations: locations, missingEvidence, confidence: from && to ? 78 : 35, statement };
}

