import { describe, expect, it } from "vitest";
import {
  buildSessionReport,
  createHubSessionAccumulator,
  formatDurationSec,
  recordHubOccupancySample,
} from "./hub-session-report";
import type { CompletedVisit } from "./object-tracker";

describe("buildSessionReport", () => {
  it("returns zeros for empty visits", () => {
    const report = buildSessionReport([]);
    expect(report.totalVisits).toBe(0);
    expect(report.averageStaySec).toBe(0);
    expect(report.overstayCount).toBe(0);
    expect(report.overstayPercent).toBe(0);
    expect(report.peakConcurrent).toBe(0);
  });

  it("computes average stay and overstay percentage", () => {
    const visits: CompletedVisit[] = [
      {
        trackLabel: "Object #1",
        enteredAt: 0,
        exitedAt: 30_000,
        durationSec: 30,
        isOverstay: false,
      },
      {
        trackLabel: "Object #2",
        enteredAt: 0,
        exitedAt: 60_000,
        durationSec: 60,
        isOverstay: true,
      },
      {
        trackLabel: "Object #3",
        enteredAt: 0,
        exitedAt: 45_000,
        durationSec: 45,
        isOverstay: false,
      },
    ];
    const report = buildSessionReport(visits);
    expect(report.totalVisits).toBe(3);
    expect(report.averageStaySec).toBe(45);
    expect(report.overstayCount).toBe(1);
    expect(report.overstayPercent).toBeCloseTo(33.3, 1);
  });

  it("includes timed session occupancy stats", () => {
    const acc = createHubSessionAccumulator(60, 0);
    recordHubOccupancySample(acc, 0, 0);
    recordHubOccupancySample(acc, 2, 10_000);
    recordHubOccupancySample(acc, 1, 20_000);
    recordHubOccupancySample(acc, 0, 30_000);
    const report = buildSessionReport([], {
      plannedDurationSec: 60,
      startedAtMs: 0,
      endedAtMs: 40_000,
      accumulator: acc,
    });
    expect(report.plannedDurationSec).toBe(60);
    expect(report.actualDurationSec).toBe(40);
    expect(report.peakConcurrent).toBe(2);
    expect(report.occupiedSec).toBe(20);
    expect(report.averageConcurrent).toBe(0.8);
  });
});

describe("formatDurationSec", () => {
  it("formats seconds as M:SS", () => {
    expect(formatDurationSec(65)).toBe("1:05");
    expect(formatDurationSec(5)).toBe("0:05");
  });
});
