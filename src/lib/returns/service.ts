import { prisma } from "@/lib/prisma";
import { recordAuditEventSafe } from "@/lib/audit";
import { assessReturnFraud } from "./fraud";
import { calculateReturnEconomics } from "./economics";
import { recommendDisposition } from "./disposition";
import { inspectReturn } from "./inspection";
import { recommendRefund } from "./refunds";
import { assertTransition } from "./state-machine";
import { FixtureReturnsProvider, getReturnsProvider } from "./providers";
import { RETURN_DEMO_ID, RETURN_FIXTURES } from "./fixtures";
import type { Disposition, FraudAssessment, ReturnCaseView, ReturnRiskLevel, ReturnState } from "./types";

function parse<T>(value: string | null | undefined, fallback: T): T { if (!value) return fallback; try { return JSON.parse(value) as T; } catch { return fallback; } }

export async function ensureDemoReturnCase(actorUserId?: string) {
  const existing = await prisma.returnCase.findUnique({ where: { externalReturnId: RETURN_DEMO_ID }, select: { id: true } });
  if (existing) return existing.id;
  const fixture = RETURN_FIXTURES[0];
  const order = fixture.externalOrderId ? await prisma.order.findFirst({ where: { externalOrderId: fixture.externalOrderId }, select: { id: true } }) : null;
  const created = await prisma.returnCase.create({ data: {
    externalReturnId: fixture.externalReturnId, orderId: order?.id, customerReference: "Customer synthetic demo", reason: fixture.reason,
    state: fixture.state, expectedHub: fixture.expectedHub, sourceSystem: "blibli_oms", dataSource: "SYNTHETIC", expectedSku: "SKU-PHONE-001", expectedSerial: "SN-RET-001",
    parcel: { create: { code: "RET-QR-BLI-RET-DEMO-001", qrPayload: RETURN_DEMO_ID, barcodePayload: RETURN_DEMO_ID, sku: "SKU-PHONE-001", serialNumber: "SN-RET-001", expectedHub: fixture.expectedHub, custodyStatus: "EXPECTED" } },
    events: { create: { eventType: "RETURN_CREATED", fromState: null, toState: "REQUESTED", externalEventId: "ret-demo-created", sourceSystem: "blibli_oms", dataSource: "SYNTHETIC", location: "Blibli OMS", occurredAt: new Date("2026-09-17T01:00:00.000Z"), actorUserId } },
  }, select: { id: true } });
  await recordAuditEventSafe({ eventType: "RETURN_CASE", action: "CREATE", summary: "Synthetic return case created for the reverse-logistics demo.", actorUserId, actorRole: "SYSTEM", entityType: "ReturnCase", entityId: created.id, sourceSystem: "blibli_oms", metadata: { externalReturnId: RETURN_DEMO_ID, dataSource: "SYNTHETIC" } });
  return created.id;
}

export async function syncFixtureReturns(actorUserId?: string) {
  const provider = process.env.BLIBLI_RETURNS_API_URL ? getReturnsProvider() : new FixtureReturnsProvider();
  const returns = await provider.getReturns({});
  let created = 0;
  for (const item of returns) {
    const existing = await prisma.returnCase.findUnique({ where: { externalReturnId: item.externalReturnId }, select: { id: true } });
    if (!existing) { await ensureDemoReturnCase(actorUserId); created += 1; }
  }
  return { provider: provider.name, received: returns.length, created };
}

async function getCase(id: string) {
  const row = await prisma.returnCase.findUnique({ where: { id }, include: {
    order: { select: { externalOrderId: true } }, parcel: true,
    inspections: { orderBy: { createdAt: "desc" }, take: 1 }, fraudAssessments: { orderBy: { createdAt: "desc" }, take: 1 },
    refundDecisions: { orderBy: { createdAt: "desc" }, take: 1 }, dispositionDecisions: { orderBy: { createdAt: "desc" }, take: 1 },
    costEstimates: { orderBy: { createdAt: "desc" }, take: 1 }, carbonEstimates: { orderBy: { createdAt: "desc" }, take: 1 },
    events: { orderBy: { occurredAt: "asc" }, take: 50 }, scans: { orderBy: { createdAt: "desc" }, take: 10 }, exceptions: { where: { status: { not: "RESOLVED" } }, take: 50 },
  } });
  if (!row) throw new Error("Return case not found");
  return row;
}

function mapView(row: Awaited<ReturnType<typeof getCase>>): ReturnCaseView {
  const inspection = row.inspections[0];
  const fraud = row.fraudAssessments[0];
  const refund = row.refundDecisions[0];
  const disposition = row.dispositionDecisions[0];
  const cost = row.costEstimates[0];
  const carbon = row.carbonEstimates[0];
  return {
    id: row.id, externalReturnId: row.externalReturnId, orderId: row.orderId, externalOrderId: row.order?.externalOrderId ?? null, customerReference: row.customerReference,
    reason: row.reason, state: row.state as ReturnState, expectedHub: row.expectedHub, currentHub: row.parcel?.currentHub ?? null, dataSource: row.dataSource,
    riskLevel: row.riskLevel as ReturnRiskLevel, riskScore: row.riskScore, expectedSku: row.expectedSku, currentSku: row.parcel?.sku ?? row.currentSku,
    expectedSerial: row.expectedSerial, currentSerial: row.parcel?.serialNumber ?? row.currentSerial, parcelCode: row.parcel?.code ?? null,
    latestInspection: inspection ? { result: inspection.result as never, notes: inspection.notes, createdAt: inspection.createdAt.toISOString() } : null,
    latestFraud: fraud ? { score: fraud.score, riskLevel: fraud.riskLevel as ReturnRiskLevel, confidence: fraud.confidence as never, signals: parse(fraud.signalsJson, []), reasons: parse(fraud.reasonsJson, []), recommendation: fraud.recommendation, requiresApproval: fraud.requiresApproval, sourceEventIds: parse(fraud.sourceEventIdsJson, []) } : null,
    latestRefund: refund ? { decision: refund.decision as never, amount: refund.amount, status: refund.status, rationale: refund.rationale } : null,
    latestDisposition: disposition ? { disposition: disposition.disposition as Disposition, status: disposition.status, rationale: disposition.rationale, netRecovery: disposition.netRecovery } : null,
    cost: cost ? { totalCost: cost.totalCost, recoveryValue: cost.recoveryValue, netRecovery: cost.netRecovery } : null, carbonKg: carbon?.totalKg ?? null, openExceptions: row.exceptions.length,
    events: row.events.map((event) => ({ id: event.id, eventType: event.eventType, fromState: event.fromState, toState: event.toState, location: event.location, dataSource: event.dataSource, occurredAt: event.occurredAt.toISOString() })),
  };
}

export async function listReturns() { await ensureDemoReturnCase(); const rows = await prisma.returnCase.findMany({ orderBy: { updatedAt: "desc" }, select: { id: true } }); return Promise.all(rows.map(async (row) => mapView(await getCase(row.id)))); }
export async function getReturnView(id: string) { return mapView(await getCase(id)); }
export async function createReturnCase(input: { externalReturnId: string; orderId?: string; reason: string; expectedHub: string; expectedSku?: string; expectedSerial?: string; actorUserId?: string; dataSource?: string }) {
  const row = await prisma.returnCase.create({ data: { externalReturnId: input.externalReturnId, orderId: input.orderId, reason: input.reason, expectedHub: input.expectedHub, expectedSku: input.expectedSku, expectedSerial: input.expectedSerial, sourceSystem: "blibli_oms", dataSource: input.dataSource ?? "LIVE", parcel: { create: { code: `RET-QR-${input.externalReturnId}`, qrPayload: input.externalReturnId, sku: input.expectedSku, serialNumber: input.expectedSerial, expectedHub: input.expectedHub } }, events: { create: { eventType: "RETURN_CREATED", toState: "REQUESTED", sourceSystem: "blibli_oms", dataSource: input.dataSource ?? "LIVE", occurredAt: new Date(), actorUserId: input.actorUserId } } } });
  return getReturnView(row.id);
}

async function createException(input: { returnCaseId: string; kind: string; severity: "WATCH" | "HIGH" | "CRITICAL"; reason: string; source: string; recommendation?: string; actorUserId?: string }) {
  const dedupeKey = `return:${input.returnCaseId}:${input.kind}`;
  const existing = await prisma.returnException.findFirst({ where: { returnCaseId: input.returnCaseId, kind: input.kind, status: "OPEN" }, select: { id: true } });
  if (existing) return existing.id;
  const exception = await prisma.returnException.create({ data: { returnCaseId: input.returnCaseId, kind: input.kind, severity: input.severity, reason: input.reason, explanation: input.reason, source: input.source, recommendation: input.recommendation } });
  const tower = await prisma.controlTowerException.upsert({ where: { dedupeKey }, create: { dedupeKey, kind: input.kind as never, severity: input.severity, status: "OPEN", reason: input.reason, sourceSystem: input.source, returnCaseId: input.returnCaseId }, update: { status: "OPEN", reason: input.reason, severity: input.severity, resolvedAt: null, resolutionNote: null } });
  await recordAuditEventSafe({ eventType: "RETURN_EXCEPTION", action: "OPEN", summary: `Return exception ${input.kind} opened.`, reason: input.reason, actorUserId: input.actorUserId, actorRole: input.actorUserId ? undefined : "SYSTEM", entityType: "ReturnException", entityId: exception.id, exceptionId: tower.id, metadata: { returnCaseId: input.returnCaseId, recommendation: input.recommendation } });
  return exception.id;
}

export async function transitionReturn(id: string, to: ReturnState, input: { actorUserId?: string; actorRole?: string; reason?: string; validQr?: boolean } = {}) {
  const row = await getCase(id);
  const inspectionComplete = row.inspections.length > 0;
  const unresolvedFraud = row.fraudAssessments[0]?.riskLevel === "HIGH" || row.fraudAssessments[0]?.riskLevel === "CRITICAL";
  assertTransition(row.state as ReturnState, to, { ...input, inspectionComplete, unresolvedFraud });
  const updated = await prisma.returnCase.update({ where: { id }, data: { state: to, closedAt: to === "CLOSED" ? new Date() : undefined } });
  await prisma.returnEvent.create({ data: { returnCaseId: id, eventType: "STATE_CHANGED", fromState: row.state, toState: to, sourceSystem: "flo", dataSource: row.dataSource, payloadJson: JSON.stringify({ reason: input.reason ?? null }), actorUserId: input.actorUserId, occurredAt: new Date() } });
  await recordAuditEventSafe({ eventType: "RETURN_CASE", action: "STATE_CHANGE", summary: `Return moved from ${row.state} to ${to}.`, reason: input.reason, actorUserId: input.actorUserId, actorRole: input.actorRole, entityType: "ReturnCase", entityId: id, before: { state: row.state }, after: { state: to } });
  return mapView(await getCase(updated.id));
}

export async function scanReturn(id: string, input: { code: string; hubCode: string; stage: string; format?: string; actorUserId?: string; source?: string; sku?: string }) {
  const row = await getCase(id); const code = input.code.trim().toUpperCase();
  const duplicate = await prisma.returnScan.findFirst({ where: { returnCaseId: id, code, stage: input.stage }, select: { id: true } });
  let outcome: string = "VERIFIED"; let reason = "Return QR matched the active return, expected hub, and current custody stage.";
  if (row.state === "CLOSED") { outcome = "RETURN_ALREADY_CLOSED"; reason = "Return is already closed."; }
  else if (duplicate) { outcome = "DUPLICATE_SCAN"; reason = "The same return code was already scanned at this stage."; }
  else if (code !== row.parcel?.code && code !== row.externalReturnId && code !== row.parcel?.qrPayload) { outcome = "UNKNOWN_RETURN"; reason = "Code does not match the return parcel identity."; }
  else if (input.hubCode !== row.expectedHub) { outcome = "WRONG_HUB"; reason = `Return is expected at ${row.expectedHub}, not ${input.hubCode}.`; }
  else if (input.sku && row.expectedSku && input.sku !== row.expectedSku) { outcome = "WRONG_ITEM"; reason = "Scanned item SKU conflicts with the return request."; }
  const scan = await prisma.returnScan.create({ data: { returnCaseId: id, code, format: input.format ?? "QR_CODE", stage: input.stage, outcome, hubCode: input.hubCode, expectedHub: row.expectedHub, source: input.source ?? row.dataSource, reason, actorUserId: input.actorUserId, metadataJson: JSON.stringify({ sku: input.sku ?? null }) } });
  await prisma.returnEvent.create({ data: { returnCaseId: id, eventType: "RETURN_SCAN", fromState: row.state, toState: null, sourceSystem: "flo", dataSource: input.source ?? row.dataSource, location: input.hubCode, payloadJson: JSON.stringify({ scanId: scan.id, outcome, stage: input.stage }), actorUserId: input.actorUserId, occurredAt: new Date() } });
  if (outcome !== "VERIFIED") { await createException({ returnCaseId: id, kind: outcome === "DUPLICATE_SCAN" ? "RETURN_DUPLICATE_SCAN" : outcome === "WRONG_HUB" ? "RETURN_WRONG_HUB" : "RETURN_QR_MISMATCH", severity: outcome === "WRONG_HUB" ? "HIGH" : "WATCH", reason, source: input.source ?? row.dataSource, recommendation: "Hold the return and ask Warehouse or Ops to verify identity and custody.", actorUserId: input.actorUserId }); }
  else if (row.state === "RECEIVED_AT_HUB") await transitionReturn(id, "SCAN_REVIEW", { actorUserId: input.actorUserId, actorRole: "WAREHOUSE" });
  else if (["REQUESTED", "APPROVED", "AWAITING_PICKUP", "PICKED_UP", "IN_TRANSIT"].includes(row.state)) { await prisma.returnCase.update({ where: { id }, data: { state: "SCAN_REVIEW" } }); await prisma.returnEvent.create({ data: { returnCaseId: id, eventType: "STATE_CHANGED", fromState: row.state, toState: "SCAN_REVIEW", sourceSystem: "flo", dataSource: row.dataSource, location: input.hubCode, actorUserId: input.actorUserId, occurredAt: new Date() } }); }
  const afterScan = await getCase(id);
  if (outcome === "VERIFIED" && afterScan.state === "SCAN_REVIEW") await transitionReturn(id, "INSPECTION_PENDING", { actorUserId: input.actorUserId, actorRole: "WAREHOUSE", validQr: true });
  return { scanId: scan.id, outcome, reason, case: await getReturnView(id) };
}

export async function inspectReturnCase(id: string, input: Parameters<typeof inspectReturn>[0] & { actorUserId?: string }) {
  const row = await getCase(id); const result = inspectReturn(input);
  const inspection = await prisma.returnInspection.create({ data: { returnCaseId: id, result: result.result, checklistJson: JSON.stringify(result.checklist), cvResultJson: JSON.stringify(result.cv), notes: result.reasons.join(" "), source: result.source, actorUserId: input.actorUserId, evidence: { create: result.reasons.map((label, index) => ({ evidenceType: index === 0 ? "FIXTURE" : "RULE", label, metadataJson: JSON.stringify({ fixtureId: result.fixtureId, synthetic: result.source.includes("FIXTURE") }) })) } } });
  if (["SCAN_REVIEW", "INSPECTION_PENDING"].includes(row.state)) await transitionReturn(id, "INSPECTION_COMPLETE", { actorUserId: input.actorUserId, actorRole: "WAREHOUSE" });
  if (!["PASS", "MINOR_DAMAGE"].includes(result.result)) await createException({ returnCaseId: id, kind: "RETURN_DAMAGE_DETECTED", severity: ["UNSAFE", "COUNTERFEIT_SUSPECTED"].includes(result.result) ? "CRITICAL" : "HIGH", reason: `${result.result}: ${result.reasons.join(" ")}`, source: result.source, recommendation: "Keep the parcel in review until inspection and fraud decisions are approved.", actorUserId: input.actorUserId });
  await recordAuditEventSafe({ eventType: "RETURN_INSPECTION", action: "COMPLETE", summary: `Return inspection completed with result ${result.result}.`, actorUserId: input.actorUserId, actorRole: "WAREHOUSE", entityType: "ReturnInspection", entityId: inspection.id, metadata: result });
  return { inspectionId: inspection.id, result, case: await getReturnView(id) };
}

export async function assessReturnCase(id: string, input: { actorUserId?: string; overrides?: Record<string, boolean> }) {
  const row = await getCase(id); const inspection = row.inspections[0]; const scan = row.scans[0];
  const fraud = assessReturnFraud({ qrOutcome: scan?.outcome, duplicateScan: scan?.outcome === "DUPLICATE_SCAN", wrongHub: scan?.outcome === "WRONG_HUB", wrongItem: inspection?.result === "WRONG_ITEM", serialMismatch: inspection?.result === "MANUAL_REVIEW", conditionConflict: ["UNSAFE", "COUNTERFEIT_SUSPECTED"].includes(inspection?.result ?? ""), missingCustody: row.events.length < 2, eventIds: row.events.map((event) => event.id), ...(input.overrides ?? {}) });
  const assessment = await prisma.returnFraudAssessment.create({ data: { returnCaseId: id, score: fraud.score, riskLevel: fraud.riskLevel, confidence: fraud.confidence, reasonsJson: JSON.stringify(fraud.reasons), signalsJson: JSON.stringify(fraud.signals), recommendation: fraud.recommendation, requiresApproval: fraud.requiresApproval, sourceEventIdsJson: JSON.stringify(fraud.sourceEventIds), actorUserId: input.actorUserId } });
  await prisma.returnCase.update({ where: { id }, data: { riskScore: fraud.score, riskLevel: fraud.riskLevel } });
  if (fraud.requiresApproval && row.state !== "FRAUD_REVIEW") { try { await transitionReturn(id, "FRAUD_REVIEW", { actorUserId: input.actorUserId, actorRole: "OPS_MANAGER" }); } catch { /* The assessment is still persisted for early lifecycle cases. */ } await createException({ returnCaseId: id, kind: "RETURN_FRAUD_REVIEW", severity: fraud.riskLevel === "CRITICAL" ? "CRITICAL" : "HIGH", reason: fraud.reasons.join(" ") || "Return requires fraud review.", source: "FLO_RULE_ENGINE", recommendation: fraud.recommendation, actorUserId: input.actorUserId }); }
  return { assessmentId: assessment.id, assessment: fraud, case: await getReturnView(id) };
}

export async function previewRefund(id: string, input: { itemValue?: number; actorUserId?: string }) {
  const row = await getCase(id); const inspection = row.inspections[0]?.result as never ?? "MANUAL_REVIEW"; const fraud = row.fraudAssessments[0];
  const fraudValue: FraudAssessment = fraud ? { score: fraud.score, riskLevel: fraud.riskLevel as ReturnRiskLevel, confidence: fraud.confidence as FraudAssessment["confidence"], signals: parse(fraud.signalsJson, []), reasons: parse(fraud.reasonsJson, []), recommendation: fraud.recommendation, requiresApproval: fraud.requiresApproval, sourceEventIds: parse(fraud.sourceEventIdsJson, []) } : assessReturnFraud({});
  const recommendation = recommendRefund({ inspection, fraud: fraudValue, itemValue: input.itemValue ?? 650000, policyWindowValid: true });
  const decision = await prisma.refundDecision.create({ data: { returnCaseId: id, decision: recommendation.decision, amount: recommendation.amount, rationale: recommendation.rationale, status: "PREVIEW", actorUserId: input.actorUserId } });
  return { decisionId: decision.id, recommendation, case: await getReturnView(id) };
}

export async function decideRefund(id: string, input: { decisionId?: string; decision: string; amount?: number; approve: boolean; actorUserId: string; actorRole: string }) {
  const row = await getCase(id); const existing = input.decisionId ? await prisma.refundDecision.findUnique({ where: { id: input.decisionId } }) : row.refundDecisions[0];
  const decision = existing ?? await prisma.refundDecision.create({ data: { returnCaseId: id, decision: input.decision, amount: input.amount ?? 0, rationale: "Operator decision", actorUserId: input.actorUserId } });
  const status = input.approve ? (input.decision === "REFUND_HELD" ? "HELD" : "APPROVED") : "REJECTED";
  await prisma.refundDecision.update({ where: { id: decision.id }, data: { decision: input.decision, amount: input.amount ?? decision.amount, status, decidedAt: new Date(), actorUserId: input.actorUserId } });
  const target = status === "HELD" ? "REFUND_HELD" : input.approve ? "REFUND_APPROVED" : "REFUND_REJECTED";
  if (row.state !== target) { try { const current = await getCase(id); if (input.approve && target === "REFUND_APPROVED" && current.state !== "REFUND_PENDING") await transitionReturn(id, "REFUND_PENDING", { actorUserId: input.actorUserId, actorRole: input.actorRole, reason: "Refund review opened." }); await transitionReturn(id, target as ReturnState, { actorUserId: input.actorUserId, actorRole: input.actorRole, reason: input.approve ? "Refund decision approved." : "Refund decision rejected." }); } catch { /* Keep the decision auditable when the operator is previewing before the ideal stage. */ } }
  if (status === "HELD") await createException({ returnCaseId: id, kind: "RETURN_REFUND_HELD", severity: "HIGH", reason: "Refund is held pending review.", source: "FLO_RULE_ENGINE", recommendation: "Ops Manager must review evidence before releasing the refund.", actorUserId: input.actorUserId });
  return { decisionId: decision.id, status, case: await getReturnView(id) };
}

export async function previewDisposition(id: string, input: { itemValue?: number; actorUserId?: string }) {
  const row = await getCase(id); const inspection = (row.inspections[0]?.result ?? "MANUAL_REVIEW") as never; const fraud = row.fraudAssessments[0];
  const fraudValue: FraudAssessment = fraud ? { score: fraud.score, riskLevel: fraud.riskLevel as ReturnRiskLevel, confidence: fraud.confidence as FraudAssessment["confidence"], signals: parse(fraud.signalsJson, []), reasons: parse(fraud.reasonsJson, []), recommendation: fraud.recommendation, requiresApproval: fraud.requiresApproval, sourceEventIds: parse(fraud.sourceEventIdsJson, []) } : assessReturnFraud({});
  const recommendation = recommendDisposition({ inspection, fraud: fraudValue, itemValue: input.itemValue ?? 650000 });
  const economics = calculateReturnEconomics({ itemValue: input.itemValue ?? 650000, disposition: recommendation.disposition });
  const decision = await prisma.dispositionDecision.create({ data: { returnCaseId: id, disposition: recommendation.disposition, rationale: recommendation.rationale, recoveryValue: economics.recoveryValue, totalCost: economics.totalCost, netRecovery: economics.netRecovery, actorUserId: input.actorUserId } });
  await prisma.returnCostEstimate.create({ data: { returnCaseId: id, pickupCost: economics.pickup, transportCost: economics.reverseTransport, hubLaborCost: economics.hubLabor, inspectionCost: economics.inspection, repackCost: economics.repack, repairCost: economics.repair, recycleCost: economics.recycle, totalCost: economics.totalCost, recoveryValue: economics.recoveryValue, netRecovery: economics.netRecovery, assumptionsJson: JSON.stringify(economics.assumptions) } });
  await prisma.returnCarbonEstimate.create({ data: { returnCaseId: id, reverseRouteKg: economics.carbonKg, totalKg: economics.carbonKg, assumptionsJson: JSON.stringify(economics.assumptions) } });
  return { decisionId: decision.id, recommendation, economics, case: await getReturnView(id) };
}

export async function decideDisposition(id: string, input: { decisionId?: string; disposition: Disposition; approve: boolean; reason?: string; actorUserId: string; actorRole: string }) {
  const row = await getCase(id); const existing = input.decisionId ? await prisma.dispositionDecision.findUnique({ where: { id: input.decisionId } }) : row.dispositionDecisions[0];
  const decision = existing ?? await prisma.dispositionDecision.create({ data: { returnCaseId: id, disposition: input.disposition, rationale: input.reason ?? "Operator decision" } });
  const status = input.approve ? "APPROVED" : "REJECTED";
  await prisma.dispositionDecision.update({ where: { id: decision.id }, data: { disposition: input.disposition, status, rationale: input.reason ?? decision.rationale, decidedAt: new Date(), actorUserId: input.actorUserId } });
  const stateFor: Record<Disposition, ReturnState> = { RESTOCK: "RESTOCKED", REPAIR: "REPAIR_REQUIRED", RECYCLE: "RECYCLED", REJECT: "REJECTED", MANUAL_REVIEW: "FRAUD_REVIEW" };
  if (input.approve) { try { const current = await getCase(id); if (current.state === "INSPECTION_COMPLETE" || current.state === "FRAUD_REVIEW") await transitionReturn(id, "DISPOSITION_PENDING", { actorUserId: input.actorUserId, actorRole: input.actorRole, reason: "Disposition review opened." }); await transitionReturn(id, stateFor[input.disposition], { actorUserId: input.actorUserId, actorRole: input.actorRole, reason: input.reason ?? "Disposition approved." }); } catch { /* Keep decision auditable even if the operator is previewing before the ideal stage. */ } }
  return { decisionId: decision.id, status, case: await getReturnView(id) };
}

export async function getReturnTimeline(id: string) { const row = await getCase(id); return { return: mapView(row), timeline: row.events, scans: row.scans, inspections: row.inspections, fraud: row.fraudAssessments, refunds: row.refundDecisions, dispositions: row.dispositionDecisions, exceptions: row.exceptions }; }
export async function getReturnMetrics() { await ensureDemoReturnCase(); const [total, open, fraud, cost] = await Promise.all([prisma.returnCase.count(), prisma.returnCase.count({ where: { state: { not: "CLOSED" } } }), prisma.returnCase.count({ where: { riskLevel: { in: ["HIGH", "CRITICAL"] } } }), prisma.returnCostEstimate.aggregate({ _sum: { totalCost: true, netRecovery: true } })]); return { total, open, fraudReview: fraud, totalCost: cost._sum.totalCost ?? 0, netRecovery: cost._sum.netRecovery ?? 0, synthetic: true }; }
