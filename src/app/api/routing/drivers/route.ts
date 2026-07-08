import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { driverSchema } from "@/lib/schemas/driver";

export async function GET() {
  const drivers = await prisma.driver.findMany({
    orderBy: { createdAt: "desc" },
    include: { vehicle: true },
  });
  return NextResponse.json(drivers);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = driverSchema.parse(body);

    const created = await prisma.driver.create({
      data: {
        name: parsed.name,
        phone: parsed.phone ?? null,
        employeeId: parsed.employeeId ?? null,
        licenseNumber: parsed.licenseNumber ?? null,
        vehicleId: parsed.vehicleId,
        status: parsed.status ?? "available",
      },
      include: { vehicle: true },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create driver";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

