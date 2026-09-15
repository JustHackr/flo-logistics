import { prisma } from "@/lib/prisma";
import { FixtureIntelligenceProvider } from "./fixtures";
import { DEFAULT_JAKARTA_REGION, isInRegion } from "./regions";
import { GoogleTrafficProvider, OpenMeteoWeatherProvider, TomTomIncidentProvider } from "./providers";
import type { ConditionSnapshotView, IntelligenceProvider, IntelligenceRegion, IntelligenceSource, NormalizedIncident, NormalizedTraffic, NormalizedWeather, RouteConditionAssessment } from "./types";

function parseStringArray(value: string) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch { return []; }
}

function toRegion(value: { id: string; name: string; countryCode: string; timezone: string; minLat: number; minLng: number; maxLat: number; maxLng: number; active: boolean }): IntelligenceRegion {
  return { id: value.id, name: value.name, countryCode: value.countryCode, timezone: value.timezone, minLat: value.minLat, minLng: value.minLng, maxLat: value.maxLat, maxLng: value.maxLng, active: value.active };
}

export async function ensureDefaultRegion() {
  const region = await prisma.intelligenceRegion.upsert({
    where: { id: DEFAULT_JAKARTA_REGION.id },
    create: DEFAULT_JAKARTA_REGION,
    update: { active: true, name: DEFAULT_JAKARTA_REGION.name, minLat: DEFAULT_JAKARTA_REGION.minLat, minLng: DEFAULT_JAKARTA_REGION.minLng, maxLat: DEFAULT_JAKARTA_REGION.maxLat, maxLng: DEFAULT_JAKARTA_REGION.maxLng },
  });
  await prisma.intelligenceConfig.upsert({ where: { regionId: region.id }, create: { regionId: region.id }, update: {} });
  return toRegion(region);
}

export async function getRegions() {
  const regions = await prisma.intelligenceRegion.findMany({ where: { active: true }, orderBy: { name: "asc" } });
  if (regions.length === 0) return [await ensureDefaultRegion()];
  return regions.map(toRegion);
}

function fallbackTraffic(input: { region: IntelligenceRegion; now: Date }): NormalizedTraffic {
  return { source: "fallback", observedAt: input.now, validUntil: new Date(input.now.getTime() + 10 * 60_000), trafficLevel: "MODERATE", congestionRatio: 1.3, centerLat: (input.region.minLat + input.region.maxLat) / 2, centerLng: (input.region.minLng + input.region.maxLng) / 2, label: "Local traffic fallback" };
}

function fallbackWeather(input: { region: IntelligenceRegion; now: Date }): NormalizedWeather {
  return { source: "fallback", observedAt: input.now, validUntil: new Date(input.now.getTime() + 10 * 60_000), lat: (input.region.minLat + input.region.maxLat) / 2, lng: (input.region.minLng + input.region.maxLng) / 2, precipitationMmPerHour: 0, visibilityMeters: null, windKmh: null, label: "Cached/local weather fallback" };
}

function validDate(value: Date, now: Date) {
  return !Number.isNaN(value.getTime()) && value.getTime() <= now.getTime() + 5 * 60_000;
}

function validTraffic(item: NormalizedTraffic, region: IntelligenceRegion, now: Date) {
  return validDate(item.observedAt, now) && item.validUntil > item.observedAt && isInRegion(region, item.centerLat, item.centerLng) && Number.isFinite(item.congestionRatio) && item.congestionRatio >= 0;
}

function validWeather(item: NormalizedWeather, region: IntelligenceRegion, now: Date) {
  return validDate(item.observedAt, now) && item.validUntil > item.observedAt && isInRegion(region, item.lat, item.lng) && Number.isFinite(item.precipitationMmPerHour) && item.precipitationMmPerHour >= 0;
}

function validIncident(item: NormalizedIncident, region: IntelligenceRegion, now: Date) {
  return validDate(item.observedAt, now) && (item.validUntil === null || item.validUntil > item.observedAt) && isInRegion(region, item.lat, item.lng) && ["MINOR", "MAJOR", "CRITICAL"].includes(item.severity) && Boolean(item.externalId);
}

function snapshotData(regionId: string, item: NormalizedTraffic | NormalizedWeather, dataType: "TRAFFIC" | "WEATHER" | "INCIDENT", incidentCount: number | null) {
  const traffic = "trafficLevel" in item ? item : null;
  const weather = "precipitationMmPerHour" in item ? item : null;
  return {
    regionId,
    dataType,
    observedAt: item.observedAt,
    expiresAt: item.validUntil,
    source: item.source,
    trafficLevel: traffic?.trafficLevel ?? null,
    congestionRatio: traffic?.congestionRatio ?? null,
    precipitationMmPerHour: weather?.precipitationMmPerHour ?? null,
    visibilityMeters: weather?.visibilityMeters ?? null,
    windKmh: weather?.windKmh ?? null,
    incidentCount,
    stale: false,
    payloadJson: "label" in item && item.label ? JSON.stringify({ label: item.label }) : null,
  };
}

async function saveSnapshot(regionId: string, item: NormalizedTraffic | NormalizedWeather, dataType: "TRAFFIC" | "WEATHER" | "INCIDENT", incidentCount: number | null) {
  const data = snapshotData(regionId, item, dataType, incidentCount);
  return prisma.conditionSnapshot.upsert({ where: { regionId_source_dataType_observedAt: { regionId, source: data.source, dataType, observedAt: data.observedAt } }, create: data, update: data });
}

export async function runIntelligenceRefresh(input: { regionId?: string; mode?: "live" | "fixture" }) {
  const regions = await getRegions();
  const configs = await prisma.intelligenceConfig.findMany({ where: { regionId: { in: regions.map((region) => region.id) } } });
  const enabled = new Set(configs.filter((config) => config.enabled).map((config) => config.regionId));
  const configuredRegions = regions.filter((region) => enabled.has(region.id));
  const selected = input.regionId ? configuredRegions.filter((region) => region.id === input.regionId) : configuredRegions;
  const results = [];
  for (const region of selected) results.push(await refreshRegion(region, input.mode ?? "live", configs.find((config) => config.regionId === region.id)));
  return results;
}

function configuredProvider(name: string): IntelligenceProvider | null {
  if (name === "google") return new GoogleTrafficProvider();
  if (name === "open_meteo") return new OpenMeteoWeatherProvider();
  if (name === "tomtom") return new TomTomIncidentProvider();
  return null;
}

async function refreshRegion(region: IntelligenceRegion, mode: "live" | "fixture", config?: { providerPriorityJson: string }) {
  const startedAt = new Date();
  const run = await prisma.intelligenceIngestionRun.create({ data: { regionId: region.id, mode, status: "RUNNING", providersJson: "[]" } });
  const query = { region, now: startedAt };
  const fixture = new FixtureIntelligenceProvider();
  const configuredPriority = config ? parseStringArray(config.providerPriorityJson) : ["google", "open_meteo", "tomtom"];
  const providerInstances = mode === "fixture" ? [fixture] : configuredPriority.map(configuredProvider).filter((provider): provider is IntelligenceProvider => provider !== null);
  const providers: string[] = [];
  let snapshotCount = 0;
  let incidentCount = 0;
  const errors: string[] = [];

  try {
    let traffic: NormalizedTraffic[] = [];
    let weather: NormalizedWeather[] = [];
    let incidents: NormalizedIncident[] = [];
    for (const provider of providerInstances) {
      providers.push(provider.name);
      try {
        const [providerTraffic, providerWeather, providerIncidents] = await Promise.all([provider.getTraffic(query), provider.getWeather(query), provider.getIncidents(query)]);
        traffic.push(...providerTraffic); weather.push(...providerWeather); incidents.push(...providerIncidents);
      } catch (error) { errors.push(`${provider.name}: ${error instanceof Error ? error.message : "provider failed"}`); }
    }
    const validTrafficItems = traffic.filter((item) => validTraffic(item, region, startedAt));
    const validWeatherItems = weather.filter((item) => validWeather(item, region, startedAt));
    const validIncidentItems = incidents.filter((item) => validIncident(item, region, startedAt));
    if (validTrafficItems.length !== traffic.length) errors.push("Discarded invalid traffic observations.");
    if (validWeatherItems.length !== weather.length) errors.push("Discarded invalid weather observations.");
    if (validIncidentItems.length !== incidents.length) errors.push("Discarded invalid incident observations.");
    traffic = validTrafficItems;
    weather = validWeatherItems;
    incidents = validIncidentItems;
    if (traffic.length === 0) traffic = mode === "fixture" ? await fixture.getTraffic(query) : [fallbackTraffic(query)];
    if (weather.length === 0) weather = mode === "fixture" ? await fixture.getWeather(query) : [fallbackWeather(query)];
    if (incidents.length === 0 && mode === "fixture") incidents = await fixture.getIncidents(query);

    for (const item of traffic) { await saveSnapshot(region.id, item, "TRAFFIC", null); snapshotCount += 1; }
    for (const item of weather) { await saveSnapshot(region.id, item, "WEATHER", null); snapshotCount += 1; }
    if (incidents.length > 0) {
      const incidentSnapshot = { source: incidents[0].source, observedAt: incidents[0].observedAt, validUntil: incidents[0].validUntil ?? new Date(startedAt.getTime() + 10 * 60_000), lat: (region.minLat + region.maxLat) / 2, lng: (region.minLng + region.maxLng) / 2, precipitationMmPerHour: 0, visibilityMeters: null, windKmh: null, label: `${incidents.length} incidents` } satisfies NormalizedWeather;
      await saveSnapshot(region.id, incidentSnapshot, "INCIDENT", incidents.length); snapshotCount += 1;
    }
    for (const incident of incidents) {
      if (!isInRegion(region, incident.lat, incident.lng)) continue;
      await prisma.trafficIncident.upsert({ where: { source_externalId: { source: incident.source, externalId: incident.externalId } }, create: { regionId: region.id, externalId: incident.externalId, source: incident.source, observedAt: incident.observedAt, expiresAt: incident.validUntil, category: incident.category, severity: incident.severity, lat: incident.lat, lng: incident.lng, description: incident.description ?? null, roadClosed: incident.roadClosed }, update: { regionId: region.id, observedAt: incident.observedAt, expiresAt: incident.validUntil, category: incident.category, severity: incident.severity, lat: incident.lat, lng: incident.lng, description: incident.description ?? null, roadClosed: incident.roadClosed } });
      incidentCount += 1;
    }
    const cutoff = new Date(startedAt.getTime() - 2 * 5 * 60_000);
    await prisma.conditionSnapshot.updateMany({ where: { regionId: region.id, createdAt: { lt: cutoff }, stale: false }, data: { stale: true } });
    await prisma.intelligenceIngestionRun.update({ where: { id: run.id }, data: { status: errors.length > 0 ? "PARTIAL" : "SUCCEEDED", completedAt: new Date(), providersJson: JSON.stringify(providers), snapshotCount, incidentCount, errorJson: errors.length > 0 ? JSON.stringify(errors) : null } });
    return { regionId: region.id, runId: run.id, status: errors.length > 0 ? "PARTIAL" : "SUCCEEDED", snapshotCount, incidentCount, errors };
  } catch (error) {
    const message = error instanceof Error ? error.message : "ingestion failed";
    await prisma.intelligenceIngestionRun.update({ where: { id: run.id }, data: { status: "FAILED", completedAt: new Date(), providersJson: JSON.stringify(providers), snapshotCount, incidentCount, errorJson: JSON.stringify([...errors, message]) } });
    throw error;
  }
}

export async function getLatestSnapshots(regionId?: string): Promise<ConditionSnapshotView[]> {
  const rows = await prisma.conditionSnapshot.findMany({ where: regionId ? { regionId } : undefined, orderBy: { observedAt: "desc" }, take: 200 });
  const seen = new Set<string>();
  return rows.filter((row) => { const key = `${row.regionId}:${row.source}:${row.dataType}`; if (seen.has(key)) return false; seen.add(key); return true; }).map((row) => ({ id: row.id, regionId: row.regionId, dataType: row.dataType as ConditionSnapshotView["dataType"], observedAt: row.observedAt.toISOString(), expiresAt: row.expiresAt.toISOString(), source: row.source as IntelligenceSource, trafficLevel: row.trafficLevel as ConditionSnapshotView["trafficLevel"], congestionRatio: row.congestionRatio, precipitationMmPerHour: row.precipitationMmPerHour, visibilityMeters: row.visibilityMeters, windKmh: row.windKmh, incidentCount: row.incidentCount, stale: row.stale || row.expiresAt < new Date() }));
}

export async function getRecentIncidents(regionId?: string) {
  return prisma.trafficIncident.findMany({ where: { ...(regionId ? { regionId } : {}), OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] }, orderBy: { observedAt: "desc" }, take: 100 });
}

export async function getIntelligenceOverview() {
  const regions = await getRegions();
  const [snapshots, incidents, runs] = await Promise.all([getLatestSnapshots(), getRecentIncidents(), prisma.intelligenceIngestionRun.findMany({ orderBy: { startedAt: "desc" }, take: 10 })]);
  return { generatedAt: new Date().toISOString(), regions, snapshots, incidents, runs };
}

export async function assessRouteConditions(input: { points: Array<{ lat: number; lng: number }>; regionId?: string }): Promise<RouteConditionAssessment> {
  const regions = await getRegions();
  const region = input.regionId ? regions.find((item) => item.id === input.regionId) : regions.find((item) => input.points.some((point) => isInRegion(item, point.lat, point.lng))) ?? regions[0];
  const snapshots = await getLatestSnapshots(region?.id);
  const incidents = (await getRecentIncidents(region?.id)).filter((incident) => input.points.some((point) => Math.abs(point.lat - incident.lat) <= 0.08 && Math.abs(point.lng - incident.lng) <= 0.08));
  // Expired/stale observations remain available for audit and UI warnings, but
  // must never silently influence a new route decision.
  const freshSnapshots = snapshots.filter((item) => !item.stale);
  const traffic = freshSnapshots.filter((item) => item.dataType === "TRAFFIC" && item.congestionRatio !== null).map((item) => ({ source: item.source, observedAt: new Date(item.observedAt), validUntil: new Date(item.expiresAt), trafficLevel: item.trafficLevel ?? "MODERATE", congestionRatio: item.congestionRatio ?? 1, centerLat: 0, centerLng: 0 }));
  const weather = freshSnapshots.filter((item) => item.dataType === "WEATHER" && item.precipitationMmPerHour !== null).map((item) => ({ source: item.source, observedAt: new Date(item.observedAt), validUntil: new Date(item.expiresAt), lat: 0, lng: 0, precipitationMmPerHour: item.precipitationMmPerHour ?? 0, visibilityMeters: item.visibilityMeters, windKmh: item.windKmh }));
  const normalizedIncidents: NormalizedIncident[] = incidents.map((incident) => ({ source: incident.source as IntelligenceSource, externalId: incident.externalId, observedAt: incident.observedAt, validUntil: incident.expiresAt, category: incident.category, severity: incident.severity as NormalizedIncident["severity"], lat: incident.lat, lng: incident.lng, description: incident.description ?? undefined, roadClosed: incident.roadClosed }));
  const config = region ? await prisma.intelligenceConfig.findUnique({ where: { regionId: region.id } }) : null;
  let thresholds: Record<string, number> = {};
  if (config) {
    try { thresholds = JSON.parse(config.thresholdsJson) as Record<string, number>; } catch { thresholds = {}; }
  }
  return (await import("./risk")).assessConditions({ traffic, weather, incidents: normalizedIncidents, snapshotIds: snapshots.map((item) => item.id), thresholds });
}
