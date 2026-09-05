import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { driverSchema } from "@/lib/schemas/driver";
import { apiError } from "@/lib/i18n/api-errors";
import { getLocaleFromRequest } from "@/lib/i18n/get-locale";

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
    console.error("[drivers] create failed:", error);
    return apiError(getLocaleFromRequest(request), "validation", 400);
  }
}

