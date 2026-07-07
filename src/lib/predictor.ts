import { addDays, addMonths } from "date-fns";
import type { Vehicle } from "@/generated/prisma/client";
import type { VqiResult } from "./vqi";

export interface MaintenancePrediction {
  predictedNextMaintenance: Date | null;
  estimatedCost: number;
  recommendedAction: string;
}

export interface PredictorStrategy {
  predict(
    vehicle: Vehicle,
    vqi: VqiResult,
    fleetAvgMaintenanceCost: number
  ): MaintenancePrediction;
}

function estimateKmPerMonth(vehicle: Vehicle) {
  const ageMonths = Math.max(vehicle.vehicleAgeYears * 12, 1);
  return vehicle.odometerKm / ageMonths;
}

export class RuleBasedPredictor implements PredictorStrategy {
  predict(
    vehicle: Vehicle,
    vqi: VqiResult,
    fleetAvgMaintenanceCost: number
  ): MaintenancePrediction {
    const estimatedCost = Math.round(
      (vehicle.maintenanceCostUnit + fleetAvgMaintenanceCost) / 2
    );

    let predictedNextMaintenance: Date | null = vehicle.nextMaintenanceDate;

    if (!predictedNextMaintenance) {
      const kmPerMonth = estimateKmPerMonth(vehicle);
      const monthsUntilNext =
        kmPerMonth > 0 ? vehicle.maintenanceIntervalKm / kmPerMonth : 3;
      predictedNextMaintenance = addMonths(new Date(), Math.max(1, monthsUntilNext));
    }

    if (vehicle.odometerKm > 0) {
      const kmSinceLastService =
        vehicle.maintenanceIntervalKm > 0
          ? vehicle.odometerKm % vehicle.maintenanceIntervalKm
          : 0;
      const kmRemaining = Math.max(
        0,
        vehicle.maintenanceIntervalKm - kmSinceLastService
      );
      const kmPerMonth = estimateKmPerMonth(vehicle);
      if (kmRemaining > 0 && kmPerMonth > 0) {
        const daysByKm = Math.round((kmRemaining / kmPerMonth) * 30);
        const odometerBased = addDays(new Date(), daysByKm);
        if (
          !predictedNextMaintenance ||
          odometerBased < predictedNextMaintenance
        ) {
          predictedNextMaintenance = odometerBased;
        }
      }
    }

    let recommendedAction = "Continue routine monitoring";

    if (vqi.riskLevel === "high") {
      recommendedAction =
        "Schedule comprehensive inspection within 7 days — high wear indicators detected";
    } else if (vqi.riskLevel === "medium") {
      recommendedAction =
        "Plan preventive maintenance within 14 days to avoid escalation";
    } else if (vehicle.nextMaintenanceDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const next = new Date(vehicle.nextMaintenanceDate);
      next.setHours(0, 0, 0, 0);
      const daysUntil = Math.floor(
        (next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysUntil <= 30 && daysUntil >= 0) {
        recommendedAction = `Schedule standard service within ${daysUntil} days`;
      }
    }

    if (vehicle.engineType === "ev" && vqi.penalties.odometer > 20) {
      recommendedAction =
        "Inspect battery cooling system and brake regen components";
    }

    if (vehicle.engineType === "diesel" && vqi.penalties.cost > 12) {
      recommendedAction =
        "Review fuel system and emissions components — elevated maintenance cost trend";
    }

    return {
      predictedNextMaintenance,
      estimatedCost,
      recommendedAction,
    };
  }
}

export const defaultPredictor = new RuleBasedPredictor();
