import { describe, expect, it } from "vitest";
import { distanceToRouteKm, haversineDistanceKm, nearestRouteStop } from "./geo";

describe("route condition geometry", () => {
  const route = [{ lat: -6.2, lng: 106.8 }, { lat: -6.2, lng: 106.9 }];

  it("finds a nearby point on a route rather than only comparing endpoints", () => {
    expect(distanceToRouteKm({ lat: -6.205, lng: 106.85 }, route)).toBeLessThan(1);
    expect(distanceToRouteKm({ lat: -6.35, lng: 106.85 }, route)).toBeGreaterThan(10);
  });

  it("returns a stable nearest stop for incident explanations", () => {
    const stops = [{ routeStopId: "stop-a", lat: -6.2, lng: 106.82 }, { routeStopId: "stop-b", lat: -6.2, lng: 106.89 }];
    expect(nearestRouteStop({ lat: -6.2, lng: 106.81 }, stops)?.routeStopId).toBe("stop-a");
    expect(haversineDistanceKm({ lat: -6.2, lng: 106.8 }, { lat: -6.2, lng: 106.8 })).toBe(0);
  });
});
