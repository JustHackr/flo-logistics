import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/auth/api";
import { decideDisposition } from "@/lib/returns/service";
type Context = { params: Promise<{ id: string }> };
export async function POST(request: Request, context: Context) { const access = await requireApiRole(["ADMIN", "OPS_MANAGER", "WAREHOUSE"]); if (!access.ok) return access.response; const body = await request.json(); return NextResponse.json(await decideDisposition((await context.params).id, { ...body, approve: false, actorUserId: access.session.id, actorRole: access.session.role })); }
