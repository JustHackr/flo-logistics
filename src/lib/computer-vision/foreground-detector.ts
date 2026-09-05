import type { DetectedBox } from "./box-detector";
import { morphologicalOpenRoi } from "./mask-morphology";

export type PlatformZone = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ForegroundConfig = {
  diffThreshold: number;
  minArea: number;
  maxArea: number;
  /** Reject blobs larger than this fraction of the platform ROI (blocks people spanning the zone). */
  maxAreaRatio: number;
  minAspectRatio: number;
  maxAspectRatio: number;
  mergeIouThreshold: number;
  /** Minimum confidence (normalized excess diff) to accept a blob. */
  minConfidence: number;
  /** Fraction of the box that must lie inside the platform square. */
  minInsideRatio: number;
};

export type ForegroundResult = {
  count: number;
  boxes: DetectedBox[];
};

export type PixelRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export const DEFAULT_PLATFORM_ZONE: PlatformZone = {
  x: 0.28,
  y: 0.28,
  width: 0.44,
  height: 0.44,
};

export const DEFAULT_FOREGROUND_CONFIG: ForegroundConfig = {
  diffThreshold: 35,
  minArea: 80,
  maxArea: 80_000,
  maxAreaRatio: 0.9,
  minAspectRatio: 0.2,
  maxAspectRatio: 5,
  mergeIouThreshold: 0.35,
  minConfidence: 0.08,
  minInsideRatio: 0.5,
};

let sharedMask = new Uint8Array(0);
let sharedParent = new Int32Array(0);
let sharedRank = new Uint8Array(0);

function ensureBuffers(size: number) {
  if (sharedMask.length < size) {
    sharedMask = new Uint8Array(size);
    sharedParent = new Int32Array(size);
    sharedRank = new Uint8Array(size);
  }
}

export function zoneToPixels(
  zone: PlatformZone,
  width: number,
  height: number
): PixelRect {
  const x = Math.max(0, Math.min(width - 1, Math.round(zone.x * width)));
  const y = Math.max(0, Math.min(height - 1, Math.round(zone.y * height)));
  const w = Math.max(1, Math.min(width - x, Math.round(zone.width * width)));
  const h = Math.max(1, Math.min(height - y, Math.round(zone.height * height)));
  return { x, y, width: w, height: h };
}

function pixelDiff(
  current: Uint8ClampedArray,
  background: Uint8ClampedArray,
  offset: number
): number {
  return (
    Math.abs(current[offset] - background[offset]) +
    Math.abs(current[offset + 1] - background[offset + 1]) +
    Math.abs(current[offset + 2] - background[offset + 2])
  );
}

function buildDiffMask(
  current: Uint8ClampedArray,
  background: Uint8ClampedArray,
  width: number,
  height: number,
  roi: PixelRect,
  threshold: number
): Uint8Array {
  const mask = sharedMask;
  const roiX1 = roi.x;
  const roiY1 = roi.y;
  const roiX2 = Math.min(width, roi.x + roi.width);
  const roiY2 = Math.min(height, roi.y + roi.height);

  // Clear ROI only — labeling never reads outside the square.
  for (let y = roiY1; y < roiY2; y++) {
    const row = y * width;
    mask.fill(0, row + roiX1, row + roiX2);
  }

  for (let y = roiY1; y < roiY2; y++) {
    const row = y * width;
    for (let x = roiX1; x < roiX2; x++) {
      const i = row + x;
      const diff = pixelDiff(current, background, i * 4);
      mask[i] = diff > threshold ? 1 : 0;
    }
  }
  return mask;
}

class UnionFind {
  private parent: Int32Array;
  private rank: Uint8Array;

  constructor() {
    this.parent = sharedParent;
    this.rank = sharedRank;
  }

  /** Lazily init only the pixels we touch (ROI), not the whole frame. */
  prepare(i: number) {
    this.parent[i] = i;
    this.rank[i] = 0;
  }

  find(x: number): number {
    let root = x;
    while (this.parent[root] !== root) root = this.parent[root];
    let current = x;
    while (this.parent[current] !== current) {
      const next = this.parent[current];
      this.parent[current] = root;
      current = next;
    }
    return root;
  }

  union(a: number, b: number) {
    const rootA = this.find(a);
    const rootB = this.find(b);
    if (rootA === rootB) return;
    if (this.rank[rootA] < this.rank[rootB]) {
      this.parent[rootA] = rootB;
    } else if (this.rank[rootA] > this.rank[rootB]) {
      this.parent[rootB] = rootA;
    } else {
      this.parent[rootB] = rootA;
      this.rank[rootA]++;
    }
  }
}

type ComponentStats = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  area: number;
  diffSum: number;
};

function labelComponentsInRoi(
  mask: Uint8Array,
  current: Uint8ClampedArray,
  background: Uint8ClampedArray,
  width: number,
  height: number,
  roi: PixelRect
): Map<number, ComponentStats> {
  const uf = new UnionFind();
  const roiX1 = roi.x;
  const roiY1 = roi.y;
  const roiX2 = Math.min(width, roi.x + roi.width);
  const roiY2 = Math.min(height, roi.y + roi.height);

  // First pass: init + union neighbors within ROI only.
  for (let y = roiY1; y < roiY2; y++) {
    const row = y * width;
    for (let x = roiX1; x < roiX2; x++) {
      const i = row + x;
      if (!mask[i]) continue;
      uf.prepare(i);
      if (x > roiX1 && mask[i - 1]) uf.union(i, i - 1);
      if (y > roiY1 && mask[i - width]) uf.union(i, i - width);
      if (x > roiX1 && y > roiY1 && mask[i - width - 1]) {
        uf.union(i, i - width - 1);
      }
      if (x + 1 < roiX2 && y > roiY1 && mask[i - width + 1]) {
        uf.union(i, i - width + 1);
      }
    }
  }

  const components = new Map<number, ComponentStats>();
  for (let y = roiY1; y < roiY2; y++) {
    const row = y * width;
    for (let x = roiX1; x < roiX2; x++) {
      const i = row + x;
      if (!mask[i]) continue;
      const diff = pixelDiff(current, background, i * 4);
      const root = uf.find(i);
      const existing = components.get(root);
      if (!existing) {
        components.set(root, {
          minX: x,
          minY: y,
          maxX: x,
          maxY: y,
          area: 1,
          diffSum: diff,
        });
      } else {
        existing.minX = Math.min(existing.minX, x);
        existing.minY = Math.min(existing.minY, y);
        existing.maxX = Math.max(existing.maxX, x);
        existing.maxY = Math.max(existing.maxY, y);
        existing.area++;
        existing.diffSum += diff;
      }
    }
  }
  return components;
}

function componentConfidence(stats: ComponentStats, threshold: number): number {
  if (stats.area === 0) return 0;
  const avgDiff = stats.diffSum / stats.area;
  const normalized = avgDiff / 765;
  const thresholdNorm = threshold / 765;
  const excess = Math.max(0, normalized - thresholdNorm);
  const headroom = Math.max(0.05, 1 - thresholdNorm);
  return Math.min(1, excess / headroom);
}

function statsToBox(stats: ComponentStats, confidence: number): DetectedBox {
  return {
    x: stats.minX,
    y: stats.minY,
    width: stats.maxX - stats.minX + 1,
    height: stats.maxY - stats.minY + 1,
    confidence,
  };
}

function boxArea(box: DetectedBox): number {
  return box.width * box.height;
}

function passesShapeFilters(
  box: DetectedBox,
  area: number,
  roiArea: number,
  config: ForegroundConfig
): boolean {
  if (area < config.minArea || area > config.maxArea) return false;
  if (roiArea > 0 && area / roiArea > config.maxAreaRatio) return false;
  if (box.confidence < config.minConfidence) return false;
  const aspect = box.width / Math.max(box.height, 1);
  return aspect >= config.minAspectRatio && aspect <= config.maxAspectRatio;
}

/** Clip a box to the platform ROI and return null if too little remains inside. */
export function clipBoxToPlatformRoi(
  box: DetectedBox,
  roi: PixelRect,
  minInsideRatio: number
): DetectedBox | null {
  const x1 = Math.max(box.x, roi.x);
  const y1 = Math.max(box.y, roi.y);
  const x2 = Math.min(box.x + box.width, roi.x + roi.width);
  const y2 = Math.min(box.y + box.height, roi.y + roi.height);
  if (x2 <= x1 || y2 <= y1) return null;

  const insideW = x2 - x1;
  const insideH = y2 - y1;
  const insideArea = insideW * insideH;
  const boxAreaValue = Math.max(1, box.width * box.height);
  if (insideArea / boxAreaValue < minInsideRatio) return null;

  // Prefer centroid-in-zone, but if the clipped region is substantial, keep it.
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const centroidInside =
    cx >= roi.x &&
    cy >= roi.y &&
    cx <= roi.x + roi.width &&
    cy <= roi.y + roi.height;
  if (!centroidInside && insideArea / boxAreaValue < 0.75) {
    return null;
  }

  return {
    x: x1,
    y: y1,
    width: insideW,
    height: insideH,
    confidence: box.confidence,
  };
}

function intersectionArea(a: DetectedBox, b: DetectedBox): number {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.width, b.x + b.width);
  const y2 = Math.min(a.y + a.height, b.y + b.height);
  if (x2 <= x1 || y2 <= y1) return 0;
  return (x2 - x1) * (y2 - y1);
}

function iou(a: DetectedBox, b: DetectedBox): number {
  const inter = intersectionArea(a, b);
  if (inter === 0) return 0;
  const union = a.width * a.height + b.width * b.height - inter;
  return union > 0 ? inter / union : 0;
}

function mergeOverlappingBoxes(
  boxes: DetectedBox[],
  threshold: number
): DetectedBox[] {
  const merged: DetectedBox[] = [];
  for (const box of boxes) {
    let absorbed = false;
    for (let i = 0; i < merged.length; i++) {
      if (iou(box, merged[i]) >= threshold) {
        const a = merged[i];
        const minX = Math.min(a.x, box.x);
        const minY = Math.min(a.y, box.y);
        const maxX = Math.max(a.x + a.width, box.x + box.width);
        const maxY = Math.max(a.y + a.height, box.y + box.height);
        const mergedArea = boxArea(merged[i]);
        const incomingArea = boxArea(box);
        const totalArea = mergedArea + incomingArea;
        merged[i] = {
          x: minX,
          y: minY,
          width: maxX - minX,
          height: maxY - minY,
          confidence:
            totalArea > 0
              ? (merged[i].confidence * mergedArea +
                  box.confidence * incomingArea) /
                totalArea
              : Math.max(merged[i].confidence, box.confidence),
        };
        absorbed = true;
        break;
      }
    }
    if (!absorbed) merged.push(box);
  }
  return merged;
}

export function detectForegroundObjects(
  currentFrame: ImageData,
  backgroundFrame: ImageData,
  zone: PlatformZone,
  configOverrides?: Partial<ForegroundConfig>
): ForegroundResult {
  const config: ForegroundConfig = {
    ...DEFAULT_FOREGROUND_CONFIG,
    ...configOverrides,
  };

  const { width, height, data } = currentFrame;
  if (
    width === 0 ||
    height === 0 ||
    backgroundFrame.width !== width ||
    backgroundFrame.height !== height
  ) {
    return { count: 0, boxes: [] };
  }

  ensureBuffers(width * height);
  const roi = zoneToPixels(zone, width, height);
  const mask = buildDiffMask(
    data,
    backgroundFrame.data,
    width,
    height,
    roi,
    config.diffThreshold
  );
  morphologicalOpenRoi(
    mask,
    width,
    roi.x,
    roi.y,
    Math.min(width, roi.x + roi.width),
    Math.min(height, roi.y + roi.height),
    // Soft open: 4/9 keeps small packages; 6/9 was wiping real objects.
    4
  );
  const components = labelComponentsInRoi(
    mask,
    data,
    backgroundFrame.data,
    width,
    height,
    roi
  );

  const rawBoxes: DetectedBox[] = [];
  const roiArea = roi.width * roi.height;
  for (const stats of components.values()) {
    const confidence = componentConfidence(stats, config.diffThreshold);
    const box = statsToBox(stats, confidence);
    if (!passesShapeFilters(box, stats.area, roiArea, config)) continue;
    const clipped = clipBoxToPlatformRoi(box, roi, config.minInsideRatio);
    if (clipped) rawBoxes.push(clipped);
  }

  const boxes = mergeOverlappingBoxes(rawBoxes, config.mergeIouThreshold);
  return { count: boxes.length, boxes };
}

export function sensitivityToForegroundConfig(
  sensitivity: number,
  minObjectSize: number
): Partial<ForegroundConfig> {
  // Higher sensitivity → much lower diff threshold so packages are easy to pick up.
  const t = Math.min(1, Math.max(0, sensitivity / 100));
  const sizeT = Math.min(1, Math.max(0, minObjectSize / 100));
  return {
    diffThreshold: Math.round(55 - t * 45), // 55 @0% → 10 @100%
    minArea: Math.round(40 + sizeT * 360),
    minConfidence: Math.round((0.2 - t * 0.16) * 100) / 100, // 0.20 → 0.04
    minInsideRatio: 0.45,
    maxAreaRatio: 0.92,
  };
}

/** Clamp zone so it stays fully inside the frame (normalized 0–1). */
export function clampPlatformZone(zone: PlatformZone): PlatformZone {
  const width = Math.min(1, Math.max(0.05, zone.width));
  const height = Math.min(1, Math.max(0.05, zone.height));
  const x = Math.min(1 - width, Math.max(0, zone.x));
  const y = Math.min(1 - height, Math.max(0, zone.y));
  return { x, y, width, height };
}
