import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/auth/api";
import { recordAuditEventSafe } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const access = await requireApiRole(["ADMIN", "OPS_MANAGER", "WAREHOUSE"]);
  if (!access.ok) return access.response;
  const body = (await request.json().catch(() => ({}))) as { code?: string; reason?: string; outcome?: string };
  const code = body.code?.trim().toUpperCase();
  if (!code || !body.reason?.trim()) return NextResponse.json({ error: "Barcode and reason are required" }, { status: 400 });
  const order = await prisma.order.findFirst({ where: { externalOrderId: code }, select: { id: true, routePlanId: true } });
  const dedupeKey = `barcode-mismatch:${code}:${body.outcome ?? "REVIEW"}`;
  const exception = await prisma.controlTowerException.upsert({
    where: { dedupeKey },
    create: { dedupeKey, kind: "BARCODE_MISMATCH", severity: body.outcome === "EXCEPTION" ? "CRITICAL" : "HIGH", sourceSystem: "barcode_scanner", reason: body.reason.trim(), orderId: order?.id ?? null, routePlanId: order?.routePlanId ?? null },
    update: { status: "OPEN", severity: body.outcome === "EXCEPTION" ? "CRITICAL" : "HIGH", reason: body.reason.trim(), orderId: order?.id ?? null, routePlanId: order?.routePlanId ?? null, resolvedAt: null, resolvedByUserId: null, resolutionNote: null },
  });
  await recordAuditEventSafe({ eventType: "BARCODE_VERIFICATION", action: "EXCEPTION", summary: "Barcode verification created a Control Tower exception.", reason: body.reason.trim(), actorUserId: access.session.id, actorRole: access.session.role, entityType: "ControlTowerException", entityId: exception.id, exceptionId: exception.id, routePlanId: order?.routePlanId ?? undefined, after: { code, outcome: body.outcome ?? "REVIEW", status: exception.status } });
  return NextResponse.json({ id: exception.id, status: exception.status });
}
