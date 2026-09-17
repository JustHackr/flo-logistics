import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/auth/api";
import { assessReturnCase } from "@/lib/returns/service";
type Context = { params: Promise<{ id: string }> };
export async function POST(request: Request, context: Context) { const access = await requireApiRole(["ADMIN", "OPS_MANAGER", "WAREHOUSE"]); if (!access.ok) return access.response; const body = await request.json().catch(() => ({})); return NextResponse.json(await assessReturnCase((await context.params).id, { actorUserId: access.session.id, overrides: body.overrides })); }
