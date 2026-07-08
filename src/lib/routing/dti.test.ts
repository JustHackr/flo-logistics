import { describe, expect, it } from "vitest";
import { calculateDti } from "./dti";

describe("calculateDti", () => {
  it("scores 100 when delivered on planned ETA", () => {
    const received = new Date("2026-07-08T08:00:00Z");
    const planned = new Date("2026-07-08T10:00:00Z");
    const delivered = new Date("2026-07-08T10:00:00Z");
    const result = calculateDti({
      receivedAt: received,
      plannedEtaAt: planned,
      deliveredAt: delivered,
    });
    expect(result.status).toBe("computed");
    expect(result.score).toBe(100);
    expect(result.slackMin).toBe(0);
  });

  it("penalizes late delivery", () => {
    const received = new Date("2026-07-08T08:00:00Z");
    const planned = new Date("2026-07-08T10:00:00Z");
    const delivered = new Date("2026-07-08T10:20:00Z");
    const result = calculateDti({
      receivedAt: received,
      plannedEtaAt: planned,
      deliveredAt: delivered,
    });
    expect(result.slackMin).toBe(20);
    expect(result.score).toBe(90);
  });

  it("returns pending when timestamps missing", () => {
    const result = calculateDti({ receivedAt: null, plannedEtaAt: null, deliveredAt: null });
    expect(result.status).toBe("pending");
  });
});
