export const JAKARTA_BOUNDS = {
  // Rough bounding box around Jakarta (demo validation only).
  minLat: -6.50,
  maxLat: -5.85,
  minLng: 106.55,
  maxLng: 107.05,
} as const;

export function isWithinJakartaBounds(lat: number, lng: number) {
  return (
    lat >= JAKARTA_BOUNDS.minLat &&
    lat <= JAKARTA_BOUNDS.maxLat &&
    lng >= JAKARTA_BOUNDS.minLng &&
    lng <= JAKARTA_BOUNDS.maxLng
  );
}

