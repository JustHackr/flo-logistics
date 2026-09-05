import type { DetectedBox } from "./box-detector";
import {
  DEFAULT_TRACKER_CONFIG,
  ObjectTracker,
  detectionFromBox,
  type ActiveTrack,
  type TrackerConfig,
} from "./object-tracker";

export type PassageCounterConfig = TrackerConfig & {
  /** Frames a new track must persist before it increments the total. */
  confirmFrames: number;
};

export const DEFAULT_PASSAGE_COUNTER_CONFIG: PassageCounterConfig = {
  ...DEFAULT_TRACKER_CONFIG,
  maxDurationSec: Number.POSITIVE_INFINITY,
  missFramesThreshold: 4,
  matchIouThreshold: 0.18,
  matchDistancePx: 90,
  confirmFrames: 2,
};

export type PassageUpdate = {
  totalPassed: number;
  visibleCount: number;
  newlyCounted: number;
  activeTracks: ActiveTrack[];
};

/**
 * Counts each brown box that enters the camera once.
 * Total only increases — leaving the frame does not decrease the count.
 */
export class BoxPassageCounter {
  private tracker = new ObjectTracker();
  private totalPassed = 0;
  private countedIds = new Set<string>();
  private pendingFrames = new Map<string, number>();

  reset() {
    this.tracker.reset();
    this.totalPassed = 0;
    this.countedIds.clear();
    this.pendingFrames.clear();
  }

  getTotalPassed(): number {
    return this.totalPassed;
  }

  update(
    boxes: DetectedBox[],
    nowMs: number,
    configOverrides?: Partial<PassageCounterConfig>
  ): PassageUpdate {
    const config: PassageCounterConfig = {
      ...DEFAULT_PASSAGE_COUNTER_CONFIG,
      ...configOverrides,
    };

    const detections = boxes.map(detectionFromBox);
    const { activeTracks } = this.tracker.update(detections, nowMs, config);

    const activeIds = new Set(activeTracks.map((t) => t.id));
    for (const id of [...this.pendingFrames.keys()]) {
      if (!activeIds.has(id) && !this.countedIds.has(id)) {
        this.pendingFrames.delete(id);
      }
    }

    let newlyCounted = 0;
    for (const track of activeTracks) {
      if (this.countedIds.has(track.id)) continue;
      const seen = (this.pendingFrames.get(track.id) ?? 0) + 1;
      this.pendingFrames.set(track.id, seen);
      if (seen >= config.confirmFrames) {
        this.countedIds.add(track.id);
        this.pendingFrames.delete(track.id);
        this.totalPassed++;
        newlyCounted++;
      }
    }

    return {
      totalPassed: this.totalPassed,
      visibleCount: activeTracks.length,
      newlyCounted,
      activeTracks,
    };
  }
}
