import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiRole } from "@/lib/auth/api";
import { runIntelligenceRefresh } from "@/lib/intelligence/service";

const refreshSchema = z.object({ regionId: z.string().optional(), mode: z.enum(["live", "fixture"]).default("live") });

function isWorkerRequest(request: Request) {
  const token = process.env.INTELLIGENCE_WORKER_TOKEN?.trim();
  return Boolean(token && request.headers.get("x-flo-worker-token") === token);
}

export async function POST(request: Request) {
  if (!isWorkerRequest(request)) {
    const access = await requireApiRole(["ADMIN", "OPS_MANAGER"]);
    if (!access.ok) return access.response;
  }
  try {
    const body = await request.json().catch(() => ({}));
    const input = refreshSchema.parse(body);
    return NextResponse.json({ results: await runIntelligenceRefresh(input) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Refresh failed" }, { status: 400 });
  }
}
