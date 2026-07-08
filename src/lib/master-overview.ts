import { prisma } from "@/lib/prisma";
import { getRoutingLogisticsOverview } from "@/lib/routing-overview";
import type { LogisticsCharts } from "@/lib/routing-reports";
import {
  enrichVehicle,
  getFleetAvgMaintenanceCost,
} from "@/lib/vehicle-service";
import type { VehicleWithAnalysis } from "@/lib/types";

export type FleetHealthSummary = {
  totalVehicles: number;
  avgVqi: number;
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
  totalMaintenanceCost: number;
  upcomingMaintenanceCount: number;
  upcomingMaintenanceCost: number;
  vqiDistribution: { range: string; count: number }[];
};

export type MasterOverview = {
  generatedAt: string;
  fleetHealth: FleetHealthSummary;
  pipeline: {
    RECEIVED: number;
    PREPARING: number;
    ON_ROUTE: number;
    DELIVERED: number;
  };
  routeCounts: {
    planned: number;
    inProgress: number;
    completed: number;
    total: number;
  };
  operations: {
    inProgressRoutes: number;
    totalDeliveryStops: number;
    deliveredStops: number;
    deliveryProgressPercent: number;
    totalDistanceKm: number;
    totalDurationMin: number;
    totalEmissionsKg: number;
    ordersOnRoute: number;
    avgDti: number | null;
    avgCfi: number | null;
    deliveredOrdersWithDti: number;
    totalFuelCostIdr: number;
    totalFuelCostSavingsIdr: number;
    totalFuelCostSavingsPercent: number;
  };
  fuelPrices: {
    fetchedAt: string;
    region: string;
    effectiveLabel: string | null;
    sourceUrl: string;
  } | null;
  totalOrders: number;
  driverCount: number;
  charts: LogisticsCharts;
  attentionRoutes: Array<{
    routePlanId: string;
    driverName: string;
    progressPercent: number;
    deliveredStops: number;
    totalStops: number;
    nextStopAddress: string | null;
    nextStopEta: string | null;
  }>;
  highRiskVehicles: Array<{
    id: string;
    name: string;
    vqi: number;
    riskLevel: "low" | "medium" | "high";
    predictedNextMaintenance: string | null;
    estimatedCost: number;
    recommendedAction: string;
  }>;
};

const MAINTENANCE_WINDOW_DAYS = 90;

function buildFleetHealth(enriched: VehicleWithAnalysis[]): FleetHealthSummary {
  const now = Date.now();
  const windowEnd = now + MAINTENANCE_WINDOW_DAYS * 24 * 60 * 60 * 1000;

  const upcoming = enriched.filter((v) => {
    if (!v.predictedNextMaintenance) return false;
    const t = new Date(v.predictedNextMaintenance).getTime();
    return !Number.isNaN(t) && t >= now && t <= windowEnd;
  });

  return {
    totalVehicles: enriched.length,
    avgVqi:
      enriched.length > 0
        ? Math.round(
            enriched.reduce((sum, v) => sum + v.vqi, 0) / enriched.length
          )
        : 0,
    highRiskCount: enriched.filter((v) => v.riskLevel === "high").length,
    mediumRiskCount: enriched.filter((v) => v.riskLevel === "medium").length,
    lowRiskCount: enriched.filter((v) => v.riskLevel === "low").length,
    totalMaintenanceCost: enriched.reduce(
      (sum, v) => sum + v.maintenanceCostUnit,
      0
    ),
    upcomingMaintenanceCount: upcoming.length,
    upcomingMaintenanceCost: upcoming.reduce((sum, v) => sum + v.estimatedCost, 0),
    vqiDistribution: [
      { range: "0-39", count: enriched.filter((v) => v.vqi < 40).length },
      {
        range: "40-70",
        count: enriched.filter((v) => v.vqi >= 40 && v.vqi <= 70).length,
      },
      { range: "71-100", count: enriched.filter((v) => v.vqi > 70).length },
    ],
  };
}

export async function getMasterOverview(): Promise<MasterOverview> {
  const [routing, vehicles] = await Promise.all([
    getRoutingLogisticsOverview(),
    prisma.vehicle.findMany({ orderBy: { name: "asc" } }),
  ]);

  const avgCost = getFleetAvgMaintenanceCost(vehicles);
  const enriched = vehicles.map((v) => enrichVehicle(v, avgCost));

  const fleetHealth = buildFleetHealth(enriched);

  const attentionRoutes = routing.activeRoutes
    .filter((r) => r.status === "IN_PROGRESS" || r.status === "PLANNED")
    .slice(0, 5)
    .map((r) => ({
      routePlanId: r.routePlanId,
      driverName: r.driver.name,
      progressPercent: r.totals.progressPercent,
      deliveredStops: r.totals.deliveredStops,
      totalStops: r.totals.totalStops,
      nextStopAddress: r.nextStop?.recipientAddress ?? null,
      nextStopEta: r.nextStop?.etaAt ?? null,
    }));

  const highRiskVehicles = enriched
    .filter((v) => v.riskLevel === "high" || v.riskLevel === "medium")
    .sort((a, b) => a.vqi - b.vqi)
    .slice(0, 5)
    .map((v) => ({
      id: v.id,
      name: v.name,
      vqi: v.vqi,
      riskLevel: v.riskLevel,
      predictedNextMaintenance: v.predictedNextMaintenance,
      estimatedCost: v.estimatedCost,
      recommendedAction: v.recommendedAction,
    }));

  return {
    generatedAt: new Date().toISOString(),
    fleetHealth,
    pipeline: routing.pipeline,
    routeCounts: routing.routeCounts,
    operations: routing.operations,
    totalOrders: Object.values(routing.pipeline).reduce((sum, n) => sum + n, 0),
    driverCount: routing.roster.length,
    fuelPrices: routing.fuelPrices
      ? {
          fetchedAt: routing.fuelPrices.fetchedAt,
          region: routing.fuelPrices.region,
          effectiveLabel: routing.fuelPrices.effectiveLabel,
          sourceUrl: routing.fuelPrices.sourceUrl,
        }
      : null,
    charts: routing.report.charts,
    attentionRoutes,
    highRiskVehicles,
  };
}
