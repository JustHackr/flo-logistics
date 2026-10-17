import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/auth/api";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const access = await requireApiRole(["ADMIN", "OPS_MANAGER", "WAREHOUSE"]);
  if (!access.ok) return access.response;
  const { id } = await context.params;
  const runs = await prisma.integrationRun.findMany({
    where: { connectorId: id },
    orderBy: { startedAt: "desc" },
    take: 10,
  });
  return NextResponse.json(runs);
}
