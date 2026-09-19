import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/auth/api";
import { updateAnomaly } from "@/lib/custody/service";
type Context = { params: Promise<{ id: string }> };
export async function POST(_request: Request, context: Context) { const access = await requireApiRole(["ADMIN", "OPS_MANAGER"]); if (!access.ok) return access.response; return NextResponse.json(await updateAnomaly((await context.params).id, "RESOLVED", access.session.id)); }

