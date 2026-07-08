export type EngineType = "gasoline" | "diesel" | "ev";
export type VehicleType = "van" | "motorcycle";

export interface VehicleWithAnalysis {
  id: string;
  name: string;
  vehicleType: VehicleType;
  engineType: EngineType;
  vehicleAgeYears: number;
  odometerKm: number;
  kilometersPerFleet: number;
  vehicleLifetimeYears: number;
  expectedLifetimeKm: number;
  maintenanceCostUnit: number;
  lastMaintenanceDate: string | null;
  nextMaintenanceDate: string | null;
  maintenanceIntervalKm: number;
  notes: string | null;
  dataSource: string;
  connectorId: string | null;
  createdAt: string;
  updatedAt: string;
  vqi: number;
  riskLevel: "low" | "medium" | "high";
  penalties: {
    age: number;
    odometer: number;
    cost: number;
    planning: number;
    total: number;
  };
  predictedNextMaintenance: string | null;
  estimatedCost: number;
  recommendedAction: string;
}
