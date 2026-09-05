import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

import { orderSchema } from "@/lib/schemas/order";
import { isWithinJakartaBounds } from "@/lib/routing/jakarta";
import { apiError } from "@/lib/i18n/api-errors";
import { getLocaleFromRequest } from "@/lib/i18n/get-locale";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const order = await prisma.order.findUnique({
    where: { id },
  });

  if (!order) {
    return apiError(getLocaleFromRequest(request), "orderNotFound", 404);
  }

  return NextResponse.json(order);
}

export async function PUT(request: Request, context: RouteContext) {
  const { id } = await context.params;
  try {
    const body = await request.json();
    const parsed = orderSchema.parse(body);

    if (!isWithinJakartaBounds(parsed.lat, parsed.lng)) {
      return apiError(getLocaleFromRequest(request), "validation", 400);
    }

    const updated = await prisma.order.update({
      where: { id },
      data: {
        recipientAddress: parsed.recipientAddress,
        lat: parsed.lat,
        lng: parsed.lng,
        accessRequirement: parsed.accessRequirement,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[orders] update failed:", error);
    return apiError(getLocaleFromRequest(request), "validation", 400);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const { id } = await context.params;
  try {
    await prisma.order.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return apiError(getLocaleFromRequest(request), "orderNotFound", 404);
  }
}

