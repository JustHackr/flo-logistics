import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/auth/api";
import { decideRefund } from "@/lib/returns/service";
type Context = { params: Promise<{ id: string }> };
export async function POST(request: Request, context: Context) { const access = await requireApiRole(["ADMIN", "OPS_MANAGER"]); if (!access.ok) return access.response; const body = await request.json(); return NextResponse.json(await decideRefund((await context.params).id, { ...body, approve: true, actorUserId: access.session.id, actorRole: access.session.role })); }
