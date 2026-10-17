import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/auth/api";
import { getControlTowerOverview } from "@/lib/control-tower";

export async function GET() {
  const access = await requireApiRole(["ADMIN", "OPS_MANAGER"]);
  if (!access.ok) return access.response;

  const overview = await getControlTowerOverview();
  return NextResponse.json(overview);
}
