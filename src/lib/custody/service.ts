import { prisma } from "@/lib/prisma";
import { recordAuditEventSafe } from "@/lib/audit";
import { ensureDemoReturnCase } from "@/lib/returns/service";
import { buildCustodyGraph, calculateResponsibilityWindow } from "./graph";
import { calculateConfidence } from "./confidence";
import { detectAnomalies } from "./anomaly";
import { CUSTODY_DEMO, demoEvents } from "./fixtures";
import type { ActorInput, AnomalyView, CustodyEventInput, CustodyEventView, CustodyParcelView, EvidenceView, ActorView } from "./types";

function parse<T>(value: string | null | undefined, fallback: T): T { if (!value) return fallback; try { return JSON.parse(value) as T; } catch { return fallback; } }

async function upsertActor(actor: ActorInput) {
  return prisma.custodyActor.upsert({ where: { actorType_externalId: { actorType: actor.actorType, externalId: actor.externalId } }, create: { ...actor }, update: { name: actor.name, hubCode: actor.hubCode, vehicleCode: actor.vehicleCode, active: true } });
}

async function ensureDemoParcel() {
  const existing = await prisma.custodyParcel.findUnique({ where: { externalParcelId: CUSTODY_DEMO.parcel }, select: { id: true } });
  if (existing) return existing.id;
  const returnCaseId = await ensureDemoReturnCase();
  const order = await prisma.order.findFirst({ where: { externalOrderId: CUSTODY_DEMO.order }, select: { id: true } });
  const parcel = await prisma.custodyParcel.create({ data: { externalParcelId: CUSTODY_DEMO.parcel, orderId: order?.id, returnCaseId, barcode: CUSTODY_DEMO.parcel, qrPayload: CUSTODY_DEMO.parcel, sku: "SKU-PHONE-001", serialNumber: "SN-OUT-001", originHub: CUSTODY_DEMO.origin, destinationHub: CUSTODY_DEMO.destination, currentState: "CREATED", currentLocation: CUSTODY_DEMO.origin, dataSource: "SYNTHETIC" } });
  return parcel.id;
}

function mapActor(actor: { id: string; actorType: string; externalId: string; name: string; hubCode: string | null; vehicleCode: string | null } | null): ActorView | null {
  return actor ? { id: actor.id, actorType: actor.actorType, externalId: actor.externalId, name: actor.name, hubCode: actor.hubCode, vehicleCode: actor.vehicleCode } : null;
}

function mapEvidence(row: { id: string; evidenceType: string; reference: string; metadataJson: string | null; capturedAt: Date | null }): EvidenceView { return { id: row.id, evidenceType: row.evidenceType, reference: row.reference, metadata: parse(row.metadataJson, {}), capturedAt: row.capturedAt?.toISOString() ?? null }; }

type ActorRecord = { id: string; actorType: string; externalId: string; name: string; hubCode: string | null; vehicleCode: string | null };
type EvidenceRecord = { id: string; evidenceType: string; reference: string; metadataJson: string | null; capturedAt: Date | null };
type EventRecord = { id: string; eventType: string; externalEventId: string; sourceSystem: string; source: string | null; dataSource: string; fromActor: ActorRecord | null; toActor: ActorRecord | null; hubCode: string | null; lat: number | null; lng: number | null; scanMethod: string | null; correlationId: string | null; validationStatus: string; validationJson: string | null; confidenceDelta: number; observedAt: Date; receivedAt: Date; evidence: EvidenceRecord[] };
type AnomalyRecord = { id: string; kind: string; severity: string; status: string; reason: string; explanation: string; sourceEventIdsJson: string; candidateCustodianIdsJson: string; recommendedAction: string; dataSource: string; createdAt: Date; resolvedAt: Date | null };

function mapEvent(row: EventRecord): CustodyEventView {
  return { id: row.id, eventType: row.eventType, externalEventId: row.externalEventId, sourceSystem: row.sourceSystem, source: row.source, dataSource: row.dataSource as CustodyEventView["dataSource"], fromActor: mapActor(row.fromActor), toActor: mapActor(row.toActor), hubCode: row.hubCode, lat: row.lat, lng: row.lng, scanMethod: row.scanMethod, correlationId: row.correlationId, validationStatus: row.validationStatus as CustodyEventView["validationStatus"], validation: parse(row.validationJson, []), confidenceDelta: row.confidenceDelta, observedAt: row.observedAt.toISOString(), receivedAt: row.receivedAt.toISOString(), evidence: row.evidence.map(mapEvidence) };
}

function mapAnomaly(row: AnomalyRecord): AnomalyView { return { id: row.id, kind: row.kind, severity: row.severity, status: row.status as AnomalyView["status"], reason: row.reason, explanation: row.explanation, sourceEventIds: parse(row.sourceEventIdsJson, []), candidateCustodianIds: parse(row.candidateCustodianIdsJson, []), recommendedAction: row.recommendedAction, dataSource: row.dataSource as AnomalyView["dataSource"], createdAt: row.createdAt.toISOString(), resolvedAt: row.resolvedAt?.toISOString() ?? null }; }

async function getRawParcel(idOrExternal: string) {
  const row = await prisma.custodyParcel.findFirst({ where: { OR: [{ id: idOrExternal }, { externalParcelId: idOrExternal }] }, include: { order: { select: { id: true, externalOrderId: true } }, returnCase: { select: { id: true, externalReturnId: true } }, currentCustodian: true, events: { orderBy: { observedAt: "asc" }, include: { fromActor: true, toActor: true, evidence: true } }, anomalies: { orderBy: { createdAt: "desc" } }, evidence: { orderBy: { createdAt: "desc" } } } });
  if (!row) throw new Error("Custody parcel not found");
  return row;
}

async function createTowerException(parcel: { id: string; orderId: string | null }, anomaly: { kind: string; severity: string; reason: string; dataSource: string }) {
  const severity = anomaly.severity as "WATCH" | "HIGH" | "CRITICAL";
  const dedupeKey = `custody:${parcel.id}:${anomaly.kind}`;
  return prisma.controlTowerException.upsert({ where: { dedupeKey }, create: { dedupeKey, kind: anomaly.kind as never, severity, status: "OPEN", reason: anomaly.reason, sourceSystem: anomaly.dataSource, orderId: parcel.orderId, custodyParcelId: parcel.id }, update: { status: "OPEN", severity, reason: anomaly.reason, sourceSystem: anomaly.dataSource, resolvedAt: null, resolutionNote: null } });
}

export async function ingestCustodyEvent(input: CustodyEventInput) {
  const parcelId = await ensureDemoParcelIfNeeded(input.externalParcelId);
  const duplicate = await prisma.custodyEvent.findUnique({ where: { sourceSystem_externalEventId: { sourceSystem: input.sourceSystem, externalEventId: input.externalEventId } }, select: { id: true } });
  if (duplicate) return { id: duplicate.id, duplicate: true, parcel: await getCustodyParcel(input.externalParcelId) };
  const parcel = await getRawParcel(parcelId);
  const fromActor = input.fromActor ? await upsertActor(input.fromActor) : null;
  const toActor = input.toActor ? await upsertActor(input.toActor) : null;
  const previous = parcel.events.at(-1);
  const validation = (await import("./validation")).validateEvent(input, { parcelBarcode: parcel.barcode, parcelQrPayload: parcel.qrPayload, expectedHub: input.eventType === "HUB_ARRIVAL" || input.eventType === "HUB_RECEIVED" ? parcel.destinationHub : parcel.originHub, expectedCustodianId: toActor?.externalId, previousObservedAt: previous?.observedAt ?? null, omsWmsAgreement: true, locationConsistent: true });
  const confidence = calculateConfidence({ checks: validation.checks, previousHandoffComplete: Boolean(previous) });
  const event = await prisma.custodyEvent.create({ data: { parcelId: parcel.id, eventType: input.eventType, externalEventId: input.externalEventId, sourceSystem: input.sourceSystem, source: input.source, dataSource: input.dataSource, fromActorId: fromActor?.id, toActorId: toActor?.id, actorUserId: input.actorUserId, hubCode: input.hubCode, lat: input.lat, lng: input.lng, scanMethod: input.scanMethod, correlationId: input.correlationId ?? `custody:${parcel.externalParcelId}`, validationStatus: validation.status, validationJson: JSON.stringify(validation.checks), confidenceDelta: validation.status === "VERIFIED" ? 10 : -10, payloadJson: JSON.stringify(input.payload ?? {}), observedAt: input.observedAt, evidence: input.evidence ? { create: input.evidence.map((item) => ({ parcelId: parcel.id, evidenceType: item.evidenceType, reference: item.reference, metadataJson: JSON.stringify(item.metadata ?? {}), capturedAt: item.capturedAt })) } : undefined } });
  await prisma.custodyParcel.update({ where: { id: parcel.id }, data: { currentState: input.eventType, currentLocation: input.hubCode ?? parcel.currentLocation, currentCustodianId: toActor?.id ?? parcel.currentCustodianId, dataSource: input.dataSource } });
  await recordAuditEventSafe({ eventType: "CUSTODY_EVENT", action: "INGEST", summary: `${input.eventType} recorded for ${parcel.externalParcelId}.`, actorUserId: input.actorUserId, actorRole: input.dataSource === "MANUAL" ? "OPS_MANAGER" : "SYSTEM", entityType: "CustodyEvent", entityId: event.id, sourceSystem: input.sourceSystem, metadata: { dataSource: input.dataSource, validation: validation.status, externalEventId: input.externalEventId } });
  return { id: event.id, duplicate: false, validation: validation.status, confidence, parcel: await getCustodyParcel(parcel.id) };
}

async function ensureDemoParcelIfNeeded(externalParcelId: string) {
  const existing = await prisma.custodyParcel.findUnique({ where: { externalParcelId }, select: { id: true } });
  if (existing) return existing.id;
  if (externalParcelId !== CUSTODY_DEMO.parcel) {
    const created = await prisma.custodyParcel.create({ data: { externalParcelId, barcode: externalParcelId, qrPayload: externalParcelId, dataSource: "MANUAL" } });
    return created.id;
  }
  return ensureDemoParcel();
}

export async function recalculateCustody(idOrExternal: string) {
  const parcel = await getRawParcel(idOrExternal);
  const events = parcel.events.map(mapEvent);
  const returnInspection = parcel.returnCaseId ? await prisma.returnInspection.findFirst({ where: { returnCaseId: parcel.returnCaseId }, orderBy: { createdAt: "desc" }, select: { result: true } }) : null;
  const anomalies = detectAnomalies(events, { expectedHub: parcel.destinationHub, destinationHub: parcel.destinationHub, closed: parcel.currentState === "DELIVERED", conditionConflict: Boolean(returnInspection && !["PASS", "MINOR_DAMAGE"].includes(returnInspection.result)) });
  await prisma.custodyAnomaly.deleteMany({ where: { parcelId: parcel.id, status: { not: "RESOLVED" } } });
  for (const anomaly of anomalies) {
    const created = await prisma.custodyAnomaly.create({ data: { parcelId: parcel.id, eventId: anomaly.eventIds.at(-1), kind: anomaly.kind, severity: anomaly.severity, status: "OPEN", dedupeKey: `custody:${parcel.id}:${anomaly.kind}`, reason: anomaly.reason, explanation: anomaly.explanation, sourceEventIdsJson: JSON.stringify(anomaly.eventIds), candidateCustodianIdsJson: JSON.stringify(anomaly.candidateActorIds), recommendedAction: anomaly.recommendedAction, dataSource: parcel.dataSource } });
    await createTowerException(parcel, created);
  }
  const confidence = calculateConfidence({ checks: [{ key: "identity", label: "Parcel identity", passed: Boolean(parcel.barcode || parcel.qrPayload), detail: "Barcode/QR identity is registered." }, { key: "hub", label: "Expected hub", passed: !anomalies.some((a) => a.kind === "CUSTODY_WRONG_HUB"), detail: "Route hub check." }, { key: "custodian", label: "Expected custodian", passed: !anomalies.some((a) => a.kind === "CUSTODY_WRONG_CUSTODIAN"), detail: "Assignment check." }, { key: "oms_wms", label: "OMS/WMS agreement", passed: true, detail: "Fixture event sources agree." }, { key: "location", label: "Geographic consistency", passed: !anomalies.some((a) => a.kind === "CUSTODY_LOCATION_CONFLICT"), detail: "Location check." }, { key: "timestamp", label: "Timestamp ordering", passed: !anomalies.some((a) => a.kind === "CUSTODY_TIME_CONFLICT"), detail: "Timestamp check." }, { key: "previous", label: "Previous handoff", passed: !anomalies.some((a) => a.kind === "CUSTODY_MISSING_HANDOFF"), detail: "Handoff continuity check." }], missingHandoff: anomalies.some((a) => a.kind === "CUSTODY_MISSING_HANDOFF"), serialMismatch: anomalies.some((a) => a.kind === "CUSTODY_SERIAL_MISMATCH"), closedReplay: anomalies.some((a) => a.kind === "CUSTODY_DUPLICATE_SCAN") });
  await prisma.custodyParcel.update({ where: { id: parcel.id }, data: { confidenceScore: confidence.score, riskLevel: confidence.riskLevel } });
  return getCustodyParcel(parcel.id);
}

export async function getCustodyParcel(idOrExternal: string): Promise<CustodyParcelView> {
  const row = await getRawParcel(idOrExternal);
  const events = row.events.map(mapEvent); const anomalies = row.anomalies.map(mapAnomaly);
  const responsibilityWindow = calculateResponsibilityWindow(events, anomalies.map((anomaly) => ({ kind: anomaly.kind, eventIds: anomaly.sourceEventIds })));
  return { id: row.id, externalParcelId: row.externalParcelId, orderId: row.orderId, externalOrderId: row.order?.externalOrderId ?? null, returnCaseId: row.returnCaseId, externalReturnId: row.returnCase?.externalReturnId ?? null, barcode: row.barcode, qrPayload: row.qrPayload, sku: row.sku, serialNumber: row.serialNumber, originHub: row.originHub, destinationHub: row.destinationHub, currentState: row.currentState, currentLocation: row.currentLocation, currentCustodian: mapActor(row.currentCustodian), confidenceScore: row.confidenceScore, riskLevel: row.riskLevel as CustodyParcelView["riskLevel"], dataSource: row.dataSource as CustodyParcelView["dataSource"], updatedAt: row.updatedAt.toISOString(), events, anomalies, evidence: row.evidence.map(mapEvidence), responsibilityWindow };
}

export async function listCustodyParcels(query?: string) {
  await ensureDemoParcel();
  const rows = await prisma.custodyParcel.findMany({ where: query ? { OR: [{ externalParcelId: { contains: query } }, { barcode: { contains: query } }, { order: { externalOrderId: { contains: query } } }] } : undefined, orderBy: [{ riskLevel: "asc" }, { updatedAt: "desc" }], take: 50, select: { id: true, externalParcelId: true, currentState: true, currentLocation: true, confidenceScore: true, riskLevel: true, dataSource: true, updatedAt: true } });
  return rows;
}

export async function getCustodyGraph(id: string) { const parcel = await getCustodyParcel(id); return { parcel, graph: buildCustodyGraph(parcel.events), timeline: parcel.events }; }
export async function getCustodyMetrics() { await ensureDemoParcel(); const [total, review, anomalies, investigations] = await Promise.all([prisma.custodyParcel.count(), prisma.custodyParcel.count({ where: { riskLevel: { in: ["REVIEW", "CRITICAL"] } } }), prisma.custodyAnomaly.count({ where: { status: { not: "RESOLVED" } } }), prisma.custodyInvestigation.count({ where: { status: { not: "RESOLVED" } } })]); return { total, review, openAnomalies: anomalies, openInvestigations: investigations, synthetic: true, live: false, fallback: false };
}

export async function resetCustodyDemo(actorUserId?: string) {
  const id = await ensureDemoParcel();
  await prisma.$transaction(async (tx) => { await tx.controlTowerException.deleteMany({ where: { custodyParcelId: id } }); await tx.custodyInvestigation.deleteMany({ where: { parcelId: id } }); await tx.custodyAnomaly.deleteMany({ where: { parcelId: id } }); await tx.custodyEvidence.deleteMany({ where: { parcelId: id } }); await tx.custodyEvent.deleteMany({ where: { parcelId: id } }); await tx.custodyParcel.update({ where: { id }, data: { currentState: "CREATED", currentLocation: CUSTODY_DEMO.origin, currentCustodianId: null, confidenceScore: 0, riskLevel: "CRITICAL" } }); });
  await recordAuditEventSafe({ eventType: "CUSTODY_DEMO", action: "RESET", summary: "Chain-of-custody demo reset.", actorUserId, actorRole: "OPS_MANAGER", entityType: "CustodyParcel", entityId: id, metadata: { synthetic: true } });
  return getCustodyParcel(id);
}

export async function runCustodyDemo(actorUserId?: string) {
  await resetCustodyDemo(actorUserId);
  const outputs = []; for (const event of demoEvents(CUSTODY_DEMO.parcel)) outputs.push(await ingestCustodyEvent({ ...event, actorUserId }));
  const parcel = await recalculateCustody(CUSTODY_DEMO.parcel);
  const investigation = await prisma.custodyInvestigation.upsert({ where: { id: `custody-demo-investigation` }, create: { id: `custody-demo-investigation`, parcelId: parcel.id, status: "OPEN", finding: parcel.responsibilityWindow.statement, confidence: parcel.responsibilityWindow.confidence, notesJson: JSON.stringify(["Synthetic demo: review hub receiving lane B."]) }, update: { status: "OPEN", finding: parcel.responsibilityWindow.statement, confidence: parcel.responsibilityWindow.confidence, resolvedAt: null } });
  await recordAuditEventSafe({ eventType: "CUSTODY_INVESTIGATION", action: "OPEN", summary: "Synthetic custody investigation opened from the missing hub handoff demo.", actorUserId, actorRole: "OPS_MANAGER", entityType: "CustodyInvestigation", entityId: investigation.id, metadata: { parcel: CUSTODY_DEMO.parcel, synthetic: true } });
  return { parcel: await getCustodyParcel(parcel.id), steps: outputs.length, investigationId: investigation.id };
}

export async function createInvestigation(input: { parcelId: string; assignedToUserId?: string; note?: string; actorUserId?: string }) { const parcel = await getRawParcel(input.parcelId); const investigation = await prisma.custodyInvestigation.create({ data: { parcelId: parcel.id, assignedToUserId: input.assignedToUserId, notesJson: JSON.stringify(input.note ? [input.note] : []) } }); await recordAuditEventSafe({ eventType: "CUSTODY_INVESTIGATION", action: "CREATE", summary: `Investigation opened for ${parcel.externalParcelId}.`, actorUserId: input.actorUserId, actorRole: "OPS_MANAGER", entityType: "CustodyInvestigation", entityId: investigation.id }); return investigation; }
export async function updateInvestigation(id: string, input: { status?: string; note?: string; finding?: string; assignedToUserId?: string; actorUserId?: string }) { const existing = await prisma.custodyInvestigation.findUnique({ where: { id } }); if (!existing) throw new Error("Investigation not found"); const notes = [...parse<string[]>(existing.notesJson, []), ...(input.note ? [input.note] : [])]; const updated = await prisma.custodyInvestigation.update({ where: { id }, data: { status: input.status, finding: input.finding, assignedToUserId: input.assignedToUserId, notesJson: JSON.stringify(notes), resolvedAt: input.status === "RESOLVED" ? new Date() : undefined } }); await recordAuditEventSafe({ eventType: "CUSTODY_INVESTIGATION", action: input.status === "RESOLVED" ? "RESOLVE" : "UPDATE", summary: `Custody investigation ${input.status ?? "updated"}.`, actorUserId: input.actorUserId, actorRole: "OPS_MANAGER", entityType: "CustodyInvestigation", entityId: id, metadata: input }); return updated; }
export async function updateAnomaly(id: string, status: "ACKNOWLEDGED" | "RESOLVED", actorUserId?: string) { const anomaly = await prisma.custodyAnomaly.update({ where: { id }, data: { status, acknowledgedAt: status === "ACKNOWLEDGED" ? new Date() : undefined, resolvedAt: status === "RESOLVED" ? new Date() : undefined, resolvedByUserId: status === "RESOLVED" ? actorUserId : undefined } }); await prisma.controlTowerException.updateMany({ where: { custodyParcelId: anomaly.parcelId, reason: anomaly.reason, status: { not: "RESOLVED" } }, data: status === "RESOLVED" ? { status: "RESOLVED", resolvedAt: new Date(), resolvedByUserId: actorUserId } : { status: "ACKNOWLEDGED", acknowledgedAt: new Date(), acknowledgedByUserId: actorUserId } }); return anomaly; }

/** Bridges a Returns Intelligence observation into the original outbound graph. */
export async function recordReturnCustodyEvent(input: { returnCaseId: string; eventType: string; externalEventId: string; hubCode?: string; actorUserId?: string; dataSource: "LIVE" | "SYNTHETIC" | "FALLBACK" | "MANUAL"; payload?: Record<string, unknown> }) {
  const parcel = await prisma.custodyParcel.findFirst({ where: { returnCaseId: input.returnCaseId }, select: { externalParcelId: true } });
  if (!parcel) return null;
  return ingestCustodyEvent({ externalParcelId: parcel.externalParcelId, eventType: input.eventType, externalEventId: input.externalEventId, sourceSystem: "blibli_returns", source: "Returns Intelligence bridge", dataSource: input.dataSource, hubCode: input.hubCode, scanMethod: "RETURN_QR_SCAN", actorUserId: input.actorUserId, observedAt: new Date(), payload: input.payload });
}
