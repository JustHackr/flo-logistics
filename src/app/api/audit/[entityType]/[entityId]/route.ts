import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/auth/api";
import { listAuditEvents } from "@/lib/audit";

export async function GET(_request: Request, context: { params: Promise<{ entityType: string; entityId: string }> }) {
  const access = await requireApiRole(["ADMIN", "OPS_MANAGER", "DRIVER", "WAREHOUSE"]);
  if (!access.ok) return access.response;
  const params = await context.params;
  return NextResponse.json(await listAuditEvents({ entityType: params.entityType, entityId: params.entityId, limit: 100 }));
}
