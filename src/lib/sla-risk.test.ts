import { describe, expect, it } from "vitest";
import { assessSlaRisk, calculateSlaPressure } from "./sla-risk";

const now = new Date("2026-09-17T03:00:00.000Z");

function baseInput() {
  return {
    now,
    promisedAt: new Date("2026-09-17T06:00:00.000Z"),
    predictedDeliveryAt: new Date("2026-09-17T05:00:00.000Z"),
    remainingDurationMin: 120,
    remainingStops: 3,
    fulfillmentStatus: "LOADED",
    routeAssigned: true,
    driverAssigned: true,
    driverStatus: "ACTIVE",
    vehicleRiskLevel: "low" as const,
    capacityRatio: 0.4,
    priority: "NORMAL",
    serviceLevel: "NEXT_DAY",
    traffic: { congestionRatio: 1, stale: false, source: "google" },
    weather: { precipitationMmPerHour: 0, visibilityMeters: 10_000, windKmh: 8, stale: false, source: "open_meteo" },
    incident: null,
    historical: { averageDelayMin: 2, samples: 20 },
  };
}

describe("assessSlaRisk", () => {
  it("keeps a well-buffered order low risk", () => {
    const result = assessSlaRisk(baseInput());
    expect(result.riskLevel).toBe("LOW");
    expect(result.score).toBeLessThan(35);
    expect(result.confidence).toBe("HIGH");
    expect(result.reasons[0]).toContain("comfortable delivery buffer");
  });

  it("combines WMS readiness, promise pressure, and congestion into an explainable alert", () => {
    const result = assessSlaRisk({
      ...baseInput(),
      promisedAt: new Date("2026-09-17T04:30:00.000Z"),
      predictedDeliveryAt: new Date("2026-09-17T05:30:00.000Z"),
      fulfillmentStatus: "PACKED",
      serviceLevel: "EXPRESS",
      traffic: { congestionRatio: 1.72, stale: false, source: "fixture" },
      weather: { precipitationMmPerHour: 12.4, visibilityMeters: 1_800, windKmh: 19, stale: false, source: "fixture" },
    });
    expect(["HIGH", "CRITICAL"]).toContain(result.riskLevel);
    expect(result.factors.fulfillmentDelay).toBeGreaterThanOrEqual(60);
    expect(result.factors.traffic).toBe(80);
    expect(result.factors.weather).toBe(75);
    expect(result.reasons.join(" ")).toContain("WMS is PACKED");
    expect(result.recommendation.length).toBeGreaterThan(0);
  });

  it("forces a critical decision for a nearby road closure", () => {
    const result = assessSlaRisk({
      ...baseInput(),
      incident: { roadClosed: true, severity: "CRITICAL", distanceKm: 1.2 },
    });
    expect(result.riskLevel).toBe("CRITICAL");
    expect(result.factors.traffic).toBe(100);
    expect(result.reasons.join(" ")).toContain("road closure");
  });

  it("reduces confidence when only fallback or stale context is available", () => {
    const result = assessSlaRisk({
      ...baseInput(),
      routeAssigned: false,
      driverAssigned: false,
      traffic: { congestionRatio: 1.3, stale: false, source: "fallback" },
      weather: null,
      historical: { averageDelayMin: 0, samples: 0 },
    });
    expect(result.stale).toBe(true);
    expect(result.confidence).toBe("LOW");
    expect(result.reasons.join(" ")).toContain("stale or using fallback");
  });

  it("keeps traffic and weather penalties as separate factors", () => {
    const trafficOnly = assessSlaRisk({ ...baseInput(), traffic: { congestionRatio: 1.8, stale: false, source: "google" } });
    const weatherOnly = assessSlaRisk({ ...baseInput(), weather: { precipitationMmPerHour: 15, visibilityMeters: 10_000, windKmh: 8, stale: false, source: "open_meteo" } });
    expect(trafficOnly.factors.traffic).toBeGreaterThan(weatherOnly.factors.traffic);
    expect(weatherOnly.factors.weather).toBeGreaterThan(trafficOnly.factors.weather);
  });

  it("reports no promise buffer after the promise has passed", () => {
    expect(calculateSlaPressure({ ...baseInput(), promisedAt: new Date("2026-09-17T02:30:00.000Z") })).toBe(100);
  });

  it("honors region-configured score bands without changing the factor math", () => {
    const result = assessSlaRisk({ ...baseInput(), thresholds: { watchScore: 10, highScore: 50, criticalScore: 90 } });
    expect(result.score).toBeGreaterThanOrEqual(10);
    expect(result.riskLevel).toBe("WATCH");
  });
});
