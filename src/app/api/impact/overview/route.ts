import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/auth/api";
import { getImpactOverview } from "@/lib/impact";

export async function GET() {
  const access = await requireApiRole(["ADMIN", "OPS_MANAGER"]);
  if (!access.ok) return access.response;
  return NextResponse.json(await getImpactOverview());
}
