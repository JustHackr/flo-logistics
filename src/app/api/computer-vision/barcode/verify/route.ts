import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/auth/api";
import { findBarcodeFixtureById, findBarcodeFixture, syntheticBarcodeVerification } from "@/lib/computer-vision/barcode-verification";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const access = await requireApiRole(["ADMIN", "OPS_MANAGER", "WAREHOUSE"]);
  if (!access.ok) return access.response;
  const search = new URL(request.url).searchParams;
  const code = search.get("code")?.trim().toUpperCase() ?? "";
  if (!code) return NextResponse.json({ error: "Barcode value is required" }, { status: 400 });

  if (search.get("mode") === "fixture") {
    return NextResponse.json(syntheticBarcodeVerification(code, search.get("fixtureId") ? findBarcodeFixtureById(search.get("fixtureId")!) : findBarcodeFixture(code)));
  }

  const order = await prisma.order.findFirst({
    where: { externalOrderId: code },
    select: { id: true, externalOrderId: true, status: true, fulfillmentStatus: true, promisedAt: true, routePlan: { select: { id: true, status: true, driver: { select: { name: true } } } }, routeStop: { select: { sequence: true } } },
  });
  if (!order) return NextResponse.json({ code, outcome: "EXCEPTION", source: "OMS_WMS", message: "Barcode was not found in the OMS order register.", nextAction: "Hold the parcel and create an exception for warehouse review.", fixture: findBarcodeFixture(code) });
  const outcome = order.fulfillmentStatus === "EXCEPTION" ? "EXCEPTION" : order.fulfillmentStatus === "READY_FOR_DISPATCH" || order.fulfillmentStatus === "LOADED" ? "VERIFIED" : "REVIEW";
  return NextResponse.json({
    code,
    outcome,
    source: "OMS_WMS",
    message: outcome === "VERIFIED" ? "Barcode matched OMS and WMS; parcel is ready for dispatch." : outcome === "EXCEPTION" ? "OMS/WMS record is blocked by a fulfillment exception." : `Barcode matched, but WMS status is ${order.fulfillmentStatus}.`,
    nextAction: outcome === "VERIFIED" ? "Release the parcel to its assigned dispatch workflow." : "Keep the parcel on hold and ask Warehouse or Ops to review the fulfillment state.",
    fixture: findBarcodeFixture(code),
    order: { id: order.id, externalOrderId: order.externalOrderId, status: order.status, fulfillmentStatus: order.fulfillmentStatus, promisedAt: order.promisedAt?.toISOString() ?? null, routePlanId: order.routePlan?.id ?? null, routeStatus: order.routePlan?.status ?? null, driverName: order.routePlan?.driver.name ?? null, stopSequence: order.routeStop?.sequence ?? null },
  });
}
