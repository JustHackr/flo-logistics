import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { enrichVehicle, getFleetAvgMaintenanceCost } from "@/lib/vehicle-service";

export async function GET() {
  const generatedAt = new Date().toISOString();

  const fleetVehicles = await prisma.vehicle.findMany();
  const fleetAvgMaintenanceCost = getFleetAvgMaintenanceCost(fleetVehicles);

  const routePlans = await prisma.routePlan.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      driver: { include: { vehicle: true } },
      warehouse: true,
      stops: {
        orderBy: { sequence: "asc" },
        include: { order: true },
      },
    },
  });

  const pipelineCounts = await prisma.order.findMany({
    select: { status: true },
  });

  const pipeline = {
    RECEIVED: pipelineCounts.filter((o) => o.status === "RECEIVED").length,
    PREPARING: pipelineCounts.filter((o) => o.status === "PREPARING").length,
    ON_ROUTE: pipelineCounts.filter((o) => o.status === "ON_ROUTE").length,
    ETA: pipelineCounts.filter((o) => o.status === "ETA").length,
    DELIVERED: pipelineCounts.filter((o) => o.status === "DELIVERED").length,
  };

  const vehiclesByDriverId = new Map<string, any>();
  const drivers = await prisma.driver.findMany({
    include: { vehicle: true },
  });

  for (const d of drivers) {
    vehiclesByDriverId.set(d.id, enrichVehicle(d.vehicle, fleetAvgMaintenanceCost));
  }

  const activeRoutes = routePlans.map((rp) => {
    const stops = rp.stops;
    const totalStops = stops.length;
    const deliveredStops = stops.filter(
      (s) => s.order.status === "DELIVERED"
    ).length;
    const progressPercent =
      totalStops > 0 ? Math.round((deliveredStops / totalStops) * 100) : 0;

    const nextStop = stops.find((s) => s.order.status !== "DELIVERED") ?? null;

    const driverEnriched = vehiclesByDriverId.get(rp.driverId);
    const nextStopPayload = nextStop
      ? {
          orderId: nextStop.orderId,
          recipientAddress: nextStop.order.recipientAddress,
          etaAt: nextStop.etaAt?.toISOString() ?? null,
          orderStatus: nextStop.order.status,
        }
      : null;

    return {
      routePlanId: rp.id,
      status: rp.status,
      warehouse: { id: rp.warehouse.id, name: rp.warehouse.name },
      driver: {
        id: rp.driver.id,
        name: rp.driver.name,
        vehicle: {
          id: rp.driver.vehicle.id,
          engineType: rp.driver.vehicle.engineType,
          vehicleType: rp.driver.vehicle.vehicleType,
          odometerKm: rp.driver.vehicle.odometerKm,
          vqi: driverEnriched?.vqi ?? 0,
          riskLevel: driverEnriched?.riskLevel ?? "medium",
        },
      },
      totals: {
        totalStops,
        deliveredStops,
        progressPercent,
        totalDistanceKm: rp.totalDistanceKm,
        totalDurationMin: rp.totalDurationMin,
        estimatedEmissionsKg: rp.estimatedEmissionsKg,
      },
      nextStop: nextStopPayload,
      stops: stops.map((s) => ({
        sequence: s.sequence,
        orderId: s.orderId,
        recipientAddress: s.order.recipientAddress,
        orderStatus: s.order.status,
        etaAt: s.etaAt?.toISOString() ?? null,
        distanceKm: s.distanceKm,
        durationMin: s.durationMin,
      })),
    };
  });

  return NextResponse.json({
    generatedAt,
    pipeline,
    activeRoutes,
  });
}

