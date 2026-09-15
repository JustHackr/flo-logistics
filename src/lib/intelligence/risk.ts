import type { NormalizedIncident, NormalizedTraffic, NormalizedWeather, RouteConditionAssessment, IntelligenceRiskLevel } from "./types";

export const DEFAULT_RISK_THRESHOLDS = {
  trafficWatch: 1.3,
  trafficHigh: 1.6,
  trafficCritical: 2,
  rainWatch: 5,
  rainHigh: 10,
  rainCritical: 25,
  visibilityHigh: 1000,
} as const;

type RiskThresholds = typeof DEFAULT_RISK_THRESHOLDS;

const RISK_RANK: Record<IntelligenceRiskLevel, number> = { LOW: 0, WATCH: 1, HIGH: 2, CRITICAL: 3 };

function maxRisk(current: IntelligenceRiskLevel, next: IntelligenceRiskLevel) {
  return RISK_RANK[next] > RISK_RANK[current] ? next : current;
}

function round2(value: number) { return Math.round(value * 100) / 100; }

export function assessConditions(input: {
  traffic: NormalizedTraffic[];
  weather: NormalizedWeather[];
  incidents: NormalizedIncident[];
  snapshotIds?: string[];
  thresholds?: Partial<RiskThresholds>;
}): RouteConditionAssessment {
  const thresholds = { ...DEFAULT_RISK_THRESHOLDS, ...input.thresholds };
  let riskLevel: IntelligenceRiskLevel = "LOW";
  const reasons: string[] = [];
  let weatherPenaltyFactor = 1;
  let incidentPenaltyFactor = 1;
  let trafficPenaltyFactor = 1;

  const traffic = input.traffic.reduce<NormalizedTraffic | null>((best, item) => !best || item.congestionRatio > best.congestionRatio ? item : best, null);
  if (traffic) {
    trafficPenaltyFactor = traffic.congestionRatio >= thresholds.trafficCritical ? 1.2 : traffic.congestionRatio >= thresholds.trafficHigh ? 1.12 : traffic.congestionRatio >= thresholds.trafficWatch ? 1.05 : 1;
    if (traffic.congestionRatio >= thresholds.trafficCritical) { riskLevel = maxRisk(riskLevel, "CRITICAL"); reasons.push(`Traffic congestion ratio ${traffic.congestionRatio.toFixed(2)} is critical.`); }
    else if (traffic.congestionRatio >= thresholds.trafficHigh) { riskLevel = maxRisk(riskLevel, "HIGH"); reasons.push(`Traffic congestion ratio ${traffic.congestionRatio.toFixed(2)} is high.`); }
    else if (traffic.congestionRatio >= thresholds.trafficWatch) { riskLevel = maxRisk(riskLevel, "WATCH"); reasons.push(`Traffic congestion ratio ${traffic.congestionRatio.toFixed(2)} needs monitoring.`); }
  }

  const weather = input.weather.reduce<NormalizedWeather | null>((best, item) => !best || item.precipitationMmPerHour > best.precipitationMmPerHour ? item : best, null);
  if (weather) {
    if (weather.precipitationMmPerHour >= thresholds.rainCritical) { weatherPenaltyFactor = Math.max(weatherPenaltyFactor, 1.35); riskLevel = maxRisk(riskLevel, "CRITICAL"); reasons.push(`Rainfall ${weather.precipitationMmPerHour.toFixed(1)} mm/h is critical.`); }
    else if (weather.precipitationMmPerHour >= thresholds.rainHigh) { weatherPenaltyFactor = Math.max(weatherPenaltyFactor, 1.2); riskLevel = maxRisk(riskLevel, "HIGH"); reasons.push(`Rainfall ${weather.precipitationMmPerHour.toFixed(1)} mm/h is high.`); }
    else if (weather.precipitationMmPerHour >= thresholds.rainWatch) { weatherPenaltyFactor = Math.max(weatherPenaltyFactor, 1.1); riskLevel = maxRisk(riskLevel, "WATCH"); reasons.push(`Rainfall ${weather.precipitationMmPerHour.toFixed(1)} mm/h needs monitoring.`); }
    if (weather.visibilityMeters !== null && weather.visibilityMeters < thresholds.visibilityHigh) { weatherPenaltyFactor = Math.max(weatherPenaltyFactor, 1.15); riskLevel = maxRisk(riskLevel, "HIGH"); reasons.push(`Visibility is below ${thresholds.visibilityHigh}m.`); }
  }

  for (const incident of input.incidents) {
    if (incident.roadClosed || incident.severity === "CRITICAL") { incidentPenaltyFactor = Math.max(incidentPenaltyFactor, 1.4); riskLevel = maxRisk(riskLevel, "CRITICAL"); reasons.push(incident.description ? `Road closure: ${incident.description}` : "A critical road incident affects this route."); }
    else if (incident.severity === "MAJOR") { incidentPenaltyFactor = Math.max(incidentPenaltyFactor, 1.15); riskLevel = maxRisk(riskLevel, "HIGH"); reasons.push(incident.description ? `Major incident: ${incident.description}` : "A major traffic incident affects this route."); }
    else { incidentPenaltyFactor = Math.max(incidentPenaltyFactor, 1.05); riskLevel = maxRisk(riskLevel, "WATCH"); reasons.push(incident.description ? `Minor incident: ${incident.description}` : "A minor traffic incident is nearby."); }
  }

  if (reasons.length === 0) reasons.push("No material traffic, weather, or incident risk detected.");
  return { riskLevel, trafficPenaltyFactor: round2(trafficPenaltyFactor), weatherPenaltyFactor: round2(weatherPenaltyFactor), incidentPenaltyFactor: round2(incidentPenaltyFactor), reasons, snapshotIds: input.snapshotIds ?? [] };
}

/** Traffic-aware Google/OSRM durations already include traffic; only apply weather and incidents. */
export function adjustedDurationMin(providerDurationMin: number, assessment: RouteConditionAssessment, trafficAlreadyIncluded = true) {
  const trafficFactor = trafficAlreadyIncluded ? 1 : assessment.trafficPenaltyFactor;
  return Math.round(providerDurationMin * trafficFactor * assessment.weatherPenaltyFactor * assessment.incidentPenaltyFactor * 10) / 10;
}
