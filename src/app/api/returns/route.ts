import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiRole } from "@/lib/auth/api";
import { createReturnCase, listReturns } from "@/lib/returns/service";

const schema = z.object({ externalReturnId: z.string().min(3), orderId: z.string().optional(), reason: z.string().min(2), expectedHub: z.string().min(2), expectedSku: z.string().optional(), expectedSerial: z.string().optional(), dataSource: z.enum(["LIVE", "SYNTHETIC", "FALLBACK"]).optional() });
export async function GET() { const access = await requireApiRole(["ADMIN", "OPS_MANAGER", "WAREHOUSE"]); if (!access.ok) return access.response; return NextResponse.json({ returns: await listReturns() }); }
export async function POST(request: Request) { const access = await requireApiRole(["ADMIN", "OPS_MANAGER"]); if (!access.ok) return access.response; try { const input = schema.parse(await request.json()); return NextResponse.json(await createReturnCase({ ...input, actorUserId: access.session.id }), { status: 201 }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid return case" }, { status: 400 }); } }
