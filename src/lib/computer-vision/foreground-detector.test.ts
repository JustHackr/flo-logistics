import { describe, expect, it } from "vitest";
import {
  DEFAULT_PLATFORM_ZONE,
  clampPlatformZone,
  detectForegroundObjects,
  zoneToPixels,
} from "./foreground-detector";

function createImageData(
  width: number,
  height: number,
  fill: (x: number, y: number) => [number, number, number]
): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const [r, g, b] = fill(x, y);
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = 255;
    }
  }
  return { data, width, height } as ImageData;
}

function fillRect(
  image: ImageData,
  x: number,
  y: number,
  w: number,
  h: number,
  color: [number, number, number]
) {
  for (let py = y; py < y + h; py++) {
    for (let px = x; px < x + w; px++) {
      const i = (py * image.width + px) * 4;
      image.data[i] = color[0];
      image.data[i + 1] = color[1];
      image.data[i + 2] = color[2];
      image.data[i + 3] = 255;
    }
  }
}

describe("zoneToPixels", () => {
  it("converts normalized zone to pixel coordinates", () => {
    const px = zoneToPixels({ x: 0.25, y: 0.5, width: 0.5, height: 0.25 }, 200, 100);
    expect(px).toEqual({ x: 50, y: 50, width: 100, height: 25 });
  });
});

describe("clampPlatformZone", () => {
  it("keeps the zone inside the unit square", () => {
    const clamped = clampPlatformZone({ x: 0.9, y: -0.1, width: 0.5, height: 0.5 });
    expect(clamped.x).toBeCloseTo(0.5);
    expect(clamped.y).toBe(0);
    expect(clamped.width).toBe(0.5);
    expect(clamped.height).toBe(0.5);
  });
});

describe("detectForegroundObjects", () => {
  it("returns zero when current matches background", () => {
    const bg = createImageData(160, 120, () => [30, 30, 30]);
    const current = createImageData(160, 120, () => [30, 30, 30]);
    const result = detectForegroundObjects(current, bg, DEFAULT_PLATFORM_ZONE);
    expect(result.count).toBe(0);
  });

  it("detects a white blob inside the platform zone", () => {
    const bg = createImageData(200, 160, () => [40, 40, 40]);
    const current = createImageData(200, 160, () => [40, 40, 40]);
    fillRect(current, 90, 70, 40, 35, [255, 255, 255]);
    const result = detectForegroundObjects(current, bg, DEFAULT_PLATFORM_ZONE);
    expect(result.count).toBe(1);
    expect(result.boxes[0].width).toBeGreaterThan(30);
  });

  it("ignores changes outside the platform zone", () => {
    const bg = createImageData(200, 160, () => [40, 40, 40]);
    const current = createImageData(200, 160, () => [40, 40, 40]);
    fillRect(current, 5, 5, 30, 30, [255, 255, 255]);
    const result = detectForegroundObjects(current, bg, DEFAULT_PLATFORM_ZONE);
    expect(result.count).toBe(0);
  });

  it("keeps detected boxes clipped inside the platform square", () => {
    const bg = createImageData(200, 160, () => [40, 40, 40]);
    const current = createImageData(200, 160, () => [40, 40, 40]);
    fillRect(current, 90, 70, 40, 35, [255, 255, 255]);
    const result = detectForegroundObjects(current, bg, DEFAULT_PLATFORM_ZONE);
    expect(result.count).toBe(1);
    const box = result.boxes[0];
    const roi = zoneToPixels(DEFAULT_PLATFORM_ZONE, 200, 160);
    expect(box.x).toBeGreaterThanOrEqual(roi.x);
    expect(box.y).toBeGreaterThanOrEqual(roi.y);
    expect(box.x + box.width).toBeLessThanOrEqual(roi.x + roi.width);
    expect(box.y + box.height).toBeLessThanOrEqual(roi.y + roi.height);
  });
});
