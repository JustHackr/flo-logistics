import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/auth/api";
import { getReturnMetrics } from "@/lib/returns/service";
export async function GET() { const access = await requireApiRole(["ADMIN", "OPS_MANAGER", "WAREHOUSE"]); if (!access.ok) return access.response; return NextResponse.json(await getReturnMetrics()); }
