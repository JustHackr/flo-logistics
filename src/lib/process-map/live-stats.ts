import "server-only";
import { getMasterOverview } from "@/lib/master-overview";
import { prisma } from "@/lib/prisma";
import type { LiveStats } from "./graph";

function formatTimeAgo(date: Date | string): string {
  const ms = Date.now() - new Date(date).getTime();
  const minutes = Math.round(ms / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 36) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

/**
 * Aggregate a short, human-readable snapshot of the seeded demo database.
 * Each key maps to a node in graph.ts via `liveStatKey`.
 */
export async function getProcessMapStats(): Promise<LiveStats> {
  const overview = await getMasterOverview();
  const connectorCount = await prisma.dataConnector.count();

  const pipeline = overview.pipeline;
  const routes = overview.routeCounts;

  return {
    ordersByStatus: `${pipeline.RECEIVED} RECEIVED · ${pipeline.PREPARING} PREPARING · ${pipeline.ON_ROUTE} ON_ROUTE · ${pipeline.DELIVERED} DELIVERED`,
    fleetHealth: `${overview.fleetHealth.totalVehicles} vehicles · ${overview.fleetHealth.highRiskCount} high risk · ${overview.fleetHealth.mediumRiskCount} medium`,
    routes: `${routes.inProgress} IN_PROGRESS · ${routes.planned} PLANNED · ${routes.completed} COMPLETED`,
    fuelAge: overview.fuelPrices
      ? formatTimeAgo(overview.fuelPrices.fetchedAt)
      : "no snapshot",
    driverCount: `${overview.driverCount}`,
    connectors: `${connectorCount}`,
  };
}
