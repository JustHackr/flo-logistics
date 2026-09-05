import { describe, expect, it } from "vitest";
import {
  detectCartonBoxes,
  getCapacityStatus,
  isKraftBrownPixel,
  medianOfRecent,
  rgbToHsv,
} from "./box-detector";

/** Kraft/tan cardboard tone used in synthetic test frames. */
const CARDBOARD = { r: 186, g: 142, b: 92 };

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
  color: { r: number; g: number; b: number }
) {
  for (let py = y; py < y + h; py++) {
    for (let px = x; px < x + w; px++) {
      const i = (py * image.width + px) * 4;
      image.data[i] = color.r;
      image.data[i + 1] = color.g;
      image.data[i + 2] = color.b;
      image.data[i + 3] = 255;
    }
  }
}

describe("rgbToHsv", () => {
  it("maps kraft cardboard RGB into tan hue range", () => {
    const { h, s, v } = rgbToHsv(
      CARDBOARD.r,
      CARDBOARD.g,
      CARDBOARD.b
    );
    expect(h).toBeGreaterThan(12);
    expect(h).toBeLessThan(48);
    expect(s).toBeGreaterThan(0.1);
    expect(v).toBeGreaterThan(0.18);
  });
});

describe("getCapacityStatus", () => {
  it("returns over_capacity when count exceeds max", () => {
    expect(getCapacityStatus(4, 3)).toBe("over_capacity");
  });

  it("returns at_capacity when count equals max", () => {
    expect(getCapacityStatus(3, 3)).toBe("at_capacity");
  });

  it("returns ok when count is below max", () => {
    expect(getCapacityStatus(2, 5)).toBe("ok");
  });
});

describe("medianOfRecent", () => {
  it("returns median of odd-length series", () => {
    expect(medianOfRecent([1, 5, 3])).toBe(3);
  });

  it("returns median of even-length series", () => {
    expect(medianOfRecent([1, 4, 3, 2])).toBe(3);
  });
});

describe("detectCartonBoxes", () => {
  it("returns zero for black-only image", () => {
    const image = createImageData(160, 120, () => [0, 0, 0]);
    const result = detectCartonBoxes(image);
    expect(result.count).toBe(0);
    expect(result.boxes).toHaveLength(0);
  });

  it("detects a single large tan blob", () => {
    const image = createImageData(160, 120, () => [0, 0, 0]);
    fillRect(image, 40, 30, 50, 40, CARDBOARD);
    const result = detectCartonBoxes(image);
    expect(result.count).toBe(1);
    expect(result.boxes[0].width).toBeGreaterThan(40);
    expect(result.boxes[0].height).toBeGreaterThan(30);
  });

  it("detects two separate tan rectangles on black background", () => {
    const image = createImageData(200, 160, () => [0, 0, 0]);
    fillRect(image, 20, 40, 45, 35, CARDBOARD);
    fillRect(image, 120, 50, 50, 38, CARDBOARD);
    const result = detectCartonBoxes(image);
    expect(result.count).toBe(2);
  });

  it("ignores skin-tone and blue clothing blobs", () => {
    const image = createImageData(200, 160, () => [0, 0, 0]);
    fillRect(image, 20, 30, 50, 45, { r: 220, g: 170, b: 145 }); // skin
    fillRect(image, 120, 40, 50, 40, { r: 40, g: 80, b: 200 }); // blue
    const result = detectCartonBoxes(image);
    expect(result.count).toBe(0);
  });
});

describe("isKraftBrownPixel", () => {
  it("accepts kraft cardboard and rejects skin/blue", () => {
    expect(isKraftBrownPixel(186, 142, 92)).toBe(true);
    expect(isKraftBrownPixel(220, 170, 145)).toBe(false);
    expect(isKraftBrownPixel(40, 80, 200)).toBe(false);
  });
});
