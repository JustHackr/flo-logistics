import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/auth/api";
import { getRecentIncidents } from "@/lib/intelligence/service";

export async function GET(request: Request) {
  const access = await requireApiRole(["ADMIN", "OPS_MANAGER", "DRIVER", "WAREHOUSE"]);
  if (!access.ok) return access.response;
  const regionId = new URL(request.url).searchParams.get("regionId") ?? undefined;
  return NextResponse.json({ incidents: await getRecentIncidents(regionId) });
}
