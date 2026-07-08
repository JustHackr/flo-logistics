import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isWithinJakartaBounds } from "@/lib/routing/jakarta";
import { orderSchema } from "@/lib/schemas/order";

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
      return NextResponse.json(
        { error: "Address must be within Jakarta bounds (demo validation)." },
        { status: 400 }
      );
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
    const message = error instanceof Error ? error.message : "Failed to create order";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

