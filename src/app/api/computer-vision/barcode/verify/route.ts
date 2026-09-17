import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiRole } from "@/lib/auth/api";
import { findBarcodeFixtureById, findBarcodeFixture, syntheticBarcodeVerification, type BarcodeVerification, type ScanFormat } from "@/lib/computer-vision/barcode-verification";
import { findQrFixtureById, syntheticQrVerification } from "@/lib/computer-vision/qr-verification";
import { recordAuditEventSafe } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

const querySchema = z.object({
  code: z.string().trim().min(3).max(120),
  mode: z.enum(["fixture", "live"]).default("live"),
  format: z.enum(["BARCODE", "QR_CODE"]).default("BARCODE"),
  fixtureId: z.string().trim().max(80).optional(),
});

async function persistScan(result: BarcodeVerification, fixtureId: string | undefined, actorUserId: string, orderId?: string, routePlanId?: string) {
  const scan = await prisma.parcelVerificationScan.create({ data: { code: result.code, format: result.format, outcome: result.outcome, source: result.source, message: result.message, checksJson: JSON.stringify(result.checks), fixtureId: fixtureId ?? null, orderId: orderId ?? null, routePlanId: routePlanId ?? null, actorUserId } });
  await recordAuditEventSafe({ eventType: "BARCODE_VERIFICATION", action: result.outcome, summary: `${result.format === "QR_CODE" ? "QR" : "Barcode"} verification completed.`, reason: result.message, actorUserId, entityType: "ParcelVerificationScan", entityId: scan.id, routePlanId: routePlanId ?? undefined, after: { code: result.code, format: result.format, outcome: result.outcome, source: result.source, checks: result.checks } });
  return scan;
}

export async function GET(request: Request) {
  const access = await requireApiRole(["ADMIN", "OPS_MANAGER", "WAREHOUSE"]);
  if (!access.ok) return access.response;
  const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams.entries()));
  if (!parsed.success) return NextResponse.json({ error: "A valid code, format, and mode are required" }, { status: 400 });
  const { code: rawCode, mode, format, fixtureId } = parsed.data;
  const code = rawCode.toUpperCase();

  if (mode === "fixture") {
    const fixture = format === "QR_CODE" ? (fixtureId ? findQrFixtureById(fixtureId) : undefined) : (fixtureId ? findBarcodeFixtureById(fixtureId) : findBarcodeFixture(code));
    const result = format === "QR_CODE" ? syntheticQrVerification(code, fixture) : syntheticBarcodeVerification(code, fixture);
    const scan = await persistScan(result, fixture?.id, access.session.id);
    return NextResponse.json({ ...result, scanId: scan.id, observedAt: scan.createdAt.toISOString() });
  }

  const recentScan = await prisma.parcelVerificationScan.findFirst({ where: { code, format, source: "OMS_WMS", createdAt: { gte: new Date(Date.now() - 15 * 60_000) } }, orderBy: { createdAt: "desc" }, select: { id: true } });
  const order = await prisma.order.findFirst({
    where: { externalOrderId: code },
    select: { id: true, externalOrderId: true, status: true, fulfillmentStatus: true, promisedAt: true, routePlan: { select: { id: true, status: true, driver: { select: { name: true } } } }, routeStop: { select: { sequence: true } } },
  });
  const checks = [
    { key: "FORMAT_DECODED" as const, label: format === "QR_CODE" ? "QR code decoded" : "Code decoded", status: "PASS" as const },
    { key: "OMS_MATCH" as const, label: "OMS order match", status: order ? "PASS" as const : "FAIL" as const },
    { key: "WMS_READY" as const, label: "WMS dispatch readiness", status: !order ? "FAIL" as const : order.fulfillmentStatus === "READY_FOR_DISPATCH" || order.fulfillmentStatus === "LOADED" ? "PASS" as const : order.fulfillmentStatus === "EXCEPTION" ? "FAIL" as const : "WARN" as const },
    { key: "ROUTE_ASSIGNED" as const, label: "Route assignment", status: !order ? "WARN" as const : order.routePlan?.id && order.routeStop ? "PASS" as const : "WARN" as const },
    { key: "DUPLICATE_SCAN_FREE" as const, label: "Duplicate scan check", status: recentScan ? "FAIL" as const : "PASS" as const },
  ];
  const outcome = recentScan || !order || order.fulfillmentStatus === "EXCEPTION" ? "EXCEPTION" : order.fulfillmentStatus === "READY_FOR_DISPATCH" || order.fulfillmentStatus === "LOADED" ? order.routePlan?.id && order.routeStop ? "VERIFIED" : "REVIEW" : "REVIEW";
  const result: BarcodeVerification & { order?: { id: string; externalOrderId: string | null; status: string; fulfillmentStatus: string; promisedAt: string | null; routePlanId: string | null; routeStatus: string | null; driverName: string | null; stopSequence: number | null } } = {
    code,
    format: format as ScanFormat,
    outcome,
    source: "OMS_WMS",
    message: recentScan ? "This code was already verified in the last 15 minutes." : !order ? `${format === "QR_CODE" ? "QR code" : "Barcode"} was not found in the OMS order register.` : order.fulfillmentStatus === "EXCEPTION" ? "OMS/WMS record is blocked by a fulfillment exception." : outcome === "VERIFIED" ? `${format === "QR_CODE" ? "QR code" : "Barcode"} matched OMS and WMS; parcel is ready for dispatch.` : order.routePlan?.id && order.routeStop ? `Code matched, but WMS status is ${order.fulfillmentStatus}.` : "Code matched, but the parcel is not assigned to a route stop yet.",
    nextAction: outcome === "VERIFIED" ? "Release the parcel to its assigned dispatch workflow." : recentScan ? "Check the parcel and remove the duplicate scan before dispatch." : "Keep the parcel on hold and ask Warehouse or Ops to review the fulfillment state.",
    checks,
    fixture: format === "QR_CODE" ? undefined : findBarcodeFixture(code),
    order: order ? { id: order.id, externalOrderId: order.externalOrderId, status: order.status, fulfillmentStatus: order.fulfillmentStatus, promisedAt: order.promisedAt?.toISOString() ?? null, routePlanId: order.routePlan?.id ?? null, routeStatus: order.routePlan?.status ?? null, driverName: order.routePlan?.driver.name ?? null, stopSequence: order.routeStop?.sequence ?? null } : undefined,
  };
  const scan = await persistScan(result, undefined, access.session.id, order?.id, order?.routePlan?.id);
  return NextResponse.json({ ...result, scanId: scan.id, observedAt: scan.createdAt.toISOString() });
}
