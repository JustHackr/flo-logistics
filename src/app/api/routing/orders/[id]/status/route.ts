import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { orderStatusUpdateSchema } from "@/lib/schemas/order";
import { apiError } from "@/lib/i18n/api-errors";
import { getLocaleFromRequest } from "@/lib/i18n/get-locale";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  try {
    const body = await request.json();
    const parsed = orderStatusUpdateSchema.parse(body);

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) {
      return apiError(getLocaleFromRequest(request), "orderNotFound", 404);
    }

    const timestamp = parsed.timestamp ?? new Date();

    const updated = await prisma.$transaction(async (tx) => {
      let receivedAt = order.receivedAt;
      let preparingAt = order.preparingAt;
      let onRouteAt = order.onRouteAt;
      const etaAt = order.etaAt;
      let deliveredAt = order.deliveredAt;

      switch (parsed.status) {
        case "RECEIVED":
          receivedAt = timestamp;
          break;
        case "PREPARING":
          preparingAt = timestamp;
          break;
        case "ON_ROUTE":
          onRouteAt = timestamp;
          break;
        case "DELIVERED":
          deliveredAt = timestamp;
          break;
      }

      const orderUpdated = await tx.order.update({
        where: { id },
        data: {
          status: parsed.status,
          receivedAt,
          preparingAt,
          onRouteAt,
          etaAt,
          deliveredAt,
        },
      });

      await tx.orderStatusEvent.create({
        data: {
          orderId: id,
          status: parsed.status,
          timestamp,
        },
      });

      return orderUpdated;
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[orders] status update failed:", error);
    return apiError(getLocaleFromRequest(request), "validation", 400);
  }
}

