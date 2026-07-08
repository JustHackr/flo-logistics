import type { LatLng } from "./geo";
import { distanceKm } from "./geo";
import { getTrafficFactor } from "./traffic";

export interface LegEstimate {
  distanceKm: number;
  durationMin: number;
}

export function estimateLeg(a: LatLng, b: LatLng, departTime: Date) {
  const distance = distanceKm(a, b);

  // Baseline average city speed (km/h) and traffic factor.
  const baselineSpeedKmh = 28;
  const speedKmh = baselineSpeedKmh * getTrafficFactor(departTime);

  const durationHours = speedKmh > 0 ? distance / speedKmh : 0;
  const durationMin = durationHours * 60;

  return {
    distanceKm: Math.round(distance * 10) / 10,
    durationMin: Math.round(durationMin * 10) / 10,
  };
}

