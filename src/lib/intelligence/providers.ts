import { computeGoogleRouteLeg, getGoogleMapsApiKey } from "@/lib/routing/google-maps";
import { regionBbox, regionCenter } from "./regions";
import type {
  IntelligenceProvider,
  NormalizedIncident,
  NormalizedTraffic,
  NormalizedWeather,
  RegionQuery,
} from "./types";

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? value as Record<string, unknown> : {};
}

function numberValue(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function firstCoordinate(value: unknown): [number, number] | null {
  if (!Array.isArray(value)) return null;
  if (value.length >= 2 && typeof value[0] === "number" && typeof value[1] === "number") return [value[0], value[1]];
  for (const child of value) {
    const coordinate = firstCoordinate(child);
    if (coordinate) return coordinate;
  }
  return null;
}

export class GoogleTrafficProvider implements IntelligenceProvider {
  readonly name = "google" as const;

  async getTraffic(input: RegionQuery): Promise<NormalizedTraffic[]> {
    if (!getGoogleMapsApiKey()) return [];
    const origin = input.sampleOrigin ?? regionCenter(input.region);
    const center = regionCenter(input.region);
    const destination = input.sampleDestination ?? {
      lat: Math.min(input.region.maxLat, center.lat + 0.03),
      lng: Math.min(input.region.maxLng, center.lng + 0.03),
    };
    try {
      const leg = await computeGoogleRouteLeg(origin, destination, input.now);
      if (!leg) return [];
      const congestionRatio = leg.hasTraffic ? 1.35 : 1;
      return [{
        source: "google",
        observedAt: input.now,
        validUntil: new Date(input.now.getTime() + 10 * 60_000),
        trafficLevel: congestionRatio >= 1.6 ? "HEAVY" : congestionRatio > 1.1 ? "MODERATE" : "FREE_FLOW",
        congestionRatio,
        centerLat: center.lat,
        centerLng: center.lng,
        label: leg.hasTraffic ? "Google live traffic sample" : "Google road-network sample",
      }];
    } catch (error) {
      throw error instanceof Error ? error : new Error("Google traffic request failed");
    }
  }

  async getWeather(): Promise<NormalizedWeather[]> { return []; }
  async getIncidents(): Promise<NormalizedIncident[]> { return []; }
}

export class OpenMeteoWeatherProvider implements IntelligenceProvider {
  readonly name = "open_meteo" as const;

  async getWeather(input: RegionQuery): Promise<NormalizedWeather[]> {
    const center = regionCenter(input.region);
    const params = new URLSearchParams({
      latitude: String(center.lat),
      longitude: String(center.lng),
      current: "precipitation,visibility,wind_speed_10m",
      forecast_days: "1",
      timezone: "UTC",
    });
    try {
      const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, { signal: AbortSignal.timeout(10_000) });
      if (!response.ok) throw new Error(`Open-Meteo returned HTTP ${response.status}`);
      const body = asRecord(await response.json());
      const current = asRecord(body.current ?? body.current_weather);
      const observedAt = typeof current.time === "string" && !Number.isNaN(Date.parse(current.time)) ? new Date(current.time) : input.now;
      const precipitation = numberValue(current.precipitation) ?? 0;
      const visibility = numberValue(current.visibility);
      const wind = numberValue(current.wind_speed_10m) ?? numberValue(current.windspeed);
      return [{ source: "open_meteo", observedAt, validUntil: new Date(observedAt.getTime() + 60 * 60_000), lat: center.lat, lng: center.lng, precipitationMmPerHour: precipitation, visibilityMeters: visibility, windKmh: wind, label: "Open-Meteo current conditions" }];
    } catch (error) {
      throw error instanceof Error ? error : new Error("Open-Meteo request failed");
    }
  }

  async getTraffic(): Promise<NormalizedTraffic[]> { return []; }
  async getIncidents(): Promise<NormalizedIncident[]> { return []; }
}

export class TomTomIncidentProvider implements IntelligenceProvider {
  readonly name = "tomtom" as const;

  async getIncidents(input: RegionQuery): Promise<NormalizedIncident[]> {
    const apiKey = process.env.TOMTOM_API_KEY?.trim();
    if (!apiKey) return [];
    const params = new URLSearchParams({ apiVersion: "2", bbox: regionBbox(input.region), timeValidity: "present" });
    try {
      const response = await fetch(`https://api.tomtom.com/maps/orbis/traffic/incidents/details?${params}`, {
        headers: { "TomTom-Api-Key": apiKey, Attributes: "incidents(type,geometry(type,coordinates),properties(iconCategory,magnitudeOfDelay,events))" },
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) throw new Error(`TomTom returned HTTP ${response.status}`);
      const body = asRecord(await response.json());
      const incidents = Array.isArray(body.incidents) ? body.incidents : [];
      return incidents.flatMap((raw, index) => {
        const item = asRecord(raw);
        const properties = asRecord(item.properties);
        const geometry = asRecord(item.geometry);
        const coordinates = firstCoordinate(geometry.coordinates);
        if (!coordinates) return [];
        const magnitude = numberValue(properties.magnitudeOfDelay) ?? 0;
        const category = String(properties.iconCategory ?? item.type ?? "TRAFFIC_INCIDENT");
        const roadClosed = /closure|closed|blocked/i.test(category) || magnitude >= 4;
        const severity = roadClosed ? "CRITICAL" : magnitude >= 3 ? "MAJOR" : "MINOR";
        const externalId = typeof item.id === "string" ? item.id : `tomtom-${input.region.id}-${index}-${input.now.getTime()}`;
        return [{ source: "tomtom" as const, externalId, observedAt: input.now, validUntil: new Date(input.now.getTime() + 10 * 60_000), category, severity, lat: coordinates[1], lng: coordinates[0], description: typeof properties.description === "string" ? properties.description : category, roadClosed }];
      });
    } catch (error) {
      throw error instanceof Error ? error : new Error("TomTom request failed");
    }
  }

  async getTraffic(): Promise<NormalizedTraffic[]> { return []; }
  async getWeather(): Promise<NormalizedWeather[]> { return []; }
}
