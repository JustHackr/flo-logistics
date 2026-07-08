import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { driverSchema } from "@/lib/schemas/driver";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const driver = await prisma.driver.findUnique({
    where: { id },
    include: { vehicle: true },
  });
  if (!driver) {
    return NextResponse.json({ error: "Driver not found" }, { status: 404 });
  }
  return NextResponse.json(driver);
}

export async function PUT(request: Request, context: RouteContext) {
  const { id } = await context.params;
  try {
    const body = await request.json();
    const parsed = driverSchema.parse(body);

    const updated = await prisma.driver.update({
      where: { id },
      data: {
        name: parsed.name,
        phone: parsed.phone ?? null,
        vehicleId: parsed.vehicleId,
        status: parsed.status ?? "available",
      },
      include: { vehicle: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update driver";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  try {
    await prisma.driver.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Driver not found" }, { status: 404 });
  }
}

