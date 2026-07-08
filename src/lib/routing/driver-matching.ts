import type { RiskLevel } from "@/lib/vqi";

export type DriverMatchCandidate = {
  driverId: string;
  name: string;
  employeeId: string | null;
  vehicleId: string;
  vehicleName: string;
  vehicleType: "van" | "motorcycle";
  engineType: string;
  vqi: number;
  riskLevel: RiskLevel;
  rank: number;
};

export type DriverMatchingResult = {
  vehicleType: "van" | "motorcycle";
  candidates: DriverMatchCandidate[];
  selectedDriverId: string;
  selectedDriverName: string;
  selectionReason: string;
};

export type EnrichedDriverForMatching = {
  id: string;
  name: string;
  phone: string | null;
  employeeId: string | null;
  licenseNumber: string | null;
  status: string;
  vehicle: {
    id: string;
    name: string;
    vehicleType: string;
    engineType: string;
    odometerKm: number;
    vehicleAgeYears: number;
    maintenanceCostUnit: number;
  };
  vehicleEnriched: {
    vqi: number;
    riskLevel: RiskLevel;
    recommendedAction: string | null;
  };
};

export function rankDriversByVqi(
  enrichedDrivers: EnrichedDriverForMatching[],
  vehicleType: "van" | "motorcycle"
): DriverMatchingResult | null {
  const filtered = enrichedDrivers.filter(
    (d) => d.vehicle.vehicleType === vehicleType
  );
  if (filtered.length === 0) return null;

  const sorted = [...filtered].sort(
    (a, b) => b.vehicleEnriched.vqi - a.vehicleEnriched.vqi
  );

  const candidates: DriverMatchCandidate[] = sorted.map((d, index) => ({
    driverId: d.id,
    name: d.name,
    employeeId: d.employeeId,
    vehicleId: d.vehicle.id,
    vehicleName: d.vehicle.name,
    vehicleType,
    engineType: d.vehicle.engineType,
    vqi: d.vehicleEnriched.vqi,
    riskLevel: d.vehicleEnriched.riskLevel,
    rank: index + 1,
  }));

  const selected = candidates[0];

  return {
    vehicleType,
    candidates,
    selectedDriverId: selected.driverId,
    selectedDriverName: selected.name,
    selectionReason: `Highest VQI (${selected.vqi}) among ${candidates.length} ${vehicleType} driver${candidates.length === 1 ? "" : "s"}`,
  };
}

export function pickBestDriverFromRanking(
  result: DriverMatchingResult | null,
  enrichedDrivers: EnrichedDriverForMatching[]
) {
  if (!result) return undefined;
  return enrichedDrivers.find((d) => d.id === result.selectedDriverId);
}
