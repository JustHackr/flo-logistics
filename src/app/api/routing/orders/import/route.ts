import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isWithinJakartaBounds } from "@/lib/routing/jakarta";
import { orderSchema, stopAccessValues } from "@/lib/schemas/order";
import { apiError } from "@/lib/i18n/api-errors";
import { getLocaleFromRequest } from "@/lib/i18n/get-locale";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const rows = body.rows as Array<Record<string, string>>;
    if (!Array.isArray(rows) || rows.length === 0) {
      return apiError(getLocaleFromRequest(request), "importFailed", 400);
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
    console.error("[orders/import] failed:", error);
    return apiError(getLocaleFromRequest(request), "importFailed", 400);
  }
}

