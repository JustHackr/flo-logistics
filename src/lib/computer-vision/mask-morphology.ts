/**
 * In-place morphological open (erode then dilate) over an ROI.
 * Removes speckles before connected-component labeling.
 */
let scratchMask = new Uint8Array(0);

function ensureScratch(size: number) {
  if (scratchMask.length < size) {
    scratchMask = new Uint8Array(size);
  }
}

function erodeRoi(
  mask: Uint8Array,
  out: Uint8Array,
  width: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  minNeighbors: number
) {
  for (let y = y1; y < y2; y++) {
    const row = y * width;
    for (let x = x1; x < x2; x++) {
      const i = row + x;
      if (!mask[i]) {
        out[i] = 0;
        continue;
      }
      let neighbors = 0;
      for (let dy = -1; dy <= 1; dy++) {
        const ny = y + dy;
        if (ny < y1 || ny >= y2) continue;
        const nrow = ny * width;
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          if (nx < x1 || nx >= x2) continue;
          if (mask[nrow + nx]) neighbors++;
        }
      }
      out[i] = neighbors >= minNeighbors ? 1 : 0;
    }
  }
}

function dilateRoi(
  mask: Uint8Array,
  out: Uint8Array,
  width: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
) {
  for (let y = y1; y < y2; y++) {
    const row = y * width;
    for (let x = x1; x < x2; x++) {
      const i = row + x;
      let on = 0;
      for (let dy = -1; dy <= 1 && !on; dy++) {
        const ny = y + dy;
        if (ny < y1 || ny >= y2) continue;
        const nrow = ny * width;
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          if (nx < x1 || nx >= x2) continue;
          if (mask[nrow + nx]) {
            on = 1;
            break;
          }
        }
      }
      out[i] = on;
    }
  }
}

/** Opens the mask inside [0,width)×[0,height) (full frame). */
export function morphologicalOpenFull(
  mask: Uint8Array,
  width: number,
  height: number,
  minNeighbors = 5
): void {
  const size = width * height;
  ensureScratch(size);
  erodeRoi(mask, scratchMask, width, 0, 0, width, height, minNeighbors);
  dilateRoi(scratchMask, mask, width, 0, 0, width, height);
}

/** Opens the mask inside an ROI only. */
export function morphologicalOpenRoi(
  mask: Uint8Array,
  width: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  minNeighbors = 5
): void {
  ensureScratch(mask.length);
  erodeRoi(mask, scratchMask, width, x1, y1, x2, y2, minNeighbors);
  dilateRoi(scratchMask, mask, width, x1, y1, x2, y2);
}
