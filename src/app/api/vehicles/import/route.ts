import { NextResponse } from "next/server";
import { validateCsvRow } from "@/lib/csv";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const rows: Record<string, string>[] = body.rows ?? [];

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { error: "No rows provided for import" },
        { status: 400 }
      );
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
    const message =
      error instanceof Error ? error.message : "Failed to import vehicles";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
