import { describe, expect, it } from "vitest";
import { stopMediaStream } from "./camera-stream";

describe("camera-stream helpers", () => {
  it("stopMediaStream tolerates null", () => {
    expect(() => stopMediaStream(null)).not.toThrow();
    expect(() => stopMediaStream(undefined)).not.toThrow();
  });
});
