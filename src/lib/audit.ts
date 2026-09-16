import { prisma } from "@/lib/prisma";
import type { Role } from "@/lib/auth/roles";

export type AuditEventInput = {
  eventType: string;
  action: string;
  summary: string;
  reason?: string;
  actorUserId?: string | null;
  actorRole?: Role | string | null;
  entityType: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
  metadata?: unknown;
  sourceSystem?: string | null;
  provider?: string | null;
  regionId?: string | null;
  routePlanId?: string | null;
  routeRevisionId?: string | null;
  exceptionId?: string | null;
  snapshotId?: string | null;
  ingestionRunId?: string | null;
  integrationRunId?: string | null;
  connectorId?: string | null;
  conditionAssessmentId?: string | null;
  trafficIncidentId?: string | null;
};

function json(value: unknown) {
  if (value === undefined || value === null) return null;
  return JSON.stringify(value);
}

export async function recordAuditEvent(input: AuditEventInput) {
  return prisma.auditEvent.create({
    data: {
      eventType: input.eventType,
      action: input.action,
      summary: input.summary,
      reason: input.reason ?? null,
      actorUserId: input.actorUserId ?? null,
      actorRole: input.actorRole ?? null,
      entityType: input.entityType,
      entityId: input.entityId,
      beforeJson: json(input.before),
      afterJson: json(input.after),
      metadataJson: json(input.metadata),
      sourceSystem: input.sourceSystem ?? null,
      provider: input.provider ?? null,
      regionId: input.regionId ?? null,
      routePlanId: input.routePlanId ?? null,
      routeRevisionId: input.routeRevisionId ?? null,
      exceptionId: input.exceptionId ?? null,
      snapshotId: input.snapshotId ?? null,
      ingestionRunId: input.ingestionRunId ?? null,
      integrationRunId: input.integrationRunId ?? null,
      connectorId: input.connectorId ?? null,
      conditionAssessmentId: input.conditionAssessmentId ?? null,
      trafficIncidentId: input.trafficIncidentId ?? null,
    },
  });
}

export async function recordAuditEventSafe(input: AuditEventInput) {
  try { return await recordAuditEvent(input); } catch (error) {
    console.error("[audit] failed to record event", error instanceof Error ? error.message : error);
    return null;
  }
}

function parseJson(value: string | null) {
  if (!value) return null;
  try { return JSON.parse(value) as unknown; } catch { return value; }
}

export async function listAuditEvents(input: { entityType?: string; entityId?: string; limit?: number } = {}) {
  const rows = await prisma.auditEvent.findMany({
    where: {
      ...(input.entityType ? { entityType: input.entityType } : {}),
      ...(input.entityId ? { entityId: input.entityId } : {}),
    },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: Math.min(Math.max(input.limit ?? 50, 1), 200),
  });
  return rows.map((row) => ({
    id: row.id,
    eventType: row.eventType,
    action: row.action,
    summary: row.summary,
    reason: row.reason,
    actor: row.user?.name ?? row.actorRole ?? "System",
    actorRole: row.actorRole,
    entityType: row.entityType,
    entityId: row.entityId,
    before: parseJson(row.beforeJson),
    after: parseJson(row.afterJson),
    metadata: parseJson(row.metadataJson),
    sourceSystem: row.sourceSystem,
    provider: row.provider,
    regionId: row.regionId,
    createdAt: row.createdAt.toISOString(),
  }));
}
