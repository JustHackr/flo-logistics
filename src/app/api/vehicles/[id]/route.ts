import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { vehicleSchema } from "@/lib/schemas/vehicle";
import {
  enrichVehicle,
  getFleetAvgMaintenanceCost,
} from "@/lib/vehicle-service";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const vehicle = await prisma.vehicle.findUnique({ where: { id } });
  if (!vehicle) {
    return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
  }
  const vehicles = await prisma.vehicle.findMany();
  const avgCost = getFleetAvgMaintenanceCost(vehicles);
  return NextResponse.json(enrichVehicle(vehicle, avgCost));
}

export async function PUT(request: Request, context: RouteContext) {
  const { id } = await context.params;
  try {
    const body = await request.json();
    const parsed = vehicleSchema.parse(body);

    const vehicle = await prisma.vehicle.update({
      where: { id },
      data: {
        ...parsed,
        lastMaintenanceDate: parsed.lastMaintenanceDate ?? null,
        nextMaintenanceDate: parsed.nextMaintenanceDate ?? null,
        notes: parsed.notes ?? null,
        connectorId: parsed.connectorId ?? null,
      },
    });

    const vehicles = await prisma.vehicle.findMany();
    const avgCost = getFleetAvgMaintenanceCost(vehicles);
    return NextResponse.json(enrichVehicle(vehicle, avgCost));
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update vehicle";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  try {
    await prisma.vehicle.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
  }
}
