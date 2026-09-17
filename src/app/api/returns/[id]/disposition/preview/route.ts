import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/auth/api";
import { previewDisposition } from "@/lib/returns/service";
type Context = { params: Promise<{ id: string }> };
export async function POST(request: Request, context: Context) { const access = await requireApiRole(["ADMIN", "OPS_MANAGER", "WAREHOUSE"]); if (!access.ok) return access.response; const body = await request.json().catch(() => ({})); return NextResponse.json(await previewDisposition((await context.params).id, { ...body, actorUserId: access.session.id })); }
