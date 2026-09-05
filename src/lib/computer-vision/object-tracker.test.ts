import { describe, expect, it } from "vitest";
import {
  DEFAULT_TRACKER_CONFIG,
  ObjectTracker,
  detectionFromBox,
} from "./object-tracker";

describe("ObjectTracker", () => {
  it("creates a track when an object appears", () => {
    const tracker = new ObjectTracker();
    const { activeTracks } = tracker.update(
      [detectionFromBox({ x: 10, y: 10, width: 30, height: 25, confidence: 0.9 })],
      1000,
      DEFAULT_TRACKER_CONFIG
    );
    expect(activeTracks).toHaveLength(1);
    expect(activeTracks[0].label).toBe("Object #1");
    expect(activeTracks[0].dwellSec).toBe(0);
  });

  it("closes a visit after missing frames threshold", () => {
    const tracker = new ObjectTracker();
    const config = { ...DEFAULT_TRACKER_CONFIG, missFramesThreshold: 3 };
    tracker.update(
      [detectionFromBox({ x: 10, y: 10, width: 30, height: 25, confidence: 0.9 })],
      1000,
      config
    );
    let result = tracker.update([], 2000, config);
    expect(result.newVisits).toHaveLength(0);
    result = tracker.update([], 2100, config);
    expect(result.newVisits).toHaveLength(0);
    result = tracker.update([], 2200, config);
    expect(result.newVisits).toHaveLength(1);
    expect(result.newVisits[0].durationSec).toBeCloseTo(1.2, 1);
    expect(result.activeTracks).toHaveLength(0);
  });

  it("flags overstay when duration exceeds max", () => {
    const tracker = new ObjectTracker();
    tracker.update(
      [detectionFromBox({ x: 10, y: 10, width: 30, height: 25, confidence: 0.9 })],
      0,
      { ...DEFAULT_TRACKER_CONFIG, maxDurationSec: 5 }
    );
    const { activeTracks } = tracker.update(
      [detectionFromBox({ x: 12, y: 11, width: 30, height: 25, confidence: 0.9 })],
      6000,
      { ...DEFAULT_TRACKER_CONFIG, maxDurationSec: 5 }
    );
    expect(activeTracks[0].isOverstay).toBe(true);
  });

  it("tracks multiple objects independently", () => {
    const tracker = new ObjectTracker();
    const { activeTracks } = tracker.update(
      [
        detectionFromBox({ x: 10, y: 10, width: 20, height: 20, confidence: 0.8 }),
        detectionFromBox({ x: 80, y: 60, width: 25, height: 25, confidence: 0.7 }),
      ],
      1000,
      DEFAULT_TRACKER_CONFIG
    );
    expect(activeTracks).toHaveLength(2);
  });
});
