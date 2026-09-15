import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiRole } from "@/lib/auth/api";
import { prisma } from "@/lib/prisma";

const updateSchema = z.object({
  status: z.enum(["ACKNOWLEDGED", "RESOLVED"]),
  note: z.string().trim().max(500).optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const access = await requireApiRole(["ADMIN", "OPS_MANAGER"]);
  if (!access.ok) return access.response;
  const { id } = await context.params;

  try {
    const input = updateSchema.parse(await request.json());
    const now = new Date();
    const exception = await prisma.controlTowerException.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exception) return NextResponse.json({ error: "Exception not found" }, { status: 404 });

    const updated = await prisma.controlTowerException.update({
      where: { id },
      data:
        input.status === "ACKNOWLEDGED"
          ? {
              status: "ACKNOWLEDGED",
              acknowledgedAt: now,
              acknowledgedByUserId: access.session.id,
              resolutionNote: input.note ?? null,
            }
          : {
              status: "RESOLVED",
              resolvedAt: now,
              resolvedByUserId: access.session.id,
              resolutionNote: input.note ?? null,
            },
    });
    return NextResponse.json({ ok: true, id: updated.id, status: updated.status });
  } catch {
    return NextResponse.json({ error: "Invalid exception update" }, { status: 400 });
  }
}
