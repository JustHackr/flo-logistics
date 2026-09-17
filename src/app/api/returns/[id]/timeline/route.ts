import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/auth/api";
import { getReturnTimeline } from "@/lib/returns/service";
type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, context: Context) { const access = await requireApiRole(["ADMIN", "OPS_MANAGER", "WAREHOUSE", "DRIVER"]); if (!access.ok) return access.response; return NextResponse.json(await getReturnTimeline((await context.params).id)); }
