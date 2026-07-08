import { describe, expect, it } from "vitest";
import {
  getJakartaTrafficMultiplier,
  calibrateJakartaDurationMin,
} from "./traffic";

describe("Jakarta traffic model", () => {
  it("applies higher multiplier during weekday morning rush", () => {
    // Wednesday 08:00 WIB ≈ 01:00 UTC same calendar day
    const rush = new Date("2026-07-08T01:00:00.000Z");
    const midday = new Date("2026-07-08T05:00:00.000Z"); // 12:00 WIB

    expect(getJakartaTrafficMultiplier(rush)).toBe(1.85);
    expect(getJakartaTrafficMultiplier(midday)).toBe(1.45);
    expect(getJakartaTrafficMultiplier(rush)).toBeGreaterThan(
      getJakartaTrafficMultiplier(midday)
    );
  });

  it("calibrates OSRM free-flow duration with Jakarta factors", () => {
    const rush = new Date("2026-07-08T01:00:00.000Z");
    const offPeak = new Date("2026-07-08T15:00:00.000Z"); // 22:00 WIB night

    const rushMin = calibrateJakartaDurationMin(10, 5, rush);
    const nightMin = calibrateJakartaDurationMin(10, 5, offPeak);

    expect(rushMin).toBeGreaterThan(nightMin);
  });
});
