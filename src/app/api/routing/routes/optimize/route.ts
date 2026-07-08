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
import { estimateEmissionsKg } from "@/lib/routing/emissions";
import {
  enrichVehicle,
  getFleetAvgMaintenanceCost,
} from "@/lib/vehicle-service";

export async function POST(request: Request) {
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
      return NextResponse.json(
        { error: "No warehouse found. Run db:seed first." },
        { status: 400 }
      );
    }

    const orders = await prisma.order.findMany({
      where: { id: { in: orderIds } },
    });

    if (orders.length !== orderIds.length) {
      return NextResponse.json(
        { error: "One or more orders were not found" },
        { status: 400 }
      );
    }

    // Only optimize not-yet-delivered orders.
    const activeOrders = orders.filter((o) => o.status !== "DELIVERED");
    if (activeOrders.length === 0) {
      return NextResponse.json(
        { error: "All selected orders are already delivered" },
        { status: 400 }
      );
    }

    for (const o of activeOrders) {
      if (!isWithinJakartaBounds(o.lat, o.lng)) {
        return NextResponse.json(
          {
            error: `Order address for "${o.recipientAddress}" is outside Jakarta bounds (demo validation).`,
          },
          { status: 400 }
        );
      }
    }

    const drivers = await prisma.driver.findMany({
      include: { vehicle: true },
    });
    const driversCar = drivers.filter((d) => d.vehicle.vehicleType === "car");
    const driversMotorcycle = drivers.filter(
      (d) => d.vehicle.vehicleType === "motorcycle"
    );

    if (driversCar.length === 0 && driversMotorcycle.length === 0) {
      return NextResponse.json(
        { error: "No eligible drivers found (need car or motorcycle vehicles)." },
        { status: 400 }
      );
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

    const eligibleCarRoutes = routeChunks.carChunks;
    const eligibleMotorcycleRoutes = routeChunks.motorcycleChunks;

    if (eligibleCarRoutes.length === 0 && eligibleMotorcycleRoutes.length === 0) {
      return NextResponse.json(
        { error: "No eligible routes could be formed for the selected orders." },
        { status: 400 }
      );
    }

    function pickBestDriver(vehicleType: "car" | "motorcycle") {
      const candidates =
        vehicleType === "car" ? enrichedDrivers.filter((d) => d.vehicle.vehicleType === "car") : enrichedDrivers.filter((d) => d.vehicle.vehicleType === "motorcycle");

      return candidates.sort((a, b) => b.vehicleEnriched.vqi - a.vehicleEnriched.vqi)[0];
    }

    const orderById = new Map(activeOrders.map((o) => [o.id, o]));

    const planPreviews: Array<{
      driverId: string;
      vehicle: {
        id: string;
        vehicleType: string;
        engineType: string;
        odometerKm: number;
        vqi: number;
        riskLevel: "low" | "medium" | "high";
      };
      totalDistanceKm: number;
      totalDurationMin: number;
      estimatedEmissionsKg: number;
      stops: Array<{
        sequence: number;
        orderId: string;
        recipientAddress: string;
        etaAt: string; // ISO
        distanceKm: number;
        durationMin: number;
      }>;
    }> = [];

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

    const buildPlansForChunks = (
      vehicleType: "car" | "motorcycle",
      chunks: typeof routeChunks.carChunks
    ) => {
      for (const chunk of chunks) {
        const driver = pickBestDriver(vehicleType);
        if (!driver) continue;

        const warehouseCoord = { lat: warehouse.lat, lng: warehouse.lng };

        const routableStops: RoutableStop[] = chunk.map((c) => ({
          orderId: c.orderId,
          lat: c.lat,
          lng: c.lng,
        }));

        const optimized = optimizeRoundTripByNearestNeighbor(
          warehouseCoord,
          routableStops,
          routeStartAt
        );

        const totalDistanceKm = optimized.totalDistanceKm;
        const totalDurationMin = optimized.totalDurationMin;
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
            etaAt: s.etaAt.toISOString(),
            distanceKm: s.distanceKm,
            durationMin: s.durationMin,
          };
        });

        planPreviews.push({
          driverId: driver.id,
          vehicle: {
            id: driver.vehicle.id,
            vehicleType: driver.vehicle.vehicleType,
            engineType: driver.vehicle.engineType,
            odometerKm: driver.vehicle.odometerKm,
            vqi: driver.vehicleEnriched.vqi,
            riskLevel: driver.vehicleEnriched.riskLevel,
          },
          totalDistanceKm,
          totalDurationMin,
          estimatedEmissionsKg,
          stops,
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

    buildPlansForChunks("car", eligibleCarRoutes);
    buildPlansForChunks("motorcycle", eligibleMotorcycleRoutes);

    if (dryRun) {
      return NextResponse.json({
        dryRun: true,
        generatedAt: new Date().toISOString(),
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
      createdPlans,
      plans: planPreviews,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to optimize route";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

