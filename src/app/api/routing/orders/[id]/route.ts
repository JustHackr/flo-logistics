import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

import { orderSchema } from "@/lib/schemas/order";
import { isWithinJakartaBounds } from "@/lib/routing/jakarta";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const order = await prisma.order.findUnique({
    where: { id },
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  return NextResponse.json(order);
}

export async function PUT(request: Request, context: RouteContext) {
  const { id } = await context.params;
  try {
    const body = await request.json();
    const parsed = orderSchema.parse(body);

    if (!isWithinJakartaBounds(parsed.lat, parsed.lng)) {
      return NextResponse.json(
        { error: "Address must be within Jakarta bounds (demo validation)." },
        { status: 400 }
      );
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
    const message =
      error instanceof Error ? error.message : "Failed to update order";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  try {
    await prisma.order.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
}

