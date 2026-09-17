import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/auth/api";
import { recalculateSlaRisk } from "@/lib/sla-risk-service";

export async function POST(request: Request) {
  const access = await requireApiRole(["ADMIN", "OPS_MANAGER", "WAREHOUSE"]);
  if (!access.ok) return access.response;
  const body = await request.json().catch(() => ({})) as { orderId?: string };
  return NextResponse.json(await recalculateSlaRisk({ orderId: body.orderId, actorUserId: access.session.id, actorRole: access.session.role, trigger: "MANUAL" }));
}
