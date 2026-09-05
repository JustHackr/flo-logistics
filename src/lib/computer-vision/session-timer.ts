export const SESSION_DURATION_PRESETS_SEC = [30, 60, 120, 300, 600] as const;

export const DEFAULT_SESSION_DURATION_SEC = 60;

export function clampSessionDurationSec(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_SESSION_DURATION_SEC;
  return Math.min(3600, Math.max(10, Math.round(value)));
}

export function remainingSessionSec(
  startedAtMs: number,
  durationSec: number,
  nowMs: number
): number {
  const elapsedSec = Math.max(0, (nowMs - startedAtMs) / 1000);
  return Math.max(0, Math.ceil(durationSec - elapsedSec));
}

export function isSessionExpired(
  startedAtMs: number,
  durationSec: number,
  nowMs: number
): boolean {
  return nowMs - startedAtMs >= durationSec * 1000;
}

export function formatSessionPresetLabel(sec: number): string {
  if (sec < 60) return `${sec}s`;
  if (sec % 60 === 0) return `${sec / 60}m`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${s}s`;
}
