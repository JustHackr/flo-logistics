import type { LatLng } from "./geo";
import { distanceKm } from "./geo";
import {
  computeGoogleRouteLeg,
  getGoogleMapsApiKey,
  isGoogleMapsConfigured,
  prewarmGoogleRouteMatrix,
  type GoogleRouteLeg,
} from "./google-maps";
import {
  calibrateJakartaDurationMin,
  getJakartaEffectiveSpeedKmh,
  JAKARTA_ROAD_DISTANCE_FACTOR,
  toTrafficDepartureTime,
} from "./traffic";

export type TrafficSource =
  | "google_traffic"
  | "google"
  | "osrm_traffic"
  | "estimated";

export interface LegEstimate {
  distanceKm: number;
  durationMin: number;
  source: TrafficSource;
}

const OSRM_BASE = "https://router.project-osrm.org";

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function toIsoDepartureTime(departTime: Date) {
  return toTrafficDepartureTime(departTime).toISOString();
}

function googleLegToEstimate(leg: GoogleRouteLeg): LegEstimate {
  return {
    distanceKm: leg.distanceKm,
    durationMin: leg.durationMin,
    source: leg.hasTraffic ? "google_traffic" : "google",
  };
}

function osrmCoord(point: LatLng) {
  return `${point.lng},${point.lat}`;
}

function buildOsrmLegEstimate(
  distanceMeters: number,
  durationSec: number,
  departTime: Date
): LegEstimate {
  const distanceKmValue = distanceMeters / 1000;
  const freeFlowMin = durationSec / 60;
  const durationMin = calibrateJakartaDurationMin(
    freeFlowMin,
    distanceKmValue,
    departTime
  );

  return {
    distanceKm: round1(distanceKmValue),
    durationMin: round1(durationMin),
    source: "osrm_traffic",
  };
}

export async function estimateLegWithOsrm(
  a: LatLng,
  b: LatLng,
  departTime: Date
): Promise<LegEstimate | null> {
  const url = `${OSRM_BASE}/route/v1/driving/${osrmCoord(a)};${osrmCoord(b)}?overview=false`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return null;

    const json: {
      code?: string;
      routes?: Array<{
        distance?: number;
        duration?: number;
      }>;
    } = await res.json();

    const route = json.routes?.[0];
    if (json.code !== "Ok" || !route?.distance || !route.duration) return null;

    return buildOsrmLegEstimate(route.distance, route.duration, departTime);
  } catch {
    return null;
  }
}

/** Batch OSRM Table API: one origin → many destinations in a single free request. */
export async function estimateManyLegsWithOsrmTable(
  origin: LatLng,
  destinations: LatLng[],
  departTime: Date
): Promise<LegEstimate[] | null> {
  if (destinations.length === 0) return [];

  const points = [origin, ...destinations];
  const coordPath = points.map(osrmCoord).join(";");
  const destIndices = destinations.map((_, i) => i + 1).join(";");
  const url =
    `${OSRM_BASE}/table/v1/driving/${coordPath}` +
    `?sources=0&destinations=${destIndices}&annotations=duration,distance`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) return null;

    const json: {
      code?: string;
      distances?: Array<Array<number | null>>;
      durations?: Array<Array<number | null>>;
    } = await res.json();

    if (json.code !== "Ok" || !json.distances?.[0] || !json.durations?.[0]) {
      return null;
    }

    const results: LegEstimate[] = [];
    for (let i = 0; i < destinations.length; i++) {
      const distanceMeters = json.distances[0][i];
      const durationSec = json.durations[0][i];
      if (distanceMeters == null || durationSec == null) {
        return null;
      }
      results.push(buildOsrmLegEstimate(distanceMeters, durationSec, departTime));
    }

    return results;
  } catch {
    return null;
  }
}

function estimateLegWithJakartaModel(
  a: LatLng,
  b: LatLng,
  departTime: Date
): LegEstimate {
  const straightLineKm = distanceKm(a, b);
  const roadDistanceKm = straightLineKm * JAKARTA_ROAD_DISTANCE_FACTOR;
  const speedKmh = getJakartaEffectiveSpeedKmh(departTime);
  const durationMin = speedKmh > 0 ? (roadDistanceKm / speedKmh) * 60 : 0;

  return {
    distanceKm: round1(roadDistanceKm),
    durationMin: round1(durationMin),
    source: "estimated",
  };
}

export async function estimateLeg(
  a: LatLng,
  b: LatLng,
  departTime: Date
): Promise<LegEstimate> {
  if (isGoogleMapsConfigured()) {
    const fromGoogle = await computeGoogleRouteLeg(a, b, departTime);
    if (fromGoogle) return googleLegToEstimate(fromGoogle);
  }

  const fromOsrm = await estimateLegWithOsrm(a, b, departTime);
  if (fromOsrm) return fromOsrm;

  return estimateLegWithJakartaModel(a, b, departTime);
}

export async function estimateManyFromOrigin(
  origin: LatLng,
  destinations: LatLng[],
  departTime: Date
): Promise<LegEstimate[]> {
  if (destinations.length === 0) return [];

  if (isGoogleMapsConfigured()) {
    return Promise.all(
      destinations.map((dest) => estimateLeg(origin, dest, departTime))
    );
  }

  const fromTable = await estimateManyLegsWithOsrmTable(
    origin,
    destinations,
    departTime
  );
  if (fromTable) return fromTable;

  return Promise.all(
    destinations.map(async (dest) => {
      const fromOsrm = await estimateLegWithOsrm(origin, dest, departTime);
      if (fromOsrm) return fromOsrm;
      return estimateLegWithJakartaModel(origin, dest, departTime);
    })
  );
}

/** Probe OSRM public server with a short Jakarta test leg. */
export async function checkOsrmReachable(): Promise<boolean> {
  const origin: LatLng = { lat: -6.2445, lng: 106.8001 };
  const dest: LatLng = { lat: -6.2148, lng: 106.827 };
  const result = await estimateLegWithOsrm(origin, dest, new Date());
  return result !== null;
}

function legCacheKey(a: LatLng, b: LatLng, departTime: Date) {
  return `${a.lat},${a.lng}->${b.lat},${b.lng}@${toIsoDepartureTime(departTime)}`;
}

function matrixKey(a: LatLng, b: LatLng) {
  return `${a.lat},${a.lng}->${b.lat},${b.lng}`;
}

export interface LegEstimator {
  ready(): Promise<void>;
  estimate(a: LatLng, b: LatLng, departTime: Date): Promise<LegEstimate>;
  estimateManyFromOrigin(
    origin: LatLng,
    destinations: LatLng[],
    departTime: Date
  ): Promise<LegEstimate[]>;
  getPrimarySource(): TrafficSource | null;
}

export function createLegEstimator(
  points: LatLng[],
  initialDepartTime: Date = new Date()
): LegEstimator {
  const cache = new Map<string, LegEstimate>();
  const googleMatrix = new Map<string, GoogleRouteLeg>();
  let primarySource: TrafficSource | null = null;
  let readyPromise: Promise<void> | null = null;

  function recordSource(source: TrafficSource) {
    if (!primarySource) {
      primarySource = source;
      return;
    }
    if (source === "google_traffic") primarySource = "google_traffic";
    else if (source === "google" && primarySource !== "google_traffic") {
      primarySource = "google";
    } else if (
      source === "osrm_traffic" &&
      primarySource !== "google_traffic" &&
      primarySource !== "google"
    ) {
      primarySource = "osrm_traffic";
    } else if (
      source === "estimated" &&
      primarySource !== "google_traffic" &&
      primarySource !== "google" &&
      primarySource !== "osrm_traffic"
    ) {
      primarySource = "estimated";
    }
  }

  async function warmCaches() {
    if (!getGoogleMapsApiKey() || points.length < 2) return;

    const matrix = await prewarmGoogleRouteMatrix(points, initialDepartTime);
    for (const [key, leg] of matrix.entries()) {
      googleMatrix.set(key, leg);
    }
    if (matrix.size > 0) {
      primarySource = "google_traffic";
    }
  }

  async function ready() {
    if (!readyPromise) {
      readyPromise = warmCaches();
    }
    await readyPromise;
  }

  async function estimate(a: LatLng, b: LatLng, departTime: Date) {
    const key = legCacheKey(a, b, departTime);
    const cached = cache.get(key);
    if (cached) return cached;

    const matrixLeg = googleMatrix.get(matrixKey(a, b));
    if (
      matrixLeg &&
      toIsoDepartureTime(departTime) === toIsoDepartureTime(initialDepartTime)
    ) {
      const leg = googleLegToEstimate(matrixLeg);
      cache.set(key, leg);
      recordSource(leg.source);
      return leg;
    }

    const leg = await estimateLeg(a, b, departTime);
    cache.set(key, leg);
    recordSource(leg.source);
    return leg;
  }

  async function estimateManyFromOriginCached(
    origin: LatLng,
    destinations: LatLng[],
    departTime: Date
  ): Promise<LegEstimate[]> {
    if (destinations.length === 0) return [];

    const results: LegEstimate[] = new Array(destinations.length);
    const uncachedIndices: number[] = [];

    for (let i = 0; i < destinations.length; i++) {
      const dest = destinations[i];
      const key = legCacheKey(origin, dest, departTime);
      const cached = cache.get(key);
      if (cached) {
        results[i] = cached;
      } else {
        uncachedIndices.push(i);
      }
    }

    if (uncachedIndices.length === 0) return results;

    const uncachedDests = uncachedIndices.map((i) => destinations[i]);
    const fresh = await estimateManyFromOrigin(
      origin,
      uncachedDests,
      departTime
    );

    for (let j = 0; j < uncachedIndices.length; j++) {
      const idx = uncachedIndices[j];
      const leg = fresh[j];
      results[idx] = leg;
      cache.set(legCacheKey(origin, destinations[idx], departTime), leg);
      recordSource(leg.source);
    }

    return results;
  }

  return {
    ready,
    estimate,
    estimateManyFromOrigin: estimateManyFromOriginCached,
    getPrimarySource: () => primarySource,
  };
}

export function describeTrafficSource(source: TrafficSource | null | undefined) {
  switch (source) {
    case "google_traffic":
      return "Google Maps (live traffic)";
    case "google":
      return "Google Maps (road network)";
    case "osrm_traffic":
      return "OSRM road distances + Jakarta traffic model";
    case "estimated":
      return "Jakarta traffic model (local estimates)";
    default:
      return "Unknown";
  }
}

export { getGoogleMapsStatus, isGoogleMapsConfigured } from "./google-maps";
