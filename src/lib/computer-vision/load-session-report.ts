import { getCapacityStatus, type CapacityStatus } from "./box-detector";

export type LoadSample = {
  atMs: number;
  count: number;
  confidence: number;
};

export type LoadCountEvent = {
  atMs: number;
  count: number;
  status: CapacityStatus;
};

export type LoadSessionReport = {
  plannedDurationSec: number;
  actualDurationSec: number;
  maxCapacity: number;
  sampleCount: number;
  peakCount: number;
  averageCount: number;
  finalCount: number;
  averageConfidence: number;
  atCapacitySec: number;
  overCapacitySec: number;
  overCapacityEventCount: number;
  countEvents: LoadCountEvent[];
};

export type LoadSessionAccumulator = {
  plannedDurationSec: number;
  maxCapacity: number;
  startedAtMs: number;
  sampleCount: number;
  countSum: number;
  confidenceSum: number;
  peakCount: number;
  finalCount: number;
  atCapacityMs: number;
  overCapacityMs: number;
  overCapacityEventCount: number;
  lastSampleAtMs: number;
  lastCount: number;
  lastStatus: CapacityStatus;
  countEvents: LoadCountEvent[];
};

export function createLoadSessionAccumulator(
  plannedDurationSec: number,
  maxCapacity: number,
  startedAtMs: number
): LoadSessionAccumulator {
  return {
    plannedDurationSec,
    maxCapacity,
    startedAtMs,
    sampleCount: 0,
    countSum: 0,
    confidenceSum: 0,
    peakCount: 0,
    finalCount: 0,
    atCapacityMs: 0,
    overCapacityMs: 0,
    overCapacityEventCount: 0,
    lastSampleAtMs: startedAtMs,
    lastCount: 0,
    lastStatus: "ok",
    countEvents: [
      {
        atMs: startedAtMs,
        count: 0,
        status: "ok",
      },
    ],
  };
}

export function recordLoadSample(
  acc: LoadSessionAccumulator,
  count: number,
  confidence: number,
  atMs: number
): void {
  if (atMs < acc.lastSampleAtMs) return;

  const elapsedMs = atMs - acc.lastSampleAtMs;
  if (acc.sampleCount > 0 && elapsedMs > 0) {
    if (acc.lastStatus === "at_capacity") acc.atCapacityMs += elapsedMs;
    if (acc.lastStatus === "over_capacity") acc.overCapacityMs += elapsedMs;
  }

  const status = getCapacityStatus(count, acc.maxCapacity);
  if (
    status === "over_capacity" &&
    acc.lastStatus !== "over_capacity" &&
    acc.sampleCount > 0
  ) {
    acc.overCapacityEventCount++;
  }

  if (count !== acc.lastCount || acc.sampleCount === 0) {
    acc.countEvents.push({ atMs, count, status });
  }

  acc.sampleCount++;
  acc.countSum += count;
  acc.confidenceSum += confidence;
  acc.peakCount = Math.max(acc.peakCount, count);
  acc.finalCount = count;
  acc.lastSampleAtMs = atMs;
  acc.lastCount = count;
  acc.lastStatus = status;
}

export function buildLoadSessionReport(
  acc: LoadSessionAccumulator,
  endedAtMs: number
): LoadSessionReport {
  const end = Math.max(endedAtMs, acc.startedAtMs);
  if (acc.sampleCount > 0 && end > acc.lastSampleAtMs) {
    const trailingMs = end - acc.lastSampleAtMs;
    if (acc.lastStatus === "at_capacity") acc.atCapacityMs += trailingMs;
    if (acc.lastStatus === "over_capacity") acc.overCapacityMs += trailingMs;
    acc.lastSampleAtMs = end;
  }

  const actualDurationSec = Math.max(
    0,
    Math.round(((end - acc.startedAtMs) / 1000) * 10) / 10
  );

  return {
    plannedDurationSec: acc.plannedDurationSec,
    actualDurationSec,
    maxCapacity: acc.maxCapacity,
    sampleCount: acc.sampleCount,
    peakCount: acc.peakCount,
    averageCount:
      acc.sampleCount > 0
        ? Math.round((acc.countSum / acc.sampleCount) * 10) / 10
        : 0,
    finalCount: acc.finalCount,
    averageConfidence:
      acc.sampleCount > 0
        ? Math.round((acc.confidenceSum / acc.sampleCount) * 1000) / 1000
        : 0,
    atCapacitySec: Math.round((acc.atCapacityMs / 1000) * 10) / 10,
    overCapacitySec: Math.round((acc.overCapacityMs / 1000) * 10) / 10,
    overCapacityEventCount: acc.overCapacityEventCount,
    countEvents: acc.countEvents.slice(),
  };
}

export function emptyLoadSessionReport(
  plannedDurationSec = 60,
  maxCapacity = 5
): LoadSessionReport {
  return {
    plannedDurationSec,
    actualDurationSec: 0,
    maxCapacity,
    sampleCount: 0,
    peakCount: 0,
    averageCount: 0,
    finalCount: 0,
    averageConfidence: 0,
    atCapacitySec: 0,
    overCapacitySec: 0,
    overCapacityEventCount: 0,
    countEvents: [],
  };
}
