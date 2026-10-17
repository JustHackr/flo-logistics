import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiRole } from "@/lib/auth/api";
import { recalculateCustody } from "@/lib/custody/service";
const schema = z.object({ parcelId: z.string().min(3) });
export async function POST(request: Request) { const access = await requireApiRole(["ADMIN", "OPS_MANAGER", "WAREHOUSE"]); if (!access.ok) return access.response; try { const { parcelId } = schema.parse(await request.json()); return NextResponse.json(await recalculateCustody(parcelId)); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to recalculate" }, { status: 400 }); } }

