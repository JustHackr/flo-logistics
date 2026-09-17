import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/auth/api";
import { inspectReturnCase } from "@/lib/returns/service";
type Context = { params: Promise<{ id: string }> };
export async function POST(request: Request, context: Context) { const access = await requireApiRole(["ADMIN", "OPS_MANAGER", "WAREHOUSE"]); if (!access.ok) return access.response; try { const input = await request.json() as Record<string, unknown>; return NextResponse.json(await inspectReturnCase((await context.params).id, { ...input, actorUserId: access.session.id })); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Inspection failed" }, { status: 400 }); } }
