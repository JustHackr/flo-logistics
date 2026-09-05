import { z } from "zod";
import type { LoadSessionReport } from "./load-session-report";
import type { SessionReport } from "./hub-session-report";
import {
  readLocalStorage,
  removeLocalStorage,
  writeLocalStorage,
} from "@/lib/safe-storage";

export const CV_SESSION_HISTORY_KEY = "flo.cvSessionHistory";
export const CV_SESSION_HISTORY_LIMIT = 40;

const capacityStatusSchema = z.enum(["ok", "at_capacity", "over_capacity"]);

const loadCountEventSchema = z.object({
  atMs: z.number(),
  count: z.number(),
  status: capacityStatusSchema,
});

const loadReportSchema = z.object({
  plannedDurationSec: z.number(),
  actualDurationSec: z.number(),
  maxCapacity: z.number(),
  sampleCount: z.number(),
  peakCount: z.number(),
  averageCount: z.number(),
  finalCount: z.number(),
  averageConfidence: z.number(),
  atCapacitySec: z.number(),
  overCapacitySec: z.number(),
  overCapacityEventCount: z.number(),
  countEvents: z.array(loadCountEventSchema),
});

const hubVisitSchema = z.object({
  trackLabel: z.string(),
  enteredAt: z.number(),
  exitedAt: z.number(),
  durationSec: z.number(),
  isOverstay: z.boolean(),
});

const hubReportSchema = z.object({
  plannedDurationSec: z.number(),
  actualDurationSec: z.number(),
  totalVisits: z.number(),
  averageStaySec: z.number(),
  overstayCount: z.number(),
  overstayPercent: z.number(),
  peakConcurrent: z.number(),
  occupiedSec: z.number(),
  averageConcurrent: z.number(),
  visits: z.array(hubVisitSchema),
});

const storedSessionSchema = z.discriminatedUnion("kind", [
  z.object({
    id: z.string(),
    kind: z.literal("load"),
    completedAt: z.number(),
    report: loadReportSchema,
  }),
  z.object({
    id: z.string(),
    kind: z.literal("hub"),
    completedAt: z.number(),
    report: hubReportSchema,
  }),
]);

export type StoredCvSession = z.infer<typeof storedSessionSchema>;

export type CvSessionHistorySummary = {
  totalSessions: number;
  loadSessions: number;
  hubSessions: number;
  sessionsToday: number;
  latestLoadPeak: number | null;
  latestHubOverstayPercent: number | null;
  avgLoadPeak: number | null;
  totalHubOverstays: number;
  recent: StoredCvSession[];
};

function startOfLocalDayMs(now = Date.now()): number {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function loadCvSessionHistory(): StoredCvSession[] {
  try {
    const raw = readLocalStorage(CV_SESSION_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    const result = z.array(storedSessionSchema).safeParse(parsed);
    if (!result.success) return [];
    return result.data;
  } catch {
    return [];
  }
}

export function saveCvSessionHistory(sessions: StoredCvSession[]) {
  writeLocalStorage(
    CV_SESSION_HISTORY_KEY,
    JSON.stringify(sessions.slice(0, CV_SESSION_HISTORY_LIMIT))
  );
}

export function appendLoadSessionReport(
  report: LoadSessionReport,
  completedAt = Date.now()
): StoredCvSession[] {
  const entry: StoredCvSession = {
    id: `load-${completedAt}-${Math.random().toString(36).slice(2, 8)}`,
    kind: "load",
    completedAt,
    report,
  };
  const next = [entry, ...loadCvSessionHistory()].slice(
    0,
    CV_SESSION_HISTORY_LIMIT
  );
  saveCvSessionHistory(next);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("flo:cv-session-saved"));
  }
  return next;
}

export function appendHubSessionReport(
  report: SessionReport,
  completedAt = Date.now()
): StoredCvSession[] {
  const entry: StoredCvSession = {
    id: `hub-${completedAt}-${Math.random().toString(36).slice(2, 8)}`,
    kind: "hub",
    completedAt,
    report,
  };
  const next = [entry, ...loadCvSessionHistory()].slice(
    0,
    CV_SESSION_HISTORY_LIMIT
  );
  saveCvSessionHistory(next);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("flo:cv-session-saved"));
  }
  return next;
}

export function clearCvSessionHistory() {
  removeLocalStorage(CV_SESSION_HISTORY_KEY);
}

export function summarizeCvSessionHistory(
  sessions: StoredCvSession[],
  now = Date.now()
): CvSessionHistorySummary {
  const dayStart = startOfLocalDayMs(now);
  const load = sessions.filter((s) => s.kind === "load");
  const hub = sessions.filter((s) => s.kind === "hub");
  const loadPeaks = load.map((s) => s.report.peakCount);
  const avgLoadPeak =
    loadPeaks.length > 0
      ? Math.round(
          (loadPeaks.reduce((a, b) => a + b, 0) / loadPeaks.length) * 10
        ) / 10
      : null;

  return {
    totalSessions: sessions.length,
    loadSessions: load.length,
    hubSessions: hub.length,
    sessionsToday: sessions.filter((s) => s.completedAt >= dayStart).length,
    latestLoadPeak: load[0]?.report.peakCount ?? null,
    latestHubOverstayPercent: hub[0]?.report.overstayPercent ?? null,
    avgLoadPeak,
    totalHubOverstays: hub.reduce((sum, s) => sum + s.report.overstayCount, 0),
    recent: sessions.slice(0, 8),
  };
}
