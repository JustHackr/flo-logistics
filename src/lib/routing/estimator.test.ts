import { afterEach, describe, expect, it, vi } from "vitest";
import {
  describeTrafficSource,
  estimateManyFromOrigin,
  estimateManyLegsWithOsrmTable,
} from "./estimator";

const ORIGIN = { lat: -6.2445, lng: 106.8001 };
const DEST_A = { lat: -6.235, lng: 106.81 };
const DEST_B = { lat: -6.22, lng: 106.82 };

describe("estimateManyLegsWithOsrmTable", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("parses OSRM table response into calibrated leg estimates", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          code: "Ok",
          distances: [[5000, 8000]],
          durations: [[600, 900]],
        }),
      })
    );

    const results = await estimateManyLegsWithOsrmTable(
      ORIGIN,
      [DEST_A, DEST_B],
      new Date("2026-07-08T15:00:00.000Z")
    );

    expect(results).toHaveLength(2);
    expect(results![0].distanceKm).toBe(5);
    expect(results![0].source).toBe("osrm_traffic");
    expect(results![1].distanceKm).toBe(8);
    expect(results![1].durationMin).toBeGreaterThan(15);
  });

  it("returns null when OSRM table fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network error"))
    );

    const results = await estimateManyLegsWithOsrmTable(
      ORIGIN,
      [DEST_A],
      new Date()
    );

    expect(results).toBeNull();
  });
});

describe("estimateManyFromOrigin", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("falls back to Jakarta model when OSRM is unavailable", async () => {
    vi.stubEnv("GOOGLE_MAPS_API_KEY", "");
    vi.stubEnv("GOOGLE_DISTANCE_MATRIX_API_KEY", "");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network error"))
    );

    const results = await estimateManyFromOrigin(
      ORIGIN,
      [DEST_A],
      new Date("2026-07-08T01:00:00.000Z")
    );

    expect(results).toHaveLength(1);
    expect(results[0].source).toBe("estimated");
    expect(results[0].distanceKm).toBeGreaterThan(0);
    expect(results[0].durationMin).toBeGreaterThan(0);
  });
});

describe("describeTrafficSource", () => {
  it("labels OSRM stack as primary free source", () => {
    expect(describeTrafficSource("osrm_traffic")).toBe(
      "OSRM road distances + Jakarta traffic model"
    );
    expect(describeTrafficSource("estimated")).toBe(
      "Jakarta traffic model (local estimates)"
    );
  });
});
