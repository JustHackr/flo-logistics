import { describe, expect, it } from "vitest";
import {
  clampSessionDurationSec,
  formatSessionPresetLabel,
  isSessionExpired,
  remainingSessionSec,
} from "./session-timer";

describe("session timer", () => {
  it("clamps duration into a safe range", () => {
    expect(clampSessionDurationSec(5)).toBe(10);
    expect(clampSessionDurationSec(90)).toBe(90);
    expect(clampSessionDurationSec(9999)).toBe(3600);
  });

  it("computes remaining time and expiry", () => {
    expect(remainingSessionSec(0, 60, 15_000)).toBe(45);
    expect(isSessionExpired(0, 60, 59_999)).toBe(false);
    expect(isSessionExpired(0, 60, 60_000)).toBe(true);
  });

  it("formats preset labels", () => {
    expect(formatSessionPresetLabel(30)).toBe("30s");
    expect(formatSessionPresetLabel(120)).toBe("2m");
  });
});
