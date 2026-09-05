import { describe, expect, it } from "vitest";
import { BoxPassageCounter } from "./box-passage-counter";
import type { DetectedBox } from "./box-detector";

function box(x: number, y = 10): DetectedBox {
  return { x, y, width: 40, height: 30, confidence: 0.9 };
}

describe("BoxPassageCounter", () => {
  it("counts a box once after confirm frames and never decreases", () => {
    const counter = new BoxPassageCounter();
    const config = { confirmFrames: 2, missFramesThreshold: 2 };

    let update = counter.update([box(10)], 0, config);
    expect(update.totalPassed).toBe(0);

    update = counter.update([box(12)], 100, config);
    expect(update.totalPassed).toBe(1);
    expect(update.newlyCounted).toBe(1);

    update = counter.update([box(14)], 200, config);
    expect(update.totalPassed).toBe(1);

    update = counter.update([], 300, config);
    update = counter.update([], 400, config);
    expect(update.totalPassed).toBe(1);
    expect(update.visibleCount).toBe(0);
  });

  it("counts a second distinct box separately", () => {
    const counter = new BoxPassageCounter();
    const config = { confirmFrames: 1, missFramesThreshold: 2 };

    counter.update([box(10)], 0, config);
    expect(counter.getTotalPassed()).toBe(1);

    counter.update([box(10), box(120)], 100, config);
    expect(counter.getTotalPassed()).toBe(2);
  });

  it("resets totals", () => {
    const counter = new BoxPassageCounter();
    counter.update([box(10)], 0, { confirmFrames: 1 });
    expect(counter.getTotalPassed()).toBe(1);
    counter.reset();
    expect(counter.getTotalPassed()).toBe(0);
  });
});
