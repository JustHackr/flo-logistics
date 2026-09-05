import { describe, expect, it } from "vitest";
import {
  buildLoadSessionReport,
  createLoadSessionAccumulator,
  recordLoadSample,
} from "./load-session-report";

describe("load session report", () => {
  it("tracks peak, average, and over-capacity time", () => {
    const acc = createLoadSessionAccumulator(60, 5, 0);
    recordLoadSample(acc, 3, 0.8, 0);
    recordLoadSample(acc, 5, 0.85, 10_000);
    recordLoadSample(acc, 6, 0.9, 20_000);
    recordLoadSample(acc, 6, 0.88, 30_000);

    const report = buildLoadSessionReport(acc, 40_000);
    expect(report.peakCount).toBe(6);
    expect(report.finalCount).toBe(6);
    expect(report.overCapacityEventCount).toBe(1);
    expect(report.overCapacitySec).toBe(20);
    expect(report.atCapacitySec).toBe(10);
    expect(report.averageCount).toBe(5);
    expect(report.actualDurationSec).toBe(40);
    expect(report.plannedDurationSec).toBe(60);
  });

  it("records count change events", () => {
    const acc = createLoadSessionAccumulator(30, 4, 1000);
    recordLoadSample(acc, 1, 0.7, 1000);
    recordLoadSample(acc, 1, 0.7, 2000);
    recordLoadSample(acc, 2, 0.75, 3000);
    const report = buildLoadSessionReport(acc, 4000);
    expect(report.countEvents.map((e) => e.count)).toEqual([0, 1, 2]);
  });
});
