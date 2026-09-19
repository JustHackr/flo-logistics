import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiRole } from "@/lib/auth/api";
import { updateInvestigation } from "@/lib/custody/service";
const schema = z.object({ status: z.enum(["OPEN", "ACKNOWLEDGED", "RESOLVED", "ESCALATED"]).optional(), note: z.string().max(1000).optional(), finding: z.string().max(2000).optional(), assignedToUserId: z.string().optional() });
type Context = { params: Promise<{ id: string }> };
export async function PATCH(request: Request, context: Context) { const access = await requireApiRole(["ADMIN", "OPS_MANAGER"]); if (!access.ok) return access.response; try { return NextResponse.json(await updateInvestigation((await context.params).id, { ...schema.parse(await request.json()), actorUserId: access.session.id })); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update investigation" }, { status: 400 }); } }

