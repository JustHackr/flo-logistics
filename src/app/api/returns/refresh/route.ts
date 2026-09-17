import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/auth/api";
import { syncFixtureReturns } from "@/lib/returns/service";
export async function POST() { const access = await requireApiRole(["ADMIN", "OPS_MANAGER"]); if (!access.ok) return access.response; return NextResponse.json(await syncFixtureReturns(access.session.id)); }
