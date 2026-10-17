import { describe, expect, it } from "vitest";
import { adjustedDurationMin, assessConditions } from "./risk";

const base = { observedAt: new Date("2026-09-15T00:00:00Z"), validUntil: new Date("2026-09-15T01:00:00Z") };

describe("intelligence risk engine", () => {
  it("escalates independent traffic, weather, and closure signals", () => {
    const assessment = assessConditions({
      traffic: [{ ...base, source: "google", trafficLevel: "HEAVY", congestionRatio: 1.72, centerLat: -6.2, centerLng: 106.8 }],
      weather: [{ ...base, source: "open_meteo", lat: -6.2, lng: 106.8, precipitationMmPerHour: 12, visibilityMeters: 500, windKmh: 20 }],
      incidents: [{ ...base, source: "tomtom", externalId: "closure-1", category: "ROAD_CLOSURE", severity: "CRITICAL", lat: -6.2, lng: 106.8, roadClosed: true }],
      snapshotIds: ["traffic-1", "weather-1", "incident-1"],
    });
    expect(assessment.riskLevel).toBe("CRITICAL");
    expect(assessment.trafficPenaltyFactor).toBe(1.12);
    expect(assessment.weatherPenaltyFactor).toBe(1.2);
    expect(assessment.incidentPenaltyFactor).toBe(1.4);
    expect(assessment.reasons).toHaveLength(4);
  });

  it("does not double-count traffic already included by a route provider", () => {
    const assessment = assessConditions({
      traffic: [{ ...base, source: "google", trafficLevel: "SEVERE", congestionRatio: 2.1, centerLat: -6.2, centerLng: 106.8 }],
      weather: [], incidents: [],
    });
    expect(adjustedDurationMin(100, assessment, true)).toBe(100);
    expect(adjustedDurationMin(100, assessment, false)).toBe(120);
  });

  it("caps threshold-driven risk at critical and keeps explanations", () => {
    const assessment = assessConditions({ traffic: [], weather: [{ ...base, source: "open_meteo", lat: -6.2, lng: 106.8, precipitationMmPerHour: 30, visibilityMeters: null, windKmh: null }], incidents: [] });
    expect(assessment.riskLevel).toBe("CRITICAL");
    expect(assessment.reasons[0]).toContain("critical");
  });
});
