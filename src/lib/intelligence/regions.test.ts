import { describe, expect, it } from "vitest";
import { DEFAULT_JAKARTA_REGION, isInRegion, regionBbox, regionCenter } from "./regions";

describe("intelligence regions", () => {
  it("keeps observations inside the configured bounding box", () => {
    expect(isInRegion(DEFAULT_JAKARTA_REGION, -6.2, 106.8)).toBe(true);
    expect(isInRegion(DEFAULT_JAKARTA_REGION, -7, 106.8)).toBe(false);
  });

  it("derives provider-safe center and bbox values", () => {
    expect(regionCenter(DEFAULT_JAKARTA_REGION)).toEqual({ lat: -6.25, lng: 106.85 });
    expect(regionBbox(DEFAULT_JAKARTA_REGION)).toBe("106.55,-6.45,107.15,-6.05");
  });
});
