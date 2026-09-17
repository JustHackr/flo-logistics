import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiRole } from "@/lib/auth/api";
import { scanReturn } from "@/lib/returns/service";
const schema = z.object({ code: z.string().min(3), hubCode: z.string().min(2), stage: z.string().min(2), format: z.string().optional(), source: z.enum(["LIVE", "SYNTHETIC", "FALLBACK"]).optional(), sku: z.string().optional() });
type Context = { params: Promise<{ id: string }> };
export async function POST(request: Request, context: Context) { const access = await requireApiRole(["ADMIN", "OPS_MANAGER", "WAREHOUSE", "DRIVER"]); if (!access.ok) return access.response; try { return NextResponse.json(await scanReturn((await context.params).id, { ...schema.parse(await request.json()), actorUserId: access.session.id })); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Scan failed" }, { status: 400 }); } }
