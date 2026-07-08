import { describe, expect, it } from "vitest";
import {
  buildRouteWaypoints,
  deriveDepartureLegFromStops,
  deriveReturnLegFromTotals,
} from "./waypoints";

const WAREHOUSE = {
  name: "Blok M Square Warehouse",
  address: "Blok M Square, Jakarta, Indonesia",
  lat: -6.2445,
  lng: 106.8001,
};

describe("buildRouteWaypoints", () => {
  it("places warehouse at sequence 0 and last, with deliveries in between", () => {
    const deliveries = [
      {
        orderId: "o1",
        recipientAddress: "Jl. Sudirman Blok A, Jakarta",
        lat: -6.2148,
        lng: 106.827,
        etaAt: "2026-07-08T02:00:00.000Z",
        distanceKm: 3.2,
        durationMin: 12,
        serviceTimeMin: 10,
      },
      {
        orderId: "o2",
        recipientAddress: "Jl. Kemang Selatan, Jakarta",
        lat: -6.261,
        lng: 106.815,
        etaAt: "2026-07-08T02:30:00.000Z",
        distanceKm: 5.1,
        durationMin: 18,
        serviceTimeMin: 10,
      },
    ];

    const waypoints = buildRouteWaypoints(
      WAREHOUSE,
      "2026-07-08T01:00:00.000Z",
      deliveries,
      { distanceKm: 3.2, durationMin: 12 },
      { distanceKm: 4.5, durationMin: 15 }
    );

    expect(waypoints).toHaveLength(4);
    expect(waypoints[0]).toMatchObject({
      stopType: "warehouse",
      role: "departure",
      sequence: 0,
      name: WAREHOUSE.name,
    });
    expect(waypoints[1]).toMatchObject({
      stopType: "delivery",
      sequence: 1,
      orderId: "o1",
    });
    expect(waypoints[2]).toMatchObject({
      stopType: "delivery",
      sequence: 2,
      orderId: "o2",
    });
    expect(waypoints[3]).toMatchObject({
      stopType: "warehouse",
      role: "return",
      sequence: 3,
      distanceKm: 4.5,
      durationMin: 15,
    });
  });

  it("returns only warehouse bookends when there are no deliveries", () => {
    const waypoints = buildRouteWaypoints(
      WAREHOUSE,
      "2026-07-08T01:00:00.000Z",
      [],
      { distanceKm: 0, durationMin: 0 },
      { distanceKm: 0, durationMin: 0 }
    );

    expect(waypoints).toHaveLength(2);
    expect(waypoints[0].stopType).toBe("warehouse");
    expect(waypoints[1].stopType).toBe("warehouse");
  });
});

describe("deriveReturnLegFromTotals", () => {
  it("computes return leg from route totals minus delivery legs and service time", () => {
    const returnLeg = deriveReturnLegFromTotals(
      15,
      60,
      [
        { distanceKm: 3, durationMin: 10 },
        { distanceKm: 5, durationMin: 15 },
      ]
    );

    expect(returnLeg.distanceKm).toBe(7);
    expect(returnLeg.durationMin).toBe(15);
  });
});

describe("deriveDepartureLegFromStops", () => {
  it("uses the first delivery stop leg as the departure leg", () => {
    const leg = deriveDepartureLegFromStops([
      { distanceKm: 2.5, durationMin: 8 },
      { distanceKm: 4, durationMin: 12 },
    ]);

    expect(leg).toEqual({ distanceKm: 2.5, durationMin: 8 });
  });
});
