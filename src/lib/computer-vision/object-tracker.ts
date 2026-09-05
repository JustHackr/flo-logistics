import type { DetectedBox } from "./box-detector";

export type Detection = {
  box: DetectedBox;
  centroid: { x: number; y: number };
};

export type TrackerConfig = {
  maxDurationSec: number;
  missFramesThreshold: number;
  matchIouThreshold: number;
  matchDistancePx: number;
};

export const DEFAULT_TRACKER_CONFIG: TrackerConfig = {
  maxDurationSec: 30,
  missFramesThreshold: 5,
  matchIouThreshold: 0.22,
  matchDistancePx: 70,
};

export type ActiveTrack = {
  id: string;
  label: string;
  dwellSec: number;
  isOverstay: boolean;
  box: DetectedBox;
  confidence: number;
};

export type CompletedVisit = {
  trackLabel: string;
  enteredAt: number;
  exitedAt: number;
  durationSec: number;
  isOverstay: boolean;
};

type InternalTrack = {
  id: string;
  label: string;
  box: DetectedBox;
  enteredAt: number;
  missedFrames: number;
};

export function boxCentroid(box: DetectedBox): { x: number; y: number } {
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

export function detectionFromBox(box: DetectedBox): Detection {
  return { box, centroid: boxCentroid(box) };
}

function centroidDistance(
  a: { x: number; y: number },
  b: { x: number; y: number }
): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function boxIou(a: DetectedBox, b: DetectedBox): number {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.width, b.x + b.width);
  const y2 = Math.min(a.y + a.height, b.y + b.height);
  if (x2 <= x1 || y2 <= y1) return 0;
  const inter = (x2 - x1) * (y2 - y1);
  const union = a.width * a.height + b.width * b.height - inter;
  return union > 0 ? inter / union : 0;
}

function matchScore(
  track: InternalTrack,
  detection: Detection,
  config: TrackerConfig
): number {
  const iou = boxIou(track.box, detection.box);
  if (iou >= config.matchIouThreshold) return iou;
  const dist = centroidDistance(boxCentroid(track.box), detection.centroid);
  if (dist <= config.matchDistancePx) {
    return 0.01 + 1 / (1 + dist);
  }
  return 0;
}

export class ObjectTracker {
  private tracks: InternalTrack[] = [];
  private completedVisits: CompletedVisit[] = [];
  private nextId = 1;

  reset() {
    this.tracks = [];
    this.completedVisits = [];
    this.nextId = 1;
  }

  getCompletedVisits(): readonly CompletedVisit[] {
    return this.completedVisits;
  }

  getVisitCount(): number {
    return this.completedVisits.length;
  }

  /**
   * @param nowMs Wall-clock ms from `Date.now()` — used for enter/exit times
   *   shown in the session report.
   */
  update(
    detections: Detection[],
    nowMs: number,
    config: TrackerConfig
  ): { activeTracks: ActiveTrack[]; newVisits: CompletedVisit[] } {
    const trackCount = this.tracks.length;
    const detCount = detections.length;
    const pairs: { trackIdx: number; detIdx: number; score: number }[] = [];

    for (let ti = 0; ti < trackCount; ti++) {
      for (let di = 0; di < detCount; di++) {
        const score = matchScore(this.tracks[ti], detections[di], config);
        if (score > 0) pairs.push({ trackIdx: ti, detIdx: di, score });
      }
    }

    if (pairs.length > 1) {
      pairs.sort((a, b) => b.score - a.score);
    }

    const trackToDet = new Map<number, number>();
    const usedTracks = new Set<number>();
    const usedDets = new Set<number>();
    for (const pair of pairs) {
      if (usedTracks.has(pair.trackIdx) || usedDets.has(pair.detIdx)) continue;
      usedTracks.add(pair.trackIdx);
      usedDets.add(pair.detIdx);
      trackToDet.set(pair.trackIdx, pair.detIdx);
    }

    const newVisits: CompletedVisit[] = [];
    const stillActive: InternalTrack[] = [];

    for (let ti = 0; ti < trackCount; ti++) {
      const track = this.tracks[ti];
      const detIdx = trackToDet.get(ti);
      if (detIdx !== undefined) {
        track.box = detections[detIdx].box;
        track.missedFrames = 0;
        stillActive.push(track);
      } else {
        const missed = track.missedFrames + 1;
        if (missed >= config.missFramesThreshold) {
          const durationSec = Math.max(0, (nowMs - track.enteredAt) / 1000);
          const visit: CompletedVisit = {
            trackLabel: track.label,
            enteredAt: track.enteredAt,
            exitedAt: nowMs,
            durationSec,
            isOverstay: durationSec > config.maxDurationSec,
          };
          this.completedVisits.push(visit);
          newVisits.push(visit);
        } else {
          track.missedFrames = missed;
          stillActive.push(track);
        }
      }
    }

    for (let di = 0; di < detCount; di++) {
      if (usedDets.has(di)) continue;
      const id = String(this.nextId++);
      stillActive.push({
        id,
        label: `Object #${id}`,
        box: detections[di].box,
        enteredAt: nowMs,
        missedFrames: 0,
      });
    }

    this.tracks = stillActive;

    const activeTracks: ActiveTrack[] = new Array(this.tracks.length);
    for (let i = 0; i < this.tracks.length; i++) {
      const track = this.tracks[i];
      const dwellSec = Math.max(0, (nowMs - track.enteredAt) / 1000);
      activeTracks[i] = {
        id: track.id,
        label: track.label,
        dwellSec,
        isOverstay: dwellSec > config.maxDurationSec,
        box: track.box,
        confidence: track.box.confidence,
      };
    }

    return { activeTracks, newVisits };
  }
}
