import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiRole } from "@/lib/auth/api";
import { createReturnCase } from "@/lib/returns/service";
const schema = z.object({ rows: z.array(z.object({ externalReturnId: z.string(), reason: z.string(), expectedHub: z.string(), expectedSku: z.string().optional(), expectedSerial: z.string().optional() })).max(500) });
export async function POST(request: Request) { const access = await requireApiRole(["ADMIN", "OPS_MANAGER"]); if (!access.ok) return access.response; try { const { rows } = schema.parse(await request.json()); const created = await Promise.all(rows.map((row) => createReturnCase({ ...row, actorUserId: access.session.id, dataSource: "LIVE" }))); return NextResponse.json({ created: created.length }); } catch { return NextResponse.json({ error: "Invalid return import" }, { status: 400 }); } }
