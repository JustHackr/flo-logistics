import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiRole } from "@/lib/auth/api";
import { getCustodyMetrics, ingestCustodyEvent, listCustodyParcels } from "@/lib/custody/service";

const eventSchema = z.object({ externalParcelId: z.string().min(3), eventType: z.string().min(3), externalEventId: z.string().min(3), sourceSystem: z.string().min(2), source: z.string().optional(), dataSource: z.enum(["LIVE", "SYNTHETIC", "FALLBACK", "MANUAL"]), hubCode: z.string().optional(), scanMethod: z.string().optional(), observedAt: z.coerce.date(), payload: z.record(z.string(), z.unknown()).optional() });
export async function GET(request: Request) { const access = await requireApiRole(["ADMIN", "OPS_MANAGER", "DRIVER", "WAREHOUSE"]); if (!access.ok) return access.response; const query = new URL(request.url).searchParams.get("q") ?? undefined; return NextResponse.json({ parcels: await listCustodyParcels(query), metrics: await getCustodyMetrics() }); }
export async function POST(request: Request) { const access = await requireApiRole(["ADMIN", "OPS_MANAGER", "DRIVER", "WAREHOUSE"]); if (!access.ok) return access.response; try { const input = eventSchema.parse(await request.json()); return NextResponse.json(await ingestCustodyEvent({ ...input, actorUserId: access.session.id }), { status: 201 }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid custody event" }, { status: 400 }); } }

