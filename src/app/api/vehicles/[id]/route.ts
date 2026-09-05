import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { vehicleSchema } from "@/lib/schemas/vehicle";
import {
  enrichVehicle,
  getFleetAvgMaintenanceCost,
} from "@/lib/vehicle-service";
import { apiError } from "@/lib/i18n/api-errors";
import { getLocaleFromRequest } from "@/lib/i18n/get-locale";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const vehicle = await prisma.vehicle.findUnique({ where: { id } });
  if (!vehicle) {
    return apiError(getLocaleFromRequest(request), "vehicleNotFound", 404);
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
    console.error("[vehicles] update failed:", error);
    return apiError(getLocaleFromRequest(request), "validation", 400);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const { id } = await context.params;
  try {
    await prisma.vehicle.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return apiError(getLocaleFromRequest(request), "vehicleNotFound", 404);
  }
}
