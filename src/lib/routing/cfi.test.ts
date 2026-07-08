import { describe, expect, it } from "vitest";
import { calculateCfi } from "./cfi";

describe("calculateCfi", () => {
  it("scores 100 for EV", () => {
    const result = calculateCfi("ev", 10);
    expect(result.score).toBe(100);
    expect(result.emissionsKg).toBe(0.5);
  });

  it("scores 0 for diesel", () => {
    const result = calculateCfi("diesel", 10);
    expect(result.score).toBe(0);
    expect(result.emissionsKg).toBe(2.2);
  });

  it("interpolates gasoline between EV and diesel", () => {
    const result = calculateCfi("gasoline", 10);
    expect(result.score).toBe(41);
  });
});
