import { describe, expect, it } from "vitest";
import {
  summarizeCvSessionHistory,
  type StoredCvSession,
} from "./session-report-history";

describe("summarizeCvSessionHistory", () => {
  it("aggregates load and hub sessions", () => {
    const now = Date.UTC(2026, 6, 12, 10, 0, 0);
    const sessions: StoredCvSession[] = [
      {
        id: "1",
        kind: "load",
        completedAt: now - 1000,
        report: {
          plannedDurationSec: 60,
          actualDurationSec: 60,
          maxCapacity: 5,
          sampleCount: 10,
          peakCount: 6,
          averageCount: 4,
          finalCount: 5,
          averageConfidence: 0.8,
          atCapacitySec: 10,
          overCapacitySec: 5,
          overCapacityEventCount: 1,
          countEvents: [],
        },
      },
      {
        id: "2",
        kind: "hub",
        completedAt: now - 2000,
        report: {
          plannedDurationSec: 60,
          actualDurationSec: 55,
          totalVisits: 3,
          averageStaySec: 20,
          overstayCount: 2,
          overstayPercent: 66.7,
          peakConcurrent: 2,
          occupiedSec: 40,
          averageConcurrent: 1.2,
          visits: [],
        },
      },
    ];

    const summary = summarizeCvSessionHistory(sessions, now);
    expect(summary.totalSessions).toBe(2);
    expect(summary.loadSessions).toBe(1);
    expect(summary.hubSessions).toBe(1);
    expect(summary.latestLoadPeak).toBe(6);
    expect(summary.latestHubOverstayPercent).toBe(66.7);
    expect(summary.totalHubOverstays).toBe(2);
    expect(summary.sessionsToday).toBe(2);
  });
});
