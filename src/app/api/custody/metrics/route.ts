import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/auth/api";
import { getCustodyMetrics } from "@/lib/custody/service";
export async function GET() { const access = await requireApiRole(["ADMIN", "OPS_MANAGER", "DRIVER", "WAREHOUSE"]); if (!access.ok) return access.response; return NextResponse.json(await getCustodyMetrics()); }

