import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { vehicleSchema } from "@/lib/schemas/vehicle";
import {
  enrichVehicle,
  getFleetAvgMaintenanceCost,
} from "@/lib/vehicle-service";

export async function GET() {
  const vehicles = await prisma.vehicle.findMany({ orderBy: { name: "asc" } });
  const avgCost = getFleetAvgMaintenanceCost(vehicles);
  return NextResponse.json(vehicles.map((v) => enrichVehicle(v, avgCost)));
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = vehicleSchema.parse(body);

    const vehicle = await prisma.vehicle.create({
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
    return NextResponse.json(enrichVehicle(vehicle, avgCost), { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create vehicle";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
