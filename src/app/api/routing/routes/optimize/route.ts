import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { optimizeRouteRequestSchema } from "@/lib/schemas/route";
import { isWithinJakartaBounds } from "@/lib/routing/jakarta";
import {
  assignOrdersToVehicleChunks,
  DEFAULT_MAX_STOPS_PER_ROUTE,
} from "@/lib/routing/assignment";
import {
  optimizeRoundTripByNearestNeighbor,
  type RoutableStop,
} from "@/lib/routing/optimizer";
import {
  buildRouteWaypoints,
  waypointsToRoutePath,
  type RouteWaypoint,
} from "@/lib/routing/waypoints";
import { computeRoutePolyline } from "@/lib/routing/google-maps";
import { estimateEmissionsKg } from "@/lib/routing/emissions";
import {
  describeTrafficSource,
  type TrafficSource,
} from "@/lib/routing/estimator";
import {
  rankDriversByVqi,
  pickBestDriverFromRanking,
  type DriverMatchingResult,
} from "@/lib/routing/driver-matching";
import { ensureFuelPriceSnapshot } from "@/lib/fuel-price-service";
import { calculateTripFuelSavings } from "@/lib/routing/fuel-cost";
import {
  enrichVehicle,
  getFleetAvgMaintenanceCost,
} from "@/lib/vehicle-service";
import type { EngineType, VehicleType } from "@/lib/types";
import {
  checkRateLimit,
  getClientKey,
  rateLimitExceededBody,
} from "@/lib/rate-limit";
import { apiError } from "@/lib/i18n/api-errors";
import { getLocaleFromRequest } from "@/lib/i18n/get-locale";

export async function POST(request: Request) {
  const locale = getLocaleFromRequest(request);
  const limit = checkRateLimit({
    key: `optimize:${getClientKey(request)}`,
    limit: 8,
    windowMs: 60_000,
  });
  if (!limit.ok) {
    const { body, init } = rateLimitExceededBody(limit.retryAfterSec);
    return NextResponse.json(body, init);
  }

  try {
    const body = await request.json();
    const parsed = optimizeRouteRequestSchema.parse(body);

    const orderIds = parsed.orderIds;
    const dryRun = parsed.dryRun ?? true;
    const maxStopsPerRoute =
      parsed.maxStopsPerRoute ?? DEFAULT_MAX_STOPS_PER_ROUTE;
    const routeStartAt = parsed.routeStartAt ?? new Date();

    const warehouse = await prisma.warehouse.findFirst();
    if (!warehouse) {
      return apiError(locale, "validation", 400);
    }

    const fuelPrices = await ensureFuelPriceSnapshot();

    const orders = await prisma.order.findMany({
      where: { id: { in: orderIds } },
    });

    if (orders.length !== orderIds.length) {
      return apiError(locale, "orderNotFound", 400);
    }

    // Only optimize not-yet-delivered orders.
    const activeOrders = orders.filter((o) => o.status !== "DELIVERED");
    if (activeOrders.length === 0) {
      return apiError(locale, "validation", 400);
    }

    for (const o of activeOrders) {
      if (!isWithinJakartaBounds(o.lat, o.lng)) {
        return apiError(locale, "validation", 400);
      }
    }

    const drivers = await prisma.driver.findMany({
      include: { vehicle: true },
    });
    const driversVan = drivers.filter((d) => d.vehicle.vehicleType === "van");
    const driversMotorcycle = drivers.filter(
      (d) => d.vehicle.vehicleType === "motorcycle"
    );

    if (driversVan.length === 0 && driversMotorcycle.length === 0) {
      return apiError(locale, "driverNotFound", 400);
    }

    // Fleet-wide average maintenance cost for the existing VQI model.
    const fleetVehicles = await prisma.vehicle.findMany();
    const fleetAvgMaintenanceCost = getFleetAvgMaintenanceCost(fleetVehicles);

    const enrichedDrivers = drivers.map((d) => ({
      ...d,
      vehicleEnriched: enrichVehicle(d.vehicle, fleetAvgMaintenanceCost),
    }));

    const routeChunks = assignOrdersToVehicleChunks(
      activeOrders.map((o) => ({
        orderId: o.id,
        lat: o.lat,
        lng: o.lng,
        accessRequirement: o.accessRequirement,
      })),
      maxStopsPerRoute
    );

    const eligibleVanRoutes = routeChunks.vanChunks;
    const eligibleMotorcycleRoutes = routeChunks.motorcycleChunks;

    if (eligibleVanRoutes.length === 0 && eligibleMotorcycleRoutes.length === 0) {
      return apiError(locale, "optimizeFailed", 400);
    }

    const vanMatching = rankDriversByVqi(enrichedDrivers, "van");
    const motorcycleMatching = rankDriversByVqi(enrichedDrivers, "motorcycle");

    const dispatchMatching: {
      van: DriverMatchingResult | null;
      motorcycle: DriverMatchingResult | null;
    } = {
      van: vanMatching,
      motorcycle: motorcycleMatching,
    };

    const orderById = new Map(activeOrders.map((o) => [o.id, o]));

    const planPreviews: Array<{
      driver: {
        id: string;
        name: string;
        phone: string | null;
        employeeId: string | null;
        licenseNumber: string | null;
        status: string;
      };
      vehicle: {
        id: string;
        name: string;
        vehicleType: string;
        engineType: string;
        odometerKm: number;
        vehicleAgeYears: number;
        maintenanceCostUnit: number;
        vqi: number;
        riskLevel: "low" | "medium" | "high";
        recommendedAction: string | null;
      };
      totalDistanceKm: number;
      totalDurationMin: number;
      estimatedEmissionsKg: number;
      trafficSource: TrafficSource;
      fuelCostIdr: number;
      baselineFuelCostIdr: number;
      fuelCostSavingsIdr: number;
      fuelCostSavingsPercent: number;
      fuelProductName: string;
      stops: Array<{
        sequence: number;
        orderId: string;
        recipientAddress: string;
        lat: number;
        lng: number;
        etaAt: string;
        distanceKm: number;
        durationMin: number;
        serviceTimeMin?: number;
      }>;
      waypoints: RouteWaypoint[];
      encodedPolyline: string | null;
      matching: {
        vehicleType: "van" | "motorcycle";
        selectedRank: number;
        totalCandidates: number;
        selectionReason: string;
      };
    }> = [];

    let routeTrafficSource: TrafficSource = "estimated";

    const persistResults: Array<{
      driverId: string;
      totalDistanceKm: number;
      totalDurationMin: number;
      estimatedEmissionsKg: number;
      stops: Array<{
        sequence: number;
        orderId: string;
        etaAt: Date;
        distanceKm: number;
        durationMin: number;
      }>;
      vehicleId: string;
    }> = [];

    const buildPlansForChunks = async (
      vehicleType: "van" | "motorcycle",
      chunks: typeof routeChunks.vanChunks
    ) => {
      for (const chunk of chunks) {
        const matching =
          vehicleType === "van" ? vanMatching : motorcycleMatching;
        const driver = pickBestDriverFromRanking(matching, enrichedDrivers);
        if (!driver || !matching) continue;

        const warehouseCoord = { lat: warehouse.lat, lng: warehouse.lng };

        const routableStops: RoutableStop[] = chunk.map((c) => ({
          orderId: c.orderId,
          lat: c.lat,
          lng: c.lng,
        }));

        const optimized = await optimizeRoundTripByNearestNeighbor(
          warehouseCoord,
          routableStops,
          routeStartAt
        );

        const totalDistanceKm = optimized.totalDistanceKm;
        const totalDurationMin = optimized.totalDurationMin;
        routeTrafficSource = optimized.trafficSource;
        const estimatedEmissionsKg = estimateEmissionsKg(
          driver.vehicle.engineType as any,
          totalDistanceKm
        );

        const stops = optimized.orderedStops.map((s) => {
          const order = orderById.get(s.orderId);
          return {
            sequence: s.sequence,
            orderId: s.orderId,
            recipientAddress: order?.recipientAddress ?? "Unknown address",
            lat: order?.lat ?? 0,
            lng: order?.lng ?? 0,
            etaAt: s.etaAt.toISOString(),
            distanceKm: s.distanceKm,
            durationMin: s.durationMin,
            serviceTimeMin: s.serviceTimeMin,
          };
        });

        const waypoints = buildRouteWaypoints(
          {
            name: warehouse.name,
            address: warehouse.address ?? warehouse.name,
            lat: warehouse.lat,
            lng: warehouse.lng,
          },
          routeStartAt,
          stops,
          {
            distanceKm: optimized.departureLegDistanceKm,
            durationMin: optimized.departureLegDurationMin,
          },
          {
            distanceKm: optimized.returnLegDistanceKm,
            durationMin: optimized.returnLegDurationMin,
          }
        );

        const routePath = waypointsToRoutePath(waypoints);
        const encodedPolyline = await computeRoutePolyline(
          routePath,
          routeStartAt,
          locale
        );

        const fuelSavings = calculateTripFuelSavings({
          optimizedDistanceKm: totalDistanceKm,
          warehouse: { lat: warehouse.lat, lng: warehouse.lng },
          stopCoordinates: stops.map((s) => ({ lat: s.lat, lng: s.lng })),
          vehicleType: driver.vehicle.vehicleType as VehicleType,
          engineType: driver.vehicle.engineType as EngineType,
          fuelPrices: fuelPrices.items,
          emissionsKg: estimatedEmissionsKg,
        });

        planPreviews.push({
          driver: {
            id: driver.id,
            name: driver.name,
            phone: driver.phone,
            employeeId: driver.employeeId,
            licenseNumber: driver.licenseNumber,
            status: driver.status,
          },
          vehicle: {
            id: driver.vehicle.id,
            name: driver.vehicle.name,
            vehicleType: driver.vehicle.vehicleType,
            engineType: driver.vehicle.engineType,
            odometerKm: driver.vehicle.odometerKm,
            vehicleAgeYears: driver.vehicle.vehicleAgeYears,
            maintenanceCostUnit: driver.vehicle.maintenanceCostUnit,
            vqi: driver.vehicleEnriched.vqi,
            riskLevel: driver.vehicleEnriched.riskLevel,
            recommendedAction: driver.vehicleEnriched.recommendedAction,
          },
          totalDistanceKm,
          totalDurationMin,
          estimatedEmissionsKg,
          trafficSource: optimized.trafficSource,
          fuelCostIdr: fuelSavings.optimized.fuelCostIdr,
          baselineFuelCostIdr: fuelSavings.baseline.fuelCostIdr,
          fuelCostSavingsIdr: fuelSavings.fuelCostSavingsIdr,
          fuelCostSavingsPercent: fuelSavings.fuelCostSavingsPercent,
          fuelProductName: fuelSavings.optimized.productName,
          stops,
          waypoints,
          encodedPolyline,
          matching: {
            vehicleType,
            selectedRank: 1,
            totalCandidates: matching.candidates.length,
            selectionReason: matching.selectionReason,
          },
        });

        persistResults.push({
          driverId: driver.id,
          totalDistanceKm,
          totalDurationMin,
          estimatedEmissionsKg,
          vehicleId: driver.vehicle.id,
          stops: optimized.orderedStops.map((s) => ({
            sequence: s.sequence,
            orderId: s.orderId,
            etaAt: s.etaAt,
            distanceKm: s.distanceKm,
            durationMin: s.durationMin,
          })),
        });
      }
    };

    await buildPlansForChunks("van", eligibleVanRoutes);
    await buildPlansForChunks("motorcycle", eligibleMotorcycleRoutes);

    if (dryRun) {
      return NextResponse.json({
        dryRun: true,
        generatedAt: new Date().toISOString(),
        routeStartAt: routeStartAt.toISOString(),
        trafficSource: routeTrafficSource,
        trafficSourceLabel: describeTrafficSource(routeTrafficSource),
        fuelPrices: {
          fetchedAt: fuelPrices.fetchedAt,
          region: fuelPrices.region,
          effectiveLabel: fuelPrices.effectiveLabel,
        },
        dispatchMatching,
        plans: planPreviews,
      });
    }

    // Persist: multiple route plans may be created when splitting chunks.
    const createdPlans = await prisma.$transaction(async (tx) => {
      const results: any[] = [];

      for (const plan of persistResults) {
        const routePlan = await tx.routePlan.create({
          data: {
            status: "PLANNED",
            routeStartAt,
            warehouseId: warehouse.id,
            driverId: plan.driverId,
            totalDistanceKm: plan.totalDistanceKm,
            totalDurationMin: plan.totalDurationMin,
            estimatedEmissionsKg: plan.estimatedEmissionsKg,
          },
        });

        for (const s of plan.stops) {
          await tx.routeStop.create({
            data: {
              routePlanId: routePlan.id,
              orderId: s.orderId,
              sequence: s.sequence,
              etaAt: s.etaAt,
              distanceKm: s.distanceKm,
              durationMin: s.durationMin,
            },
          });

          await tx.order.update({
            where: { id: s.orderId },
            data: { routePlanId: routePlan.id },
          });
        }

        results.push({
          routePlanId: routePlan.id,
          driverId: plan.driverId,
          totalDistanceKm: plan.totalDistanceKm,
          totalDurationMin: plan.totalDurationMin,
          estimatedEmissionsKg: plan.estimatedEmissionsKg,
        });
      }

      return results;
    });

    return NextResponse.json({
      dryRun: false,
      generatedAt: new Date().toISOString(),
      routeStartAt: routeStartAt.toISOString(),
      trafficSource: routeTrafficSource,
      trafficSourceLabel: describeTrafficSource(routeTrafficSource),
      dispatchMatching,
      createdPlans,
      plans: planPreviews,
    });
  } catch (error) {
    console.error(
      "[optimize] failed:",
      error instanceof Error ? error.message : "unknown error"
    );
    return apiError(locale, "optimizeFailed", 400);
  }
}

