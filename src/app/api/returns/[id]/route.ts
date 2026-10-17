import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiRole } from "@/lib/auth/api";
import { getReturnView, transitionReturn } from "@/lib/returns/service";
import { RETURN_STATES } from "@/lib/returns/types";
const schema = z.object({ state: z.enum(RETURN_STATES), reason: z.string().optional() });
type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, context: Context) { const access = await requireApiRole(["ADMIN", "OPS_MANAGER", "WAREHOUSE", "DRIVER"]); if (!access.ok) return access.response; try { return NextResponse.json(await getReturnView((await context.params).id)); } catch { return NextResponse.json({ error: "Return not found" }, { status: 404 }); } }
export async function PATCH(request: Request, context: Context) { const access = await requireApiRole(["ADMIN", "OPS_MANAGER", "WAREHOUSE"]); if (!access.ok) return access.response; try { const { state, reason } = schema.parse(await request.json()); return NextResponse.json(await transitionReturn((await context.params).id, state, { actorUserId: access.session.id, actorRole: access.session.role, reason })); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid return transition" }, { status: 400 }); } }
