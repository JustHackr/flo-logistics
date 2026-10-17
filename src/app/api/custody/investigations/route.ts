import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiRole } from "@/lib/auth/api";
import { createInvestigation } from "@/lib/custody/service";
const schema = z.object({ parcelId: z.string().min(3), assignedToUserId: z.string().optional(), note: z.string().max(1000).optional() });
export async function POST(request: Request) { const access = await requireApiRole(["ADMIN", "OPS_MANAGER"]); if (!access.ok) return access.response; try { return NextResponse.json(await createInvestigation({ ...schema.parse(await request.json()), actorUserId: access.session.id }), { status: 201 }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to open investigation" }, { status: 400 }); } }

