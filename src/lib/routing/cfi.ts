import type { EngineType } from "@/lib/types";
import { estimateEmissionsKg, CO2_KG_PER_KM } from "@/lib/routing/emissions";

export { CO2_KG_PER_KM };

export type CfiResult = {
  score: number;
  emissionsKg: number;
  benchmarkKg: number;
  worstKg: number;
  engineType: EngineType;
  distanceKm: number;
};

export function calculateCfi(
  engineType: EngineType,
  distanceKm: number
): CfiResult {
  const actualKg = estimateEmissionsKg(engineType, distanceKm);
  const benchmarkKg = estimateEmissionsKg("ev", distanceKm);
  const worstKg = estimateEmissionsKg("diesel", distanceKm);

  const denominator = worstKg - benchmarkKg;
  const score =
    denominator > 0
      ? Math.min(
          100,
          Math.max(
            0,
            Math.round(100 * ((worstKg - actualKg) / denominator))
          )
        )
      : 100;

  return {
    score,
    emissionsKg: actualKg,
    benchmarkKg,
    worstKg,
    engineType,
    distanceKm,
  };
}

export function allocateStopEmissions(
  stopDistanceKm: number,
  routeTotalDistanceKm: number,
  routeEmissionsKg: number
) {
  if (routeTotalDistanceKm <= 0) return 0;
  return (
    Math.round(
      (stopDistanceKm / routeTotalDistanceKm) * routeEmissionsKg * 100
    ) / 100
  );
}
