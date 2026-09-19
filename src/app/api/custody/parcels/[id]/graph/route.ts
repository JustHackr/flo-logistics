import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/auth/api";
import { getCustodyGraph } from "@/lib/custody/service";
type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, context: Context) { const access = await requireApiRole(["ADMIN", "OPS_MANAGER", "DRIVER", "WAREHOUSE"]); if (!access.ok) return access.response; return NextResponse.json(await getCustodyGraph((await context.params).id)); }

