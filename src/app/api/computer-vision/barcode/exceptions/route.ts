import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiRole } from "@/lib/auth/api";
import { recordAuditEventSafe } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const access = await requireApiRole(["ADMIN", "OPS_MANAGER", "WAREHOUSE"]);
  if (!access.ok) return access.response;
  const body = z.object({ code: z.string().trim().min(3).max(120), reason: z.string().trim().min(3).max(500), outcome: z.enum(["REVIEW", "EXCEPTION"]).default("REVIEW"), format: z.enum(["BARCODE", "QR_CODE"]).default("BARCODE"), scanId: z.string().trim().optional() }).safeParse(await request.json().catch(() => ({})));
  if (!body.success) return NextResponse.json({ error: "Barcode/QR code, outcome, and reason are required" }, { status: 400 });
  const { code: rawCode, reason, outcome, format, scanId } = body.data;
  const code = rawCode.toUpperCase();
  const order = await prisma.order.findFirst({ where: { externalOrderId: code }, select: { id: true, routePlanId: true } });
  const dedupeKey = `barcode-mismatch:${format}:${code}:${outcome}`;
  const exception = await prisma.controlTowerException.upsert({
    where: { dedupeKey },
    create: { dedupeKey, kind: "BARCODE_MISMATCH", severity: outcome === "EXCEPTION" ? "CRITICAL" : "HIGH", sourceSystem: format === "QR_CODE" ? "qr_scanner" : "barcode_scanner", reason, orderId: order?.id ?? null, routePlanId: order?.routePlanId ?? null },
    update: { status: "OPEN", severity: outcome === "EXCEPTION" ? "CRITICAL" : "HIGH", reason, orderId: order?.id ?? null, routePlanId: order?.routePlanId ?? null, resolvedAt: null, resolvedByUserId: null, resolutionNote: null },
  });
  await recordAuditEventSafe({ eventType: "BARCODE_VERIFICATION", action: "EXCEPTION", summary: `${format === "QR_CODE" ? "QR" : "Barcode"} verification created a Control Tower exception.`, reason, actorUserId: access.session.id, actorRole: access.session.role, entityType: "ControlTowerException", entityId: exception.id, exceptionId: exception.id, routePlanId: order?.routePlanId ?? undefined, after: { code, format, outcome, status: exception.status, scanId: scanId ?? null } });
  return NextResponse.json({ id: exception.id, status: exception.status, dedupeKey });
}
