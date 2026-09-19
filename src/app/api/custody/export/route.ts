import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiRole } from "@/lib/auth/api";
import { getCustodyParcel } from "@/lib/custody/service";
const schema = z.object({ parcelId: z.string().min(3) });
export async function POST(request: Request) { const access = await requireApiRole(["ADMIN", "OPS_MANAGER"]); if (!access.ok) return access.response; try { const { parcelId } = schema.parse(await request.json()); const packet = await getCustodyParcel(parcelId); return NextResponse.json({ generatedAt: new Date().toISOString(), generatedBy: access.session.name, packet }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to export packet" }, { status: 400 }); } }

