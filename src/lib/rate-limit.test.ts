import { describe, expect, it } from "vitest";
import { checkRateLimit } from "./rate-limit";

describe("checkRateLimit", () => {
  it("allows requests under the limit and blocks after", () => {
    const key = `test-${Math.random()}`;
    const now = 1_000_000;

    expect(checkRateLimit({ key, limit: 2, windowMs: 60_000, now })).toEqual({
      ok: true,
      remaining: 1,
    });
    expect(checkRateLimit({ key, limit: 2, windowMs: 60_000, now })).toEqual({
      ok: true,
      remaining: 0,
    });
    expect(checkRateLimit({ key, limit: 2, windowMs: 60_000, now })).toEqual({
      ok: false,
      retryAfterSec: 60,
    });
  });

  it("resets after the window", () => {
    const key = `test-reset-${Math.random()}`;
    const now = 2_000_000;
    checkRateLimit({ key, limit: 1, windowMs: 1_000, now });
    expect(
      checkRateLimit({ key, limit: 1, windowMs: 1_000, now: now + 1_001 })
    ).toEqual({ ok: true, remaining: 0 });
  });
});
