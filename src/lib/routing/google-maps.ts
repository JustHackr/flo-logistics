import type { LatLng } from "./geo";
import { toTrafficDepartureTime } from "./traffic";

export type GoogleMapsProvider = "routes" | "distance_matrix";

export interface GoogleRouteLeg {
  distanceKm: number;
  durationMin: number;
  hasTraffic: boolean;
  provider: GoogleMapsProvider;
}

export interface GoogleMapsStatus {
  configured: boolean;
  connected: boolean;
  provider: GoogleMapsProvider | null;
  hasTraffic: boolean;
  message: string;
  sampleDistanceKm?: number;
  sampleDurationMin?: number;
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function parseGoogleDurationSeconds(duration: string | undefined): number | null {
  if (!duration) return null;
  const match = /^(\d+(?:\.\d+)?)s$/.exec(duration);
  if (!match) return null;
  return Number(match[1]);
}

/** Primary key — used for Routes API calls. */
export function getGoogleMapsApiKey() {
  return process.env.GOOGLE_MAPS_API_KEY?.trim() || null;
}

/** Fallback/dedicated key — used for Distance Matrix API calls.
 *  Falls back to GOOGLE_MAPS_API_KEY if not set. */
export function getGoogleDistanceMatrixApiKey() {
  return (
    process.env.GOOGLE_DISTANCE_MATRIX_API_KEY?.trim() ||
    process.env.GOOGLE_MAPS_API_KEY?.trim() ||
    null
  );
}

export function isGoogleMapsConfigured() {
  return Boolean(getGoogleMapsApiKey() || getGoogleDistanceMatrixApiKey());
}

function toIsoDepartureTime(departTime: Date) {
  return toTrafficDepartureTime(departTime).toISOString();
}

async function readGoogleError(res: Response) {
  try {
    const json = await res.json();
    if (typeof json?.error?.message === "string") return json.error.message;
    if (typeof json?.error_message === "string") return json.error_message;
    if (typeof json?.message === "string") return json.message;
    return `HTTP ${res.status}`;
  } catch {
    return `HTTP ${res.status}`;
  }
}

export async function computeRouteWithGoogleRoutes(
  a: LatLng,
  b: LatLng,
  departTime: Date
): Promise<GoogleRouteLeg | null> {
  const routesApiKey = getGoogleMapsApiKey();
  if (!routesApiKey) return null;

  const res = await fetch(
    "https://routes.googleapis.com/directions/v2:computeRoutes",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": routesApiKey,
        "X-Goog-FieldMask": "routes.duration,routes.distanceMeters",
      },
      body: JSON.stringify({
        origin: {
          location: { latLng: { latitude: a.lat, longitude: a.lng } },
        },
        destination: {
          location: { latLng: { latitude: b.lat, longitude: b.lng } },
        },
        travelMode: "DRIVE",
        routingPreference: "TRAFFIC_AWARE_OPTIMAL",
        departureTime: toIsoDepartureTime(departTime),
        computeAlternativeRoutes: false,
        languageCode: "id",
        regionCode: "ID",
      }),
      signal: AbortSignal.timeout(15_000),
    }
  );

  if (!res.ok) {
    throw new Error(await readGoogleError(res));
  }

  const json: {
    routes?: Array<{
      duration?: string;
      distanceMeters?: number;
    }>;
  } = await res.json();

  const route = json.routes?.[0];
  const durationSec = parseGoogleDurationSeconds(route?.duration);
  if (!route || durationSec == null || route.distanceMeters == null) {
    return null;
  }

  return {
    distanceKm: round1(route.distanceMeters / 1000),
    durationMin: round1(durationSec / 60),
    hasTraffic: true,
    provider: "routes",
  };
}

export async function computeRouteWithGoogleDistanceMatrix(
  a: LatLng,
  b: LatLng,
  departTime: Date
): Promise<GoogleRouteLeg | null> {
  const dmApiKey = getGoogleDistanceMatrixApiKey();
  if (!dmApiKey) return null;

  const departureUnix = Math.floor(
    toTrafficDepartureTime(departTime).getTime() / 1000
  );

  const params = new URLSearchParams({
    origins: `${a.lat},${a.lng}`,
    destinations: `${b.lat},${b.lng}`,
    mode: "driving",
    departure_time: departureUnix.toString(),
    traffic_model: "best_guess",
    region: "id",
    language: "id",
    key: dmApiKey,
  });

  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?${params.toString()}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });

  if (!res.ok) {
    throw new Error(await readGoogleError(res));
  }

  const json: {
    status?: string;
    error_message?: string;
    rows?: Array<{
      elements?: Array<{
        status?: string;
        distance?: { value: number };
        duration?: { value: number };
        duration_in_traffic?: { value: number };
      }>;
    }>;
  } = await res.json();

  if (json.status && json.status !== "OK") {
    throw new Error(json.error_message ?? json.status);
  }

  const element = json.rows?.[0]?.elements?.[0];
  if (!element || element.status !== "OK") {
    return null;
  }

  const durationSec =
    element.duration_in_traffic?.value ?? element.duration!.value;

  return {
    distanceKm: round1(element.distance!.value / 1000),
    durationMin: round1(durationSec / 60),
    hasTraffic: Boolean(element.duration_in_traffic),
    provider: "distance_matrix",
  };
}

export async function computeGoogleRouteLeg(
  a: LatLng,
  b: LatLng,
  departTime: Date
): Promise<GoogleRouteLeg | null> {
  try {
    const fromRoutes = await computeRouteWithGoogleRoutes(a, b, departTime);
    if (fromRoutes) return fromRoutes;
  } catch (error) {
    console.warn("[google-maps] Routes API failed:", error);
  }

  try {
    return await computeRouteWithGoogleDistanceMatrix(a, b, departTime);
  } catch (error) {
    console.warn("[google-maps] Distance Matrix API failed:", error);
    return null;
  }
}

export async function prewarmGoogleRouteMatrix(
  points: LatLng[],
  departTime: Date
): Promise<Map<string, GoogleRouteLeg>> {
  const cache = new Map<string, GoogleRouteLeg>();
  const routesApiKey = getGoogleMapsApiKey();
  if (!routesApiKey || points.length < 2) return cache;

  const departureIso = toIsoDepartureTime(departTime);
  const waypoints = points.map((p) => ({
    waypoint: {
      location: { latLng: { latitude: p.lat, longitude: p.lng } },
    },
  }));

  try {
    const res = await fetch(
      "https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": routesApiKey,
          "X-Goog-FieldMask":
            "originIndex,destinationIndex,duration,distanceMeters,status,condition",
        },
        body: JSON.stringify({
          origins: waypoints,
          destinations: waypoints,
          travelMode: "DRIVE",
          routingPreference: "TRAFFIC_AWARE_OPTIMAL",
          departureTime: departureIso,
          languageCode: "id",
          regionCode: "ID",
        }),
        signal: AbortSignal.timeout(25_000),
      }
    );

    if (!res.ok) {
      throw new Error(await readGoogleError(res));
    }

    const rows: Array<{
      originIndex?: number;
      destinationIndex?: number;
      duration?: string;
      distanceMeters?: number;
      status?: { code?: number };
    }> = await res.json();

    for (const row of rows) {
      if (
        row.originIndex == null ||
        row.destinationIndex == null ||
        row.status?.code !== 0
      ) {
        continue;
      }

      const durationSec = parseGoogleDurationSeconds(row.duration);
      if (durationSec == null || row.distanceMeters == null) continue;

      const from = points[row.originIndex];
      const to = points[row.destinationIndex];
      const key = `${from.lat},${from.lng}->${to.lat},${to.lng}`;

      cache.set(key, {
        distanceKm: round1(row.distanceMeters / 1000),
        durationMin: round1(durationSec / 60),
        hasTraffic: true,
        provider: "routes",
      });
    }
  } catch (error) {
    console.warn("[google-maps] Route matrix prewarm failed:", error);
  }

  return cache;
}

/** Browser-safe key for Maps JavaScript API (falls back to server key name in docs). */
export function getPublicGoogleMapsApiKey() {
  return (
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY?.trim() ||
    null
  );
}

export function isPublicGoogleMapsConfigured() {
  return Boolean(getPublicGoogleMapsApiKey());
}

export async function computeRoutePolyline(
  points: LatLng[],
  departTime: Date
): Promise<string | null> {
  const routesApiKey = getGoogleMapsApiKey();
  if (!routesApiKey || points.length < 2) return null;

  const origin = points[0];
  const destination = points[points.length - 1];
  const intermediates = points.slice(1, -1).map((p) => ({
    location: { latLng: { latitude: p.lat, longitude: p.lng } },
  }));

  try {
    const res = await fetch(
      "https://routes.googleapis.com/directions/v2:computeRoutes",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": routesApiKey,
          "X-Goog-FieldMask": "routes.polyline.encodedPolyline",
        },
        body: JSON.stringify({
          origin: {
            location: { latLng: { latitude: origin.lat, longitude: origin.lng } },
          },
          destination: {
            location: {
              latLng: { latitude: destination.lat, longitude: destination.lng },
            },
          },
          intermediates,
          travelMode: "DRIVE",
          routingPreference: "TRAFFIC_AWARE_OPTIMAL",
          departureTime: toIsoDepartureTime(departTime),
          computeAlternativeRoutes: false,
          languageCode: "id",
          regionCode: "ID",
        }),
        signal: AbortSignal.timeout(20_000),
      }
    );

    if (!res.ok) return null;

    const json: {
      routes?: Array<{ polyline?: { encodedPolyline?: string } }>;
    } = await res.json();

    return json.routes?.[0]?.polyline?.encodedPolyline ?? null;
  } catch {
    return null;
  }
}

/** Blok M Square warehouse → Sudirman test leg for connectivity checks. */
const TEST_ORIGIN: LatLng = { lat: -6.2445, lng: 106.8001 };
const TEST_DESTINATION: LatLng = { lat: -6.2148, lng: 106.827 };

export async function getGoogleMapsStatus(): Promise<GoogleMapsStatus> {
  if (!isGoogleMapsConfigured()) {
    return {
      configured: false,
      connected: false,
      provider: null,
      hasTraffic: false,
      message:
        "Add GOOGLE_MAPS_API_KEY (Routes) and GOOGLE_DISTANCE_MATRIX_API_KEY (Distance Matrix) to .env.local.",
    };
  }

  try {
    const sample = await computeGoogleRouteLeg(
      TEST_ORIGIN,
      TEST_DESTINATION,
      new Date()
    );

    if (!sample) {
      return {
        configured: true,
        connected: false,
        provider: null,
        hasTraffic: false,
        message:
          "API keys are set but Google Maps returned no route. Enable Routes API and Distance Matrix API, and ensure billing is active.",
      };
    }

    return {
      configured: true,
      connected: true,
      provider: sample.provider,
      hasTraffic: sample.hasTraffic,
      message: sample.hasTraffic
        ? "Connected to Google Maps with live traffic."
        : "Connected to Google Maps (road network).",
      sampleDistanceKm: sample.distanceKm,
      sampleDurationMin: sample.durationMin,
    };
  } catch (error) {
    return {
      configured: true,
      connected: false,
      provider: null,
      hasTraffic: false,
      message:
        error instanceof Error
          ? error.message
          : "Google Maps connection test failed.",
    };
  }
}
