import type { EngineType } from "@/lib/types";

export const CO2_KG_PER_KM: Record<EngineType, number> = {
  ev: 0.05,
  gasoline: 0.15,
  diesel: 0.22,
};

export function estimateEmissionsKg(
  engineType: EngineType,
  distanceKm: number
) {
  const factor = CO2_KG_PER_KM[engineType] ?? CO2_KG_PER_KM.gasoline;
  return Math.round(distanceKm * factor * 100) / 100;
}
