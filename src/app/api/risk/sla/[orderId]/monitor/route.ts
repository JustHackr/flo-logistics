import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/auth/api";
import { acknowledgeSlaRisk } from "@/lib/sla-risk-service";

export async function POST(request: Request, context: { params: Promise<{ orderId: string }> }) {
  const access = await requireApiRole(["ADMIN", "OPS_MANAGER"]);
  if (!access.ok) return access.response;
  const { orderId } = await context.params;
  const body = await request.json().catch(() => ({})) as { note?: string };
  const result = await acknowledgeSlaRisk(orderId, access.session.id, access.session.role, "MONITOR", body.note);
  return result ? NextResponse.json(result) : NextResponse.json({ error: "Active predictive SLA risk not found" }, { status: 404 });
}
