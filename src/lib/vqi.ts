import type { Vehicle } from "@/generated/prisma/client";
import type { EngineType } from "./types";

const ENGINE_ODOMETER_MODIFIERS: Record<EngineType, number> = {
  ev: 0.85,
  gasoline: 1,
  diesel: 1.05,
};

const ENGINE_COST_MODIFIERS: Record<EngineType, number> = {
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
  if (score < 40) return "high";
  if (score <= 70) return "medium";
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
    (vehicle.vehicleAgeYears / vehicle.vehicleLifetimeYears) * 30,
    30
  );

  const odometerModifier =
    ENGINE_ODOMETER_MODIFIERS[vehicle.engineType as EngineType] ?? 1;
  const odometerPenalty = cap(
    (vehicle.odometerKm / vehicle.expectedLifetimeKm) * 30 * odometerModifier,
    30
  );

  const costModifier =
    ENGINE_COST_MODIFIERS[vehicle.engineType as EngineType] ?? 1;
  const normalizedCost =
    fleetAvgMaintenanceCost > 0
      ? (vehicle.maintenanceCostUnit * costModifier) / fleetAvgMaintenanceCost
      : 1;
  const costPenalty = cap(normalizedCost * 20, 20);

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
    planningPenalty = cap(daysOverdue * 0.5, 20);
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
