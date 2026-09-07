import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAiProviderStatus } from "@/lib/ai-provider-store";

export const dynamic = "force-dynamic";

/**
 * Lightweight health probe for deploy smoke checks and uptime monitors.
 * Never exposes secrets or connection strings.
 */
export async function GET() {
  const provider = getAiProviderStatus();
  let db: "ok" | "error" = "ok";

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    db = "error";
  }

  const ok = db === "ok";
  return NextResponse.json(
    {
      ok,
      db,
      provider: provider.mode,
      model: provider.model,
      generatedAt: new Date().toISOString(),
    },
    { status: ok ? 200 : 503 }
  );
}
