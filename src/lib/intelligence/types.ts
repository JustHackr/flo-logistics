export const INTELLIGENCE_SOURCES = [
  "google",
  "open_meteo",
  "tomtom",
  "fixture",
  "fallback",
] as const;

export type IntelligenceSource = (typeof INTELLIGENCE_SOURCES)[number];
export type TrafficLevel = "FREE_FLOW" | "MODERATE" | "HEAVY" | "SEVERE";
export type IntelligenceRiskLevel = "LOW" | "WATCH" | "HIGH" | "CRITICAL";
export type IncidentSeverity = "MINOR" | "MAJOR" | "CRITICAL";

export type IntelligenceRegion = {
  id: string;
  name: string;
  countryCode: string;
  timezone: string;
  minLat: number;
  minLng: number;
  maxLat: number;
  maxLng: number;
  active: boolean;
};

export type RegionQuery = {
  region: IntelligenceRegion;
  now: Date;
  sampleOrigin?: { lat: number; lng: number };
  sampleDestination?: { lat: number; lng: number };
};

export type NormalizedTraffic = {
  source: IntelligenceSource;
  observedAt: Date;
  validUntil: Date;
  trafficLevel: TrafficLevel;
  congestionRatio: number;
  centerLat: number;
  centerLng: number;
  label?: string;
};

export type NormalizedWeather = {
  source: IntelligenceSource;
  observedAt: Date;
  validUntil: Date;
  lat: number;
  lng: number;
  precipitationMmPerHour: number;
  visibilityMeters: number | null;
  windKmh: number | null;
  label?: string;
};

export type NormalizedIncident = {
  source: IntelligenceSource;
  externalId: string;
  observedAt: Date;
  validUntil: Date | null;
  category: string;
  severity: IncidentSeverity;
  lat: number;
  lng: number;
  description?: string;
  roadClosed: boolean;
};

export interface IntelligenceProvider {
  readonly name: IntelligenceSource;
  getTraffic(input: RegionQuery): Promise<NormalizedTraffic[]>;
  getWeather(input: RegionQuery): Promise<NormalizedWeather[]>;
  getIncidents(input: RegionQuery): Promise<NormalizedIncident[]>;
}

export type ConditionSnapshotView = {
  id: string;
  regionId: string;
  dataType: "TRAFFIC" | "WEATHER" | "INCIDENT";
  observedAt: string;
  expiresAt: string;
  source: IntelligenceSource;
  trafficLevel: TrafficLevel | null;
  congestionRatio: number | null;
  precipitationMmPerHour: number | null;
  visibilityMeters: number | null;
  windKmh: number | null;
  incidentCount: number | null;
  stale: boolean;
};

export type RouteConditionAssessment = {
  riskLevel: IntelligenceRiskLevel;
  trafficPenaltyFactor: number;
  weatherPenaltyFactor: number;
  incidentPenaltyFactor: number;
  reasons: string[];
  snapshotIds: string[];
};
