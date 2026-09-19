import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/auth/api";
import { getCustodyParcel } from "@/lib/custody/service";
type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, context: Context) { const access = await requireApiRole(["ADMIN", "OPS_MANAGER", "DRIVER", "WAREHOUSE"]); if (!access.ok) return access.response; try { return NextResponse.json(await getCustodyParcel((await context.params).id)); } catch { return NextResponse.json({ error: "Custody parcel not found" }, { status: 404 }); } }

