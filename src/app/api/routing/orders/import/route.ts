import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isWithinJakartaBounds } from "@/lib/routing/jakarta";
import { orderSchema, stopAccessValues } from "@/lib/schemas/order";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const rows = body.rows as Array<Record<string, string>>;
    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { error: "No rows provided for import" },
        { status: 400 }
      );
    }

    const errors: Array<{ row: number; error: string }> = [];
    const validPayloads: Array<{
      recipientAddress: string;
      lat: number;
      lng: number;
      accessRequirement: (typeof stopAccessValues)[number];
    }> = [];

    rows.forEach((row, idx) => {
      try {
        const parsed = orderSchema.parse({
          recipientAddress: row.recipientAddress,
          lat: row.lat,
          lng: row.lng,
          accessRequirement: row.accessRequirement,
        });
        if (!isWithinJakartaBounds(parsed.lat, parsed.lng)) {
          throw new Error("Outside Jakarta bounds (demo validation)");
        }
        validPayloads.push(parsed);
      } catch (e) {
        errors.push({
          row: idx + 2, // account for header
          error: e instanceof Error ? e.message : "Invalid row",
        });
      }
    });

    const created = await prisma.$transaction(
      validPayloads.map((p) =>
        prisma.order.create({
          data: {
            recipientAddress: p.recipientAddress,
            lat: p.lat,
            lng: p.lng,
            accessRequirement: p.accessRequirement,
            status: "RECEIVED",
            receivedAt: new Date(),
          },
        })
      )
    );

    return NextResponse.json({
      imported: created.length,
      failed: errors.length,
      errors,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to import routing orders";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

