import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/auth/api";
import { listLatestSlaRiskPredictions, recalculateSlaRisk } from "@/lib/sla-risk-service";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const access = await requireApiRole(["ADMIN", "OPS_MANAGER", "DRIVER", "WAREHOUSE"]);
  if (!access.ok) return access.response;
  const params = new URL(request.url).searchParams;
  let driverId: string | undefined;
  if (access.session.role === "DRIVER") {
    const driver = await prisma.driver.findFirst({ where: { name: access.session.name }, select: { id: true } });
    driverId = driver?.id;
    if (!driverId) return NextResponse.json({ generatedAt: new Date().toISOString(), predictions: [], scope: "assigned_only" });
  }
  return NextResponse.json({ generatedAt: new Date().toISOString(), predictions: await listLatestSlaRiskPredictions({ orderId: params.get("orderId") ?? undefined, routePlanId: params.get("routePlanId") ?? undefined, includeDelivered: params.get("includeDelivered") === "true", driverId }), scope: driverId ? "assigned_only" : "operations" });
}

export async function POST(request: Request) {
  const access = await requireApiRole(["ADMIN", "OPS_MANAGER", "WAREHOUSE"]);
  if (!access.ok) return access.response;
  const body = await request.json().catch(() => ({})) as { orderId?: string };
  return NextResponse.json(await recalculateSlaRisk({ orderId: body.orderId, actorUserId: access.session.id, actorRole: access.session.role, trigger: "MANUAL" }));
}
