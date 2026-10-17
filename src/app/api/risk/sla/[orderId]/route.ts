import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/auth/api";
import { getSlaRiskHistory, getSlaRiskPrediction } from "@/lib/sla-risk-service";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, context: { params: Promise<{ orderId: string }> }) {
  const access = await requireApiRole(["ADMIN", "OPS_MANAGER", "DRIVER", "WAREHOUSE"]);
  if (!access.ok) return access.response;
  const { orderId } = await context.params;
  if (access.session.role === "DRIVER") {
    const driver = await prisma.driver.findFirst({ where: { name: access.session.name }, select: { id: true } });
    const assigned = driver ? await prisma.routeStop.findFirst({ where: { orderId, routePlan: { driverId: driver.id } }, select: { id: true } }) : null;
    if (!assigned) return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  const prediction = await getSlaRiskPrediction(orderId);
  if (!prediction) return NextResponse.json({ error: "SLA risk prediction not found" }, { status: 404 });
  return NextResponse.json({ prediction, history: await getSlaRiskHistory(orderId) });
}
