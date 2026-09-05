import { NextResponse } from "next/server";
import { validateCsvRow } from "@/lib/csv";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/i18n/api-errors";
import { getLocaleFromRequest } from "@/lib/i18n/get-locale";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const rows: Record<string, string>[] = body.rows ?? [];

    if (!Array.isArray(rows) || rows.length === 0) {
      return apiError(getLocaleFromRequest(request), "importFailed", 400);
    }

    const results = rows.map((row, index) => validateCsvRow(row, index + 1));
    const validRows = results.filter((r) => r.valid && r.parsed);

    const created = await prisma.$transaction(
      validRows.map((row) =>
        prisma.vehicle.create({
          data: {
            ...row.parsed!,
            dataSource: "csv",
            lastMaintenanceDate: row.parsed!.lastMaintenanceDate ?? null,
            nextMaintenanceDate: row.parsed!.nextMaintenanceDate ?? null,
            notes: row.parsed!.notes ?? null,
          },
        })
      )
    );

    return NextResponse.json({
      imported: created.length,
      failed: results.length - validRows.length,
      results,
    });
  } catch (error) {
    console.error("[vehicles/import] failed:", error);
    return apiError(getLocaleFromRequest(request), "importFailed", 400);
  }
}
