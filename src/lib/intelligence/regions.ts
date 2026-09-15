import type { IntelligenceRegion } from "./types";

export const DEFAULT_JAKARTA_REGION: IntelligenceRegion = {
  id: "jakarta",
  name: "Jakarta & Jabodetabek",
  countryCode: "ID",
  timezone: "Asia/Jakarta",
  minLat: -6.45,
  minLng: 106.55,
  maxLat: -6.05,
  maxLng: 107.15,
  active: true,
};

export function isInRegion(region: IntelligenceRegion, lat: number, lng: number) {
  return lat >= region.minLat && lat <= region.maxLat && lng >= region.minLng && lng <= region.maxLng;
}

export function regionCenter(region: IntelligenceRegion) {
  return {
    lat: (region.minLat + region.maxLat) / 2,
    lng: (region.minLng + region.maxLng) / 2,
  };
}

export function regionBbox(region: IntelligenceRegion) {
  return `${region.minLng},${region.minLat},${region.maxLng},${region.maxLat}`;
}
