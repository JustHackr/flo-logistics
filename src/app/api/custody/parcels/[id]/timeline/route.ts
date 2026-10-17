import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/auth/api";
import { getCustodyParcel } from "@/lib/custody/service";
type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, context: Context) { const access = await requireApiRole(["ADMIN", "OPS_MANAGER", "DRIVER", "WAREHOUSE"]); if (!access.ok) return access.response; const parcel = await getCustodyParcel((await context.params).id); return NextResponse.json({ parcelId: parcel.id, timeline: parcel.events }); }

