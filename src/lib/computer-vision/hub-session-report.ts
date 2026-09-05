import type { CompletedVisit } from "./object-tracker";

export type SessionReport = {
  plannedDurationSec: number;
  actualDurationSec: number;
  totalVisits: number;
  averageStaySec: number;
  overstayCount: number;
  overstayPercent: number;
  peakConcurrent: number;
  occupiedSec: number;
  averageConcurrent: number;
  visits: CompletedVisit[];
};

export type HubOccupancySample = {
  atMs: number;
  activeCount: number;
};

export type HubSessionAccumulator = {
  plannedDurationSec: number;
  startedAtMs: number;
  peakConcurrent: number;
  occupiedMs: number;
  concurrentSum: number;
  sampleCount: number;
  lastSampleAtMs: number;
  lastActiveCount: number;
};

export function createHubSessionAccumulator(
  plannedDurationSec: number,
  startedAtMs: number
): HubSessionAccumulator {
  return {
    plannedDurationSec,
    startedAtMs,
    peakConcurrent: 0,
    occupiedMs: 0,
    concurrentSum: 0,
    sampleCount: 0,
    lastSampleAtMs: startedAtMs,
    lastActiveCount: 0,
  };
}

export function recordHubOccupancySample(
  acc: HubSessionAccumulator,
  activeCount: number,
  atMs: number
): void {
  if (atMs < acc.lastSampleAtMs) return;

  const elapsedMs = atMs - acc.lastSampleAtMs;
  if (acc.sampleCount > 0 && elapsedMs > 0 && acc.lastActiveCount > 0) {
    acc.occupiedMs += elapsedMs;
  }

  acc.sampleCount++;
  acc.concurrentSum += activeCount;
  acc.peakConcurrent = Math.max(acc.peakConcurrent, activeCount);
  acc.lastSampleAtMs = atMs;
  acc.lastActiveCount = activeCount;
}

export function buildSessionReport(
  visits: readonly CompletedVisit[],
  options?: {
    plannedDurationSec?: number;
    startedAtMs?: number;
    endedAtMs?: number;
    accumulator?: HubSessionAccumulator | null;
  }
): SessionReport {
  const totalVisits = visits.length;
  let overstayCount = 0;
  let totalDuration = 0;
  for (const v of visits) {
    if (v.isOverstay) overstayCount++;
    totalDuration += v.durationSec;
  }

  const plannedDurationSec = options?.plannedDurationSec ?? 0;
  const startedAtMs = options?.startedAtMs;
  const endedAtMs = options?.endedAtMs;
  const acc = options?.accumulator;

  let actualDurationSec = 0;
  if (
    typeof startedAtMs === "number" &&
    typeof endedAtMs === "number" &&
    endedAtMs >= startedAtMs
  ) {
    actualDurationSec =
      Math.round(((endedAtMs - startedAtMs) / 1000) * 10) / 10;
  }

  let peakConcurrent = 0;
  let occupiedSec = 0;
  let averageConcurrent = 0;

  if (acc) {
    const end = Math.max(
      endedAtMs ?? acc.lastSampleAtMs,
      acc.startedAtMs
    );
    if (acc.sampleCount > 0 && end > acc.lastSampleAtMs && acc.lastActiveCount > 0) {
      acc.occupiedMs += end - acc.lastSampleAtMs;
      acc.lastSampleAtMs = end;
    }
    peakConcurrent = acc.peakConcurrent;
    occupiedSec = Math.round((acc.occupiedMs / 1000) * 10) / 10;
    averageConcurrent =
      acc.sampleCount > 0
        ? Math.round((acc.concurrentSum / acc.sampleCount) * 10) / 10
        : 0;
    if (actualDurationSec === 0) {
      actualDurationSec =
        Math.round(((end - acc.startedAtMs) / 1000) * 10) / 10;
    }
  }

  return {
    plannedDurationSec,
    actualDurationSec,
    totalVisits,
    averageStaySec:
      totalVisits > 0
        ? Math.round((totalDuration / totalVisits) * 10) / 10
        : 0,
    overstayCount,
    overstayPercent:
      totalVisits > 0
        ? Math.round((overstayCount / totalVisits) * 1000) / 10
        : 0,
    peakConcurrent,
    occupiedSec,
    averageConcurrent,
    visits: visits.slice(),
  };
}

export function formatDurationSec(totalSec: number): string {
  const sec = Math.max(0, Math.floor(totalSec));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function formatClockTime(ms: number): string {
  return new Date(ms).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}
