import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/auth/api";
import { listAuditEvents } from "@/lib/audit";

export async function GET(request: Request) {
  const access = await requireApiRole(["ADMIN", "OPS_MANAGER", "DRIVER", "WAREHOUSE"]);
  if (!access.ok) return access.response;
  const url = new URL(request.url);
  return NextResponse.json(await listAuditEvents({ entityType: url.searchParams.get("entityType") ?? undefined, entityId: url.searchParams.get("entityId") ?? undefined, limit: Number(url.searchParams.get("limit") ?? 50) }));
}
