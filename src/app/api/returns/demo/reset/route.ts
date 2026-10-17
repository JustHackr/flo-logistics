import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/auth/api";
import { resetDemoReturnCase } from "@/lib/returns/service";

export async function POST() {
  const access = await requireApiRole(["ADMIN", "OPS_MANAGER", "WAREHOUSE"]);
  if (!access.ok) return access.response;
  return NextResponse.json(await resetDemoReturnCase(access.session.id));
}
