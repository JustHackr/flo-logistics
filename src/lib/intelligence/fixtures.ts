import type { IntelligenceProvider, RegionQuery } from "./types";

export class FixtureIntelligenceProvider implements IntelligenceProvider {
  readonly name = "fixture" as const;

  async getTraffic({ now, region }: RegionQuery) {
    return [{ source: "fixture" as const, observedAt: now, validUntil: new Date(now.getTime() + 10 * 60_000), trafficLevel: "HEAVY" as const, congestionRatio: 1.72, centerLat: (region.minLat + region.maxLat) / 2, centerLng: (region.minLng + region.maxLng) / 2, label: "Sample Jakarta congestion" }];
  }

  async getWeather({ now, region }: RegionQuery) {
    return [{ source: "fixture" as const, observedAt: now, validUntil: new Date(now.getTime() + 60 * 60_000), lat: (region.minLat + region.maxLat) / 2, lng: (region.minLng + region.maxLng) / 2, precipitationMmPerHour: 12.4, visibilityMeters: 1800, windKmh: 19, label: "Sample heavy rain" }];
  }

  async getIncidents({ now, region }: RegionQuery) {
    return [{ source: "fixture" as const, externalId: "fixture-closure-001", observedAt: now, validUntil: new Date(now.getTime() + 60 * 60_000), category: "ROAD_CLOSURE", severity: "CRITICAL" as const, lat: (region.minLat + region.maxLat) / 2, lng: (region.minLng + region.maxLng) / 2, description: "Sample road closure near the delivery corridor", roadClosed: true }];
  }
}
