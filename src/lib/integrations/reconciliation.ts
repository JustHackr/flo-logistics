import { prisma } from "@/lib/prisma";
import { recordAuditEventSafe } from "@/lib/audit";

type ReconciliationIssueType = "OMS_ONLY" | "WMS_ONLY" | "STATUS_CONFLICT" | "STALE_UPDATE" | "DUPLICATE_EVENT";

function parseErrors(value: string | null) {
  if (!value) return [] as Array<{ error?: string; input?: Record<string, unknown> }>;
  try { return JSON.parse(value) as Array<{ error?: string; input?: Record<string, unknown> }>; } catch { return []; }
}

async function upsertIssue(input: {
  issueType: ReconciliationIssueType;
  externalOrderId: string;
  orderId?: string;
  integrationRunId?: string;
  omsStatus?: string;
  wmsStatus?: string;
  details: Record<string, unknown>;
}) {
  const now = new Date();
  return prisma.reconciliationIssue.upsert({
    where: { issueType_externalOrderId_status: { issueType: input.issueType, externalOrderId: input.externalOrderId, status: "OPEN" } },
    create: { issueType: input.issueType, externalOrderId: input.externalOrderId, orderId: input.orderId, integrationRunId: input.integrationRunId, omsStatus: input.omsStatus, wmsStatus: input.wmsStatus, detailsJson: JSON.stringify(input.details), firstDetectedAt: now, lastDetectedAt: now },
    update: { orderId: input.orderId, integrationRunId: input.integrationRunId, omsStatus: input.omsStatus, wmsStatus: input.wmsStatus, detailsJson: JSON.stringify(input.details), lastDetectedAt: now },
  });
}

export async function reconcileIntegrationData(input: { integrationRunId?: string; actorUserId?: string; actorRole?: string } = {}) {
  const orders = await prisma.order.findMany({
    where: { sourceSystem: "blibli_oms" },
    select: { id: true, externalOrderId: true, status: true, fulfillmentStatus: true, receivedAt: true, fulfillmentEvents: { orderBy: { receivedAt: "asc" }, select: { id: true, externalEventId: true, status: true, occurredAt: true, receivedAt: true } } },
  });
  const issueIds: string[] = [];
  const now = Date.now();

  for (const order of orders) {
    if (!order.externalOrderId) continue;
    if (order.fulfillmentEvents.length === 0 && order.status !== "DELIVERED" && order.receivedAt && now - order.receivedAt.getTime() >= 30 * 60_000) {
      const issue = await upsertIssue({ issueType: "OMS_ONLY", externalOrderId: order.externalOrderId, orderId: order.id, integrationRunId: input.integrationRunId, omsStatus: order.status, details: { message: "OMS order has no WMS fulfillment event after 30 minutes." } });
      issueIds.push(issue.id);
    }

    const latest = order.fulfillmentEvents.at(-1);
    if (latest && order.status === "DELIVERED" && latest.status === "EXCEPTION") {
      const issue = await upsertIssue({ issueType: "STATUS_CONFLICT", externalOrderId: order.externalOrderId, orderId: order.id, integrationRunId: input.integrationRunId, omsStatus: order.status, wmsStatus: latest.status, details: { message: "OMS reports delivered while WMS reports an exception.", fulfillmentEventId: latest.id } });
      issueIds.push(issue.id);
    }

    for (let index = 1; index < order.fulfillmentEvents.length; index += 1) {
      const previous = order.fulfillmentEvents[index - 1];
      const current = order.fulfillmentEvents[index];
      if (current.occurredAt < previous.occurredAt) {
        const issue = await upsertIssue({ issueType: "STALE_UPDATE", externalOrderId: order.externalOrderId, orderId: order.id, integrationRunId: input.integrationRunId, omsStatus: order.status, wmsStatus: current.status, details: { message: "WMS event arrived with an older occurrence time than a previous event.", eventId: current.id, occurredAt: current.occurredAt.toISOString(), previousOccurredAt: previous.occurredAt.toISOString() } });
        issueIds.push(issue.id);
        break;
      }
    }
  }

  if (input.integrationRunId) {
    const run = await prisma.integrationRun.findUnique({ where: { id: input.integrationRunId }, select: { errorsJson: true } });
    for (const error of parseErrors(run?.errorsJson ?? null)) {
      const externalOrderId = typeof error.input?.externalOrderId === "string" ? error.input.externalOrderId : null;
      if (!externalOrderId) continue;
      const duplicate = error.error?.toLowerCase().includes("duplicate");
      const issue = await upsertIssue({ issueType: duplicate ? "DUPLICATE_EVENT" : "WMS_ONLY", externalOrderId, integrationRunId: input.integrationRunId, details: { message: error.error ?? "WMS row could not be reconciled.", input: error.input ?? {} } });
      issueIds.push(issue.id);
    }
  }

  await recordAuditEventSafe({ eventType: "RECONCILIATION", action: "SCAN", summary: `OMS/WMS reconciliation scanned ${orders.length} OMS orders.`, actorUserId: input.actorUserId, actorRole: input.actorRole, entityType: "Reconciliation", entityId: input.integrationRunId ?? "all", integrationRunId: input.integrationRunId, after: { ordersScanned: orders.length, openIssuesDetected: issueIds.length } });
  return { ordersScanned: orders.length, openIssuesDetected: issueIds.length };
}

function parseIssue(row: { detailsJson: string; [key: string]: unknown }) {
  let details: Record<string, unknown> = {};
  try { details = JSON.parse(row.detailsJson) as Record<string, unknown>; } catch { /* keep empty details */ }
  return { ...row, details, detailsJson: undefined };
}

export async function listReconciliationIssues(status?: string) {
  const rows = await prisma.reconciliationIssue.findMany({ where: status ? { status } : undefined, orderBy: [{ status: "asc" }, { lastDetectedAt: "desc" }], take: 200 });
  return rows.map(parseIssue);
}

export async function resolveReconciliationIssue(issueId: string, userId: string, note?: string) {
  const issue = await prisma.reconciliationIssue.findUnique({ where: { id: issueId } });
  if (!issue) throw new Error("Reconciliation issue not found");
  const resolved = await prisma.reconciliationIssue.update({ where: { id: issueId }, data: { status: "RESOLVED", resolutionNote: note ?? "Resolved by operator.", resolvedByUserId: userId, resolvedAt: new Date() } });
  await recordAuditEventSafe({ eventType: "RECONCILIATION", action: "RESOLVE", summary: "OMS/WMS reconciliation issue resolved.", actorUserId: userId, entityType: "ReconciliationIssue", entityId: issueId, integrationRunId: issue.integrationRunId ?? undefined, before: { status: issue.status }, after: { status: resolved.status, resolutionNote: resolved.resolutionNote } });
  return resolved;
}
