import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiRole } from "@/lib/auth/api";
import { prisma } from "@/lib/prisma";
import { ensureDefaultRegion } from "@/lib/intelligence/service";

const configSchema = z.object({
  enabled: z.boolean().optional(),
  refreshIntervalSec: z.number().int().min(60).max(86_400).optional(),
  providerPriority: z.array(z.enum(["google", "open_meteo", "tomtom", "fixture", "fallback"])).min(1).optional(),
  thresholds: z.record(z.string(), z.number().finite()).optional(),
});

function parseJson<T>(value: string, fallback: T): T {
  try { return JSON.parse(value) as T; } catch { return fallback; }
}

export async function GET() {
  const access = await requireApiRole(["ADMIN", "OPS_MANAGER", "DRIVER", "WAREHOUSE"]);
  if (!access.ok) return access.response;
  await ensureDefaultRegion();
  const regions = await prisma.intelligenceRegion.findMany({ include: { config: true }, orderBy: { name: "asc" } });
  return NextResponse.json({ regions: regions.map((region) => ({
    id: region.id,
    name: region.name,
    countryCode: region.countryCode,
    timezone: region.timezone,
    active: region.active,
    minLat: region.minLat,
    minLng: region.minLng,
    maxLat: region.maxLat,
    maxLng: region.maxLng,
    config: region.config ? {
      enabled: region.config.enabled,
      refreshIntervalSec: region.config.refreshIntervalSec,
      providerPriority: parseJson(region.config.providerPriorityJson, [] as string[]),
      thresholds: parseJson(region.config.thresholdsJson, {} as Record<string, number>),
      updatedAt: region.config.updatedAt.toISOString(),
    } : null,
  })) });
}

export async function PATCH(request: Request) {
  const access = await requireApiRole(["ADMIN"]);
  if (!access.ok) return access.response;
  try {
    const regionId = new URL(request.url).searchParams.get("regionId");
    if (!regionId) return NextResponse.json({ error: "regionId is required" }, { status: 400 });
    const region = await prisma.intelligenceRegion.findUnique({ where: { id: regionId } });
    if (!region) return NextResponse.json({ error: "Region not found" }, { status: 404 });
    const body = configSchema.parse(await request.json());
    const config = await prisma.intelligenceConfig.upsert({
      where: { regionId },
      create: {
        regionId,
        enabled: body.enabled ?? true,
        refreshIntervalSec: body.refreshIntervalSec ?? 300,
        providerPriorityJson: JSON.stringify(body.providerPriority ?? ["google", "open_meteo", "tomtom"]),
        thresholdsJson: JSON.stringify(body.thresholds ?? {}),
      },
      update: {
        ...(body.enabled === undefined ? {} : { enabled: body.enabled }),
        ...(body.refreshIntervalSec === undefined ? {} : { refreshIntervalSec: body.refreshIntervalSec }),
        ...(body.providerPriority === undefined ? {} : { providerPriorityJson: JSON.stringify(body.providerPriority) }),
        ...(body.thresholds === undefined ? {} : { thresholdsJson: JSON.stringify(body.thresholds) }),
      },
    });
    return NextResponse.json({ ok: true, config: {
      regionId,
      enabled: config.enabled,
      refreshIntervalSec: config.refreshIntervalSec,
      providerPriority: parseJson(config.providerPriorityJson, [] as string[]),
      thresholds: parseJson(config.thresholdsJson, {} as Record<string, number>),
      updatedAt: config.updatedAt.toISOString(),
    } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid intelligence configuration" }, { status: 400 });
  }
}
