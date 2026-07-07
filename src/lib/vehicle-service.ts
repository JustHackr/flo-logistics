import type { Vehicle } from "@/generated/prisma/client";
import { defaultPredictor } from "./predictor";
import { calculateVqi } from "./vqi";
import type { VehicleWithAnalysis } from "./types";

export function serializeVehicle(vehicle: Vehicle) {
  return {
    ...vehicle,
    lastMaintenanceDate: vehicle.lastMaintenanceDate?.toISOString() ?? null,
    nextMaintenanceDate: vehicle.nextMaintenanceDate?.toISOString() ?? null,
    createdAt: vehicle.createdAt.toISOString(),
    updatedAt: vehicle.updatedAt.toISOString(),
  };
}

export function enrichVehicle(
  vehicle: Vehicle,
  fleetAvgMaintenanceCost: number
): VehicleWithAnalysis {
  const vqiResult = calculateVqi(vehicle, fleetAvgMaintenanceCost);
  const prediction = defaultPredictor.predict(
    vehicle,
    vqiResult,
    fleetAvgMaintenanceCost
  );

  return {
    ...serializeVehicle(vehicle),
    vehicleType: vehicle.vehicleType as VehicleWithAnalysis["vehicleType"],
    engineType: vehicle.engineType as VehicleWithAnalysis["engineType"],
    vqi: vqiResult.score,
    riskLevel: vqiResult.riskLevel,
    predictedNextMaintenance:
      prediction.predictedNextMaintenance?.toISOString() ?? null,
    estimatedCost: prediction.estimatedCost,
    recommendedAction: prediction.recommendedAction,
  };
}

export function getFleetAvgMaintenanceCost(vehicles: Vehicle[]) {
  if (vehicles.length === 0) return 300;
  const total = vehicles.reduce((sum, v) => sum + v.maintenanceCostUnit, 0);
  return total / vehicles.length;
}
