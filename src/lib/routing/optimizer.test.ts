import { afterEach, describe, expect, it, vi } from "vitest";
import { optimizeRoundTripByNearestNeighbor } from "./optimizer";

const WAREHOUSE = { lat: -6.2445, lng: 106.8001 };

function mockOsrmFetch() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes("/table/v1/")) {
        return {
          ok: true,
          json: async () => ({
            code: "Ok",
            distances: [[3000, 5000, 2000]],
            durations: [[400, 700, 300]],
          }),
        };
      }

      if (url.includes("/route/v1/")) {
        return {
          ok: true,
          json: async () => ({
            code: "Ok",
            routes: [{ distance: 3000, duration: 400 }],
          }),
        };
      }

      throw new Error(`unexpected fetch: ${url}`);
    })
  );
}

describe("optimizeRoundTripByNearestNeighbor", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("orders stops and refines ETAs with cumulative departure times", async () => {
    vi.stubEnv("GOOGLE_MAPS_API_KEY", "");
    vi.stubEnv("GOOGLE_DISTANCE_MATRIX_API_KEY", "");
    mockOsrmFetch();

    const departTime = new Date("2026-07-08T01:00:00.000Z"); // weekday rush WIB

    const result = await optimizeRoundTripByNearestNeighbor(
      WAREHOUSE,
      [
        { orderId: "a", lat: -6.235, lng: 106.81 },
        { orderId: "b", lat: -6.22, lng: 106.82 },
        { orderId: "c", lat: -6.245, lng: 106.799 },
      ],
      departTime
    );

    expect(result.orderedStops).toHaveLength(3);
    expect(result.orderedStops[0].sequence).toBe(1);
    expect(result.departureLegDistanceKm).toBeGreaterThan(0);
    expect(result.departureLegDurationMin).toBeGreaterThan(0);
    expect(result.departureLegDistanceKm).toBe(result.orderedStops[0].distanceKm);
    expect(result.returnLegDistanceKm).toBeGreaterThan(0);
    expect(result.totalDurationMin).toBeGreaterThan(
      result.orderedStops.reduce((s, stop) => s + stop.durationMin, 0)
    );

    const firstEta = result.orderedStops[0].etaAt.getTime();
    const secondEta = result.orderedStops[1].etaAt.getTime();
    expect(secondEta).toBeGreaterThan(firstEta);
    expect(result.routeEndAt.getTime()).toBeGreaterThan(secondEta);
  });
});
