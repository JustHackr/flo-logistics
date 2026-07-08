import { calculateCfi, allocateStopEmissions } from "@/lib/routing/cfi";
import { calculateDti } from "@/lib/routing/dti";
import type { EngineType } from "@/lib/types";

export function enrichOrderDeliveryMetrics(input: {
  receivedAt: Date | string | null | undefined;
  plannedEtaAt: Date | string | null | undefined;
  deliveredAt: Date | string | null | undefined;
  stopDistanceKm: number;
  routeTotalDistanceKm: number;
  routeEmissionsKg: number;
  engineType: EngineType;
}) {
  const dti = calculateDti({
    receivedAt: input.receivedAt,
    plannedEtaAt: input.plannedEtaAt,
    deliveredAt: input.deliveredAt,
  });

  const stopEmissionsKg = allocateStopEmissions(
    input.stopDistanceKm,
    input.routeTotalDistanceKm,
    input.routeEmissionsKg
  );

  const cfi = calculateCfi(input.engineType, input.stopDistanceKm);

  return { dti, cfi, stopEmissionsKg };
}
