import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { driverSchema } from "@/lib/schemas/driver";
import { apiError } from "@/lib/i18n/api-errors";
import { getLocaleFromRequest } from "@/lib/i18n/get-locale";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const driver = await prisma.driver.findUnique({
    where: { id },
    include: { vehicle: true },
  });
  if (!driver) {
    return apiError(getLocaleFromRequest(request), "driverNotFound", 404);
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
        employeeId: parsed.employeeId ?? null,
        licenseNumber: parsed.licenseNumber ?? null,
        vehicleId: parsed.vehicleId,
        status: parsed.status ?? "available",
      },
      include: { vehicle: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[drivers] update failed:", error);
    return apiError(getLocaleFromRequest(request), "validation", 400);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const { id } = await context.params;
  try {
    await prisma.driver.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    const hasRoutePlans =
      error instanceof Error && error.message.includes("Foreign");
    return apiError(
      getLocaleFromRequest(request),
      hasRoutePlans ? "conflict" : "driverNotFound",
      hasRoutePlans ? 409 : 404
    );
  }
}

