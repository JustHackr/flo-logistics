import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isWithinJakartaBounds } from "@/lib/routing/jakarta";
import { orderSchema } from "@/lib/schemas/order";
import { apiError } from "@/lib/i18n/api-errors";
import { getLocaleFromRequest } from "@/lib/i18n/get-locale";

export async function GET() {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(orders);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = orderSchema.parse(body);

    if (!isWithinJakartaBounds(parsed.lat, parsed.lng)) {
      return apiError(getLocaleFromRequest(request), "validation", 400);
    }

    const receivedAt = new Date();

    const created = await prisma.order.create({
      data: {
        recipientAddress: parsed.recipientAddress,
        lat: parsed.lat,
        lng: parsed.lng,
        accessRequirement: parsed.accessRequirement,
        status: "RECEIVED",
        receivedAt,
      },
    });

    await prisma.orderStatusEvent.create({
      data: {
        orderId: created.id,
        status: "RECEIVED",
        timestamp: receivedAt,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("[orders] create failed:", error);
    return apiError(getLocaleFromRequest(request), "validation", 400);
  }
}

