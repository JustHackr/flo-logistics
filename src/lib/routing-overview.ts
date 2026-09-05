import { prisma } from "@/lib/prisma";
import {
  buildRouteWaypoints,
  deriveDepartureLegFromStops,
  deriveReturnLegFromTotals,
  type DeliveryStopInput,
  type RouteWaypoint,
} from "@/lib/routing/waypoints";
import { enrichVehicle, getFleetAvgMaintenanceCost } from "@/lib/vehicle-service";
import { aggregateDti, calculateDti } from "@/lib/routing/dti";
import { calculateCfi } from "@/lib/routing/cfi";
import { buildLogisticsReportBundle, type LogisticsReportBundle } from "@/lib/routing-reports";
import { ensureFuelPriceSnapshot, type FuelPriceSnapshotView } from "@/lib/fuel-price-service";
import { calculateTripFuelSavings } from "@/lib/routing/fuel-cost";
import { computeRoutePolyline } from "@/lib/routing/google-maps";
import type { EngineType, VehicleType } from "@/lib/types";

export type OrderPipeline = {
  RECEIVED: number;
  PREPARING: number;
  ON_ROUTE: number;
  DELIVERED: number;
};

export type DriverVehicleSummary = {
  id: string;
  name: string;
  engineType: string;
  vehicleType: string;
  odometerKm: number;
  vehicleAgeYears: number;
  maintenanceCostUnit: number;
  vqi: number;
  riskLevel: "low" | "medium" | "high";
  recommendedAction: string | null;
};

export type DriverRosterEntry = {
  id: string;
  name: string;
  phone: string | null;
  employeeId: string | null;
  licenseNumber: string | null;
  status: string;
  vehicle: DriverVehicleSummary;
};

export type ActiveRouteSummary = {
  routePlanId: string;
  status: string;
  warehouse: { id: string; name: string; address: string };
  driver: DriverRosterEntry;
  totals: {
    totalStops: number;
    deliveredStops: number;
    progressPercent: number;
    totalDistanceKm: number;
    totalDurationMin: number;
    estimatedEmissionsKg: number;
    avgDti: number | null;
    routeCfi: number;
    fuelCostIdr: number;
    baselineFuelCostIdr: number;
    fuelCostSavingsIdr: number;
    fuelCostSavingsPercent: number;
    fuelProductName: string;
    fuelLitersUsed: number;
  };
  nextStop: null | {
    orderId: string;
    recipientAddress: string;
    etaAt: string | null;
    orderStatus: string;
  };
  stops: Array<{
    sequence: number;
    orderId: string;
    recipientAddress: string;
    orderStatus: string;
    etaAt: string | null;
    receivedAt: string | null;
    deliveredAt: string | null;
    distanceKm: number;
    durationMin: number;
    dtiScore: number | null;
    slackMin: number | null;
    cfiScore: number;
  }>;
  waypoints: RouteWaypoint[];
  encodedPolyline?: string | null;
};

export type RoutingLogisticsOverview = {
  generatedAt: string;
  pipeline: OrderPipeline;
  roster: DriverRosterEntry[];
  activeRoutes: ActiveRouteSummary[];
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
  fuelPrices: FuelPriceSnapshotView | null;
  report: LogisticsReportBundle;
};

function buildDriverEntry(
  driver: {
    id: string;
    name: string;
    phone: string | null;
    employeeId: string | null;
    licenseNumber: string | null;
    status: string;
    vehicle: {
      id: string;
      name: string;
      engineType: string;
      vehicleType: string;
      odometerKm: number;
      vehicleAgeYears: number;
      maintenanceCostUnit: number;
    };
  },
  enriched: ReturnType<typeof enrichVehicle> | undefined
): DriverRosterEntry {
  return {
    id: driver.id,
    name: driver.name,
    phone: driver.phone,
    employeeId: driver.employeeId,
    licenseNumber: driver.licenseNumber,
    status: driver.status,
    vehicle: {
      id: driver.vehicle.id,
      name: driver.vehicle.name,
      engineType: driver.vehicle.engineType,
      vehicleType: driver.vehicle.vehicleType,
      odometerKm: driver.vehicle.odometerKm,
      vehicleAgeYears: driver.vehicle.vehicleAgeYears,
      maintenanceCostUnit: driver.vehicle.maintenanceCostUnit,
      vqi: enriched?.vqi ?? 0,
      riskLevel: enriched?.riskLevel ?? "medium",
      recommendedAction: enriched?.recommendedAction ?? null,
    },
  };
}

function buildWaypointsForRoute(
  warehouse: { name: string; address: string; lat: number; lng: number },
  routeStartAt: Date | null,
  totalDistanceKm: number,
  totalDurationMin: number,
  deliveryStops: DeliveryStopInput[]
): RouteWaypoint[] {
  const departureLeg = deriveDepartureLegFromStops(deliveryStops);
  const returnLeg = deriveReturnLegFromTotals(
    totalDistanceKm,
    totalDurationMin,
    deliveryStops
  );

  return buildRouteWaypoints(
    warehouse,
    routeStartAt,
    deliveryStops,
    departureLeg,
    returnLeg
  );
}

export async function getRoutingLogisticsOverview(): Promise<RoutingLogisticsOverview> {
  const generatedAt = new Date().toISOString();

  const [fleetVehicles, fuelPrices, routePlans, statusCounts, drivers] =
    await Promise.all([
      prisma.vehicle.findMany(),
      ensureFuelPriceSnapshot(),
      prisma.routePlan.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          driver: { include: { vehicle: true } },
          warehouse: true,
          stops: {
            orderBy: { sequence: "asc" },
            include: { order: true },
          },
        },
      }),
      prisma.order.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
      prisma.driver.findMany({
        include: { vehicle: true },
      }),
    ]);

  const fleetAvgMaintenanceCost = getFleetAvgMaintenanceCost(fleetVehicles);

  const pipeline: OrderPipeline = {
    RECEIVED: 0,
    PREPARING: 0,
    ON_ROUTE: 0,
    DELIVERED: 0,
  };
  for (const row of statusCounts) {
    pipeline[row.status] = row._count._all;
  }

  const vehiclesByDriverId = new Map<string, ReturnType<typeof enrichVehicle>>();

  for (const d of drivers) {
    vehiclesByDriverId.set(
      d.id,
      enrichVehicle(d.vehicle, fleetAvgMaintenanceCost)
    );
  }

  const activeRoutes: ActiveRouteSummary[] = await Promise.all(
    routePlans.map(async (rp) => {
    const stops = rp.stops;
    const totalStops = stops.length;
    const deliveredStops = stops.filter(
      (s) => s.order.status === "DELIVERED"
    ).length;
    const progressPercent =
      totalStops > 0 ? Math.round((deliveredStops / totalStops) * 100) : 0;

    const nextStop = stops.find((s) => s.order.status !== "DELIVERED") ?? null;

    const engineType = rp.driver.vehicle.engineType as EngineType;

    // DTI/CFI per stop are needed in three places below (deliveryStops,
    // avgDti, stop payloads) — compute them once per stop.
    const stopMetrics = stops.map((s) => ({
      dti: calculateDti({
        receivedAt: s.order.receivedAt,
        plannedEtaAt: s.etaAt,
        deliveredAt: s.order.deliveredAt,
      }),
      cfi: calculateCfi(engineType, s.distanceKm),
    }));

    const deliveryStops: DeliveryStopInput[] = stops.map((s, i) => {
      const { dti, cfi } = stopMetrics[i];

      return {
        orderId: s.orderId,
        recipientAddress: s.order.recipientAddress,
        lat: s.order.lat,
        lng: s.order.lng,
        etaAt: s.etaAt?.toISOString() ?? null,
        distanceKm: s.distanceKm,
        durationMin: s.durationMin,
        orderStatus: s.order.status,
        dtiScore: dti.status === "computed" ? dti.score : undefined,
        dtiRisk: dti.status === "computed" ? dti.riskLevel : undefined,
        dtiPending: dti.status === "pending",
        cfiScore: cfi.score,
      };
    });

    const warehouseInfo = {
      name: rp.warehouse.name,
      address: rp.warehouse.address ?? rp.warehouse.name,
      lat: rp.warehouse.lat,
      lng: rp.warehouse.lng,
    };

    const waypoints = buildWaypointsForRoute(
      warehouseInfo,
      rp.routeStartAt,
      rp.totalDistanceKm,
      rp.totalDurationMin,
      deliveryStops
    );

    const nextStopPayload = nextStop
      ? {
          orderId: nextStop.orderId,
          recipientAddress: nextStop.order.recipientAddress,
          etaAt: nextStop.etaAt?.toISOString() ?? null,
          orderStatus: nextStop.order.status,
        }
      : null;

    const routeCfi = calculateCfi(engineType, rp.totalDistanceKm).score;

    const dtiScores = stops
      .map((s, i) => ({ s, dti: stopMetrics[i].dti }))
      .filter(
        ({ s, dti }) =>
          s.order.status === "DELIVERED" && dti.status === "computed"
      )
      .map(({ dti }) => dti.score);

    const vehicleType = rp.driver.vehicle.vehicleType as VehicleType;
    const fuelSavings = calculateTripFuelSavings({
      optimizedDistanceKm: rp.totalDistanceKm,
      warehouse: { lat: rp.warehouse.lat, lng: rp.warehouse.lng },
      stopCoordinates: stops.map((s) => ({
        lat: s.order.lat,
        lng: s.order.lng,
      })),
      vehicleType,
      engineType,
      fuelPrices: fuelPrices.items,
      emissionsKg: rp.estimatedEmissionsKg,
    });

    const encodedPolyline = await computeRoutePolyline(
      waypoints.map((wp) => ({ lat: wp.lat, lng: wp.lng })),
      rp.routeStartAt ?? new Date()
    );

    return {
      routePlanId: rp.id,
      status: rp.status,
      warehouse: {
        id: rp.warehouse.id,
        name: rp.warehouse.name,
        address: rp.warehouse.address ?? rp.warehouse.name,
      },
      driver: buildDriverEntry(rp.driver, vehiclesByDriverId.get(rp.driverId)),
      totals: {
        totalStops,
        deliveredStops,
        progressPercent,
        totalDistanceKm: rp.totalDistanceKm,
        totalDurationMin: rp.totalDurationMin,
        estimatedEmissionsKg: rp.estimatedEmissionsKg,
        avgDti: aggregateDti(dtiScores),
        routeCfi,
        fuelCostIdr: fuelSavings.optimized.fuelCostIdr,
        baselineFuelCostIdr: fuelSavings.baseline.fuelCostIdr,
        fuelCostSavingsIdr: fuelSavings.fuelCostSavingsIdr,
        fuelCostSavingsPercent: fuelSavings.fuelCostSavingsPercent,
        fuelProductName: fuelSavings.optimized.productName,
        fuelLitersUsed: fuelSavings.optimized.litersUsed,
      },
      nextStop: nextStopPayload,
      stops: stops.map((s, i) => {
        const { dti, cfi: stopCfi } = stopMetrics[i];

        return {
          sequence: s.sequence,
          orderId: s.orderId,
          recipientAddress: s.order.recipientAddress,
          orderStatus: s.order.status,
          etaAt: s.etaAt?.toISOString() ?? null,
          receivedAt: s.order.receivedAt?.toISOString() ?? null,
          deliveredAt: s.order.deliveredAt?.toISOString() ?? null,
          distanceKm: s.distanceKm,
          durationMin: s.durationMin,
          dtiScore: dti.status === "computed" ? dti.score : null,
          slackMin: dti.status === "computed" ? dti.slackMin : null,
          cfiScore: stopCfi.score,
        };
      }),
      waypoints,
      encodedPolyline,
    };
    })
  );

  const roster = drivers.map((d) =>
    buildDriverEntry(d, vehiclesByDriverId.get(d.id))
  );

  const inProgressRoutes = activeRoutes.filter((r) => r.status === "IN_PROGRESS");
  const routeCounts = {
    planned: activeRoutes.filter((r) => r.status === "PLANNED").length,
    inProgress: inProgressRoutes.length,
    completed: activeRoutes.filter((r) => r.status === "COMPLETED").length,
    total: activeRoutes.length,
  };

  const operations = {
    inProgressRoutes: inProgressRoutes.length,
    totalDeliveryStops: activeRoutes.reduce((sum, r) => sum + r.totals.totalStops, 0),
    deliveredStops: activeRoutes.reduce((sum, r) => sum + r.totals.deliveredStops, 0),
    deliveryProgressPercent:
      activeRoutes.reduce((sum, r) => sum + r.totals.totalStops, 0) > 0
        ? Math.round(
            (activeRoutes.reduce((sum, r) => sum + r.totals.deliveredStops, 0) /
              activeRoutes.reduce((sum, r) => sum + r.totals.totalStops, 0)) *
              100
          )
        : 0,
    totalDistanceKm: Math.round(
      inProgressRoutes.reduce((sum, r) => sum + r.totals.totalDistanceKm, 0) * 10
    ) / 10,
    totalDurationMin: Math.round(
      inProgressRoutes.reduce((sum, r) => sum + r.totals.totalDurationMin, 0)
    ),
    totalEmissionsKg: Math.round(
      inProgressRoutes.reduce((sum, r) => sum + r.totals.estimatedEmissionsKg, 0) * 10
    ) / 10,
    ordersOnRoute: pipeline.ON_ROUTE,
  };

  const deliveredMetrics = await prisma.order.findMany({
    where: { status: "DELIVERED", deliveredAt: { not: null } },
    include: { routeStop: true },
  });

  const fleetDtiScores = deliveredMetrics
    .map((o) =>
      calculateDti({
        receivedAt: o.receivedAt,
        plannedEtaAt: o.routeStop?.etaAt,
        deliveredAt: o.deliveredAt,
      })
    )
    .filter((d) => d.status === "computed")
    .map((d) => d.score);

  const completedRoutes = await prisma.routePlan.findMany({
    where: { status: "COMPLETED" },
    include: { driver: { include: { vehicle: true } } },
  });

  const fleetCfiScores = [
    ...activeRoutes.map((r) => r.totals.routeCfi),
    ...completedRoutes.map((rp) =>
      calculateCfi(rp.driver.vehicle.engineType as EngineType, rp.totalDistanceKm).score
    ),
  ];

  const operationsWithMetrics = {
    ...operations,
    avgDti: aggregateDti(fleetDtiScores),
    avgCfi: aggregateDti(fleetCfiScores),
    deliveredOrdersWithDti: fleetDtiScores.length,
    totalFuelCostIdr: inProgressRoutes.reduce(
      (sum, r) => sum + r.totals.fuelCostIdr,
      0
    ),
    totalFuelCostSavingsIdr: inProgressRoutes.reduce(
      (sum, r) => sum + r.totals.fuelCostSavingsIdr,
      0
    ),
    totalFuelCostSavingsPercent:
      inProgressRoutes.reduce((sum, r) => sum + r.totals.baselineFuelCostIdr, 0) > 0
        ? Math.round(
            (inProgressRoutes.reduce(
              (sum, r) => sum + r.totals.fuelCostSavingsIdr,
              0
            ) /
              inProgressRoutes.reduce(
                (sum, r) => sum + r.totals.baselineFuelCostIdr,
                0
              )) *
              100
          )
        : 0,
  };

  const report = buildLogisticsReportBundle({
    pipeline,
    routeCounts,
    activeRoutes,
    roster,
  });

  return {
    generatedAt,
    pipeline,
    roster,
    activeRoutes,
    routeCounts,
    operations: operationsWithMetrics,
    fuelPrices,
    report,
  };
}
