import type { Vehicle } from "@/generated/prisma/client";
import type { EngineType } from "./types";

export const VQI_WEIGHTS = {
  age: 30,
  odometer: 30,
  cost: 20,
  planning: 20,
} as const;

export const PLANNING_PENALTY_PER_DAY = 0.5;

export const RISK_THRESHOLDS = {
  highBelow: 40,
  lowAbove: 70,
} as const;

export const ENGINE_ODOMETER_MODIFIERS: Record<EngineType, number> = {
  ev: 0.85,
  gasoline: 1,
  diesel: 1.05,
};

export const ENGINE_COST_MODIFIERS: Record<EngineType, number> = {
  ev: 0.9,
  gasoline: 1,
  diesel: 1.1,
};

export type RiskLevel = "low" | "medium" | "high";

export interface VqiResult {
  score: number;
  riskLevel: RiskLevel;
  penalties: {
    age: number;
    odometer: number;
    cost: number;
    planning: number;
    total: number;
  };
}

function cap(value: number, max: number) {
  return Math.min(value, max);
}

function getRiskLevel(score: number): RiskLevel {
  if (score < RISK_THRESHOLDS.highBelow) return "high";
  if (score <= RISK_THRESHOLDS.lowAbove) return "medium";
  return "low";
}

export function calculateVqi(
  vehicle: Pick<
    Vehicle,
    | "vehicleAgeYears"
    | "vehicleLifetimeYears"
    | "odometerKm"
    | "expectedLifetimeKm"
    | "maintenanceCostUnit"
    | "nextMaintenanceDate"
    | "engineType"
  >,
  fleetAvgMaintenanceCost = 300
): VqiResult {
  const agePenalty = cap(
    (vehicle.vehicleAgeYears / vehicle.vehicleLifetimeYears) * VQI_WEIGHTS.age,
    VQI_WEIGHTS.age
  );

  const odometerModifier =
    ENGINE_ODOMETER_MODIFIERS[vehicle.engineType as EngineType] ?? 1;
  const odometerPenalty = cap(
    (vehicle.odometerKm / vehicle.expectedLifetimeKm) *
      VQI_WEIGHTS.odometer *
      odometerModifier,
    VQI_WEIGHTS.odometer
  );

  const costModifier =
    ENGINE_COST_MODIFIERS[vehicle.engineType as EngineType] ?? 1;
  const normalizedCost =
    fleetAvgMaintenanceCost > 0
      ? (vehicle.maintenanceCostUnit * costModifier) / fleetAvgMaintenanceCost
      : 1;
  const costPenalty = cap(normalizedCost * VQI_WEIGHTS.cost, VQI_WEIGHTS.cost);

  let planningPenalty = 0;
  if (vehicle.nextMaintenanceDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextDate = new Date(vehicle.nextMaintenanceDate);
    nextDate.setHours(0, 0, 0, 0);
    const daysOverdue = Math.max(
      0,
      Math.floor((today.getTime() - nextDate.getTime()) / (1000 * 60 * 60 * 24))
    );
    planningPenalty = cap(
      daysOverdue * PLANNING_PENALTY_PER_DAY,
      VQI_WEIGHTS.planning
    );
  }

  const total = agePenalty + odometerPenalty + costPenalty + planningPenalty;
  const score = Math.max(0, Math.round(100 - total));

  return {
    score,
    riskLevel: getRiskLevel(score),
    penalties: {
      age: Math.round(agePenalty * 10) / 10,
      odometer: Math.round(odometerPenalty * 10) / 10,
      cost: Math.round(costPenalty * 10) / 10,
      planning: Math.round(planningPenalty * 10) / 10,
      total: Math.round(total * 10) / 10,
    },
  };
}

export function getRiskBadgeVariant(risk: RiskLevel) {
  switch (risk) {
    case "high":
      return "destructive" as const;
    case "medium":
      return "secondary" as const;
    default:
      return "default" as const;
  }
}
