import { morphologicalOpenFull } from "./mask-morphology";

export type DetectedBox = {
  x: number;
  y: number;
  width: number;
  height: number;
  /** 0–1 match strength for the detected region. */
  confidence: number;
};

export type DetectionConfig = {
  minArea: number;
  maxArea: number;
  /** Reject blobs larger than this fraction of the frame (blocks humans / big foreign objects). */
  maxAreaRatio: number;
  hueMin: number;
  hueMax: number;
  satMin: number;
  satMax: number;
  valMin: number;
  valMax: number;
  minAspectRatio: number;
  maxAspectRatio: number;
  mergeIouThreshold: number;
  /** Minimum fill ratio (matched pixels / bbox area) to accept a blob. */
  minConfidence: number;
};

export type DetectionResult = {
  count: number;
  boxes: DetectedBox[];
};

/** Tuned for kraft/tan cardboard lunch boxes — rejects skin, clothing, and non-brown objects. */
export const DEFAULT_DETECTION_CONFIG: DetectionConfig = {
  minArea: 220,
  maxArea: 28_000,
  maxAreaRatio: 0.14,
  hueMin: 16,
  hueMax: 40,
  satMin: 0.22,
  satMax: 0.78,
  valMin: 0.2,
  valMax: 0.92,
  minAspectRatio: 0.45,
  maxAspectRatio: 2.1,
  mergeIouThreshold: 0.4,
  minConfidence: 0.42,
};

export type CapacityStatus = "ok" | "at_capacity" | "over_capacity";

export function getCapacityStatus(
  count: number,
  max: number
): CapacityStatus {
  if (count > max) return "over_capacity";
  if (count === max) return "at_capacity";
  return "ok";
}

export function rgbToHsv(
  r: number,
  g: number,
  b: number
): { h: number; s: number; v: number } {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;

  let h = 0;
  if (delta > 0) {
    if (max === rn) {
      h = 60 * (((gn - bn) / delta) % 6);
    } else if (max === gn) {
      h = 60 * ((bn - rn) / delta + 2);
    } else {
      h = 60 * ((rn - gn) / delta + 4);
    }
  }
  if (h < 0) h += 360;

  const s = max === 0 ? 0 : delta / max;
  const v = max;
  return { h, s, v };
}

// Reused across calls so a 60fps detection loop does not allocate
// (and GC-churn) hundreds of KB of typed arrays per frame.
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

/** True when RGB looks like kraft/tan cardboard (warm brown), not skin or foreign colors. */
export function isKraftBrownPixel(r: number, g: number, b: number): boolean {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  // Cardboard is warm: red ≥ green ≫ blue. Skin is pinker (blue closer to red).
  if (rn < gn) return false;
  if (gn <= bn * 1.05) return false;
  if (rn - bn < 0.1) return false;
  if (gn - bn < 0.05) return false;
  // Reject pinkish skin: blue stays relatively high vs red.
  if (bn / Math.max(rn, 0.001) > 0.58) return false;
  if (rn - gn < 0.02 && bn > 0.28) return false;
  return true;
}

function buildMask(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  config: DetectionConfig
): Uint8Array {
  const size = width * height;
  const mask = sharedMask;
  // Inlined HSV + kraft chromaticity: only brown cardboard pixels survive.
  for (let i = 0; i < size; i++) {
    const o = i * 4;
    const r = data[o];
    const g = data[o + 1];
    const b = data[o + 2];
    if (!isKraftBrownPixel(r, g, b)) {
      mask[i] = 0;
      continue;
    }

    const rn = r / 255;
    const gn = g / 255;
    const bn = b / 255;
    const max = rn > gn ? (rn > bn ? rn : bn) : gn > bn ? gn : bn;

    if (max < config.valMin || max > config.valMax) {
      mask[i] = 0;
      continue;
    }

    const min = rn < gn ? (rn < bn ? rn : bn) : gn < bn ? gn : bn;
    const delta = max - min;
    const s = max === 0 ? 0 : delta / max;
    if (s < config.satMin || s > config.satMax) {
      mask[i] = 0;
      continue;
    }

    let h = 0;
    if (delta > 0) {
      if (max === rn) {
        h = 60 * (((gn - bn) / delta) % 6);
      } else if (max === gn) {
        h = 60 * ((bn - rn) / delta + 2);
      } else {
        h = 60 * ((rn - gn) / delta + 4);
      }
    }
    if (h < 0) h += 360;

    mask[i] = h >= config.hueMin && h <= config.hueMax ? 1 : 0;
  }
  return mask;
}

class UnionFind {
  private parent: Int32Array;
  private rank: Uint8Array;

  constructor(size: number) {
    this.parent = sharedParent;
    this.rank = sharedRank;
    this.rank.fill(0, 0, size);
    for (let i = 0; i < size; i++) this.parent[i] = i;
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
};

function labelComponents(
  mask: Uint8Array,
  width: number,
  height: number
): Map<number, ComponentStats> {
  const uf = new UnionFind(width * height);
  const index = (x: number, y: number) => y * width + x;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = index(x, y);
      if (!mask[i]) continue;
      if (x > 0 && mask[i - 1]) uf.union(i, i - 1);
      if (y > 0 && mask[i - width]) uf.union(i, i - width);
      if (x > 0 && y > 0 && mask[i - width - 1]) uf.union(i, i - width - 1);
      if (x < width - 1 && y > 0 && mask[i - width + 1]) {
        uf.union(i, i - width + 1);
      }
    }
  }

  const components = new Map<number, ComponentStats>();

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = index(x, y);
      if (!mask[i]) continue;
      const root = uf.find(i);
      const existing = components.get(root);
      if (!existing) {
        components.set(root, {
          minX: x,
          minY: y,
          maxX: x,
          maxY: y,
          area: 1,
        });
      } else {
        existing.minX = Math.min(existing.minX, x);
        existing.minY = Math.min(existing.minY, y);
        existing.maxX = Math.max(existing.maxX, x);
        existing.maxY = Math.max(existing.maxY, y);
        existing.area++;
      }
    }
  }

  return components;
}

function statsToBox(stats: ComponentStats, confidence = 0): DetectedBox {
  return {
    x: stats.minX,
    y: stats.minY,
    width: stats.maxX - stats.minX + 1,
    height: stats.maxY - stats.minY + 1,
    confidence,
  };
}

function componentConfidence(
  mask: Uint8Array,
  width: number,
  stats: ComponentStats
): number {
  let matched = 0;
  let total = 0;
  for (let y = stats.minY; y <= stats.maxY; y++) {
    const row = y * width;
    for (let x = stats.minX; x <= stats.maxX; x++) {
      total++;
      if (mask[row + x]) matched++;
    }
  }
  return total > 0 ? matched / total : 0;
}

function boxArea(box: DetectedBox): number {
  return box.width * box.height;
}

function passesShapeFilters(
  box: DetectedBox,
  area: number,
  frameArea: number,
  config: DetectionConfig
): boolean {
  if (area < config.minArea || area > config.maxArea) return false;
  if (frameArea > 0 && area / frameArea > config.maxAreaRatio) return false;
  if (box.confidence < config.minConfidence) return false;
  const aspect = box.width / Math.max(box.height, 1);
  return aspect >= config.minAspectRatio && aspect <= config.maxAspectRatio;
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
  const union =
    a.width * a.height + b.width * b.height - inter;
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

export function detectCartonBoxes(
  imageData: ImageData,
  configOverrides?: Partial<DetectionConfig>
): DetectionResult {
  const config: DetectionConfig = {
    ...DEFAULT_DETECTION_CONFIG,
    ...configOverrides,
  };

  const { width, height, data } = imageData;
  if (width === 0 || height === 0) {
    return { count: 0, boxes: [] };
  }

  ensureBuffers(width * height);
  const mask = buildMask(data, width, height, config);
  morphologicalOpenFull(mask, width, height, 5);
  const components = labelComponents(mask, width, height);

  const rawBoxes: DetectedBox[] = [];
  const frameArea = width * height;
  for (const stats of components.values()) {
    const confidence = componentConfidence(mask, width, stats);
    const box = statsToBox(stats, confidence);
    if (passesShapeFilters(box, stats.area, frameArea, config)) {
      rawBoxes.push(box);
    }
  }

  const boxes = mergeOverlappingBoxes(rawBoxes, config.mergeIouThreshold);
  return { count: boxes.length, boxes };
}

export function medianOfRecent(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid];
}
