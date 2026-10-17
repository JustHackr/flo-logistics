import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { connectorSchema } from "@/lib/schemas/connector";
import { apiError } from "@/lib/i18n/api-errors";
import { getLocaleFromRequest } from "@/lib/i18n/get-locale";
import { requireApiRole } from "@/lib/auth/api";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const access = await requireApiRole(["ADMIN", "OPS_MANAGER", "WAREHOUSE"]);
  if (!access.ok) return access.response;
  const { id } = await context.params;
  const connector = await prisma.dataConnector.findUnique({
    where: { id },
    include: { _count: { select: { vehicles: true } } },
  });
  if (!connector) {
    return apiError(getLocaleFromRequest(request), "connectorNotFound", 404);
  }
  return NextResponse.json(connector);
}

export async function PUT(request: Request, context: RouteContext) {
  const access = await requireApiRole(["ADMIN"]);
  if (!access.ok) return access.response;
  const { id } = await context.params;
  try {
    const body = await request.json();
    const parsed = connectorSchema.parse(body);

    const connector = await prisma.dataConnector.update({
      where: { id },
      data: {
        ...parsed,
        config: parsed.config ?? null,
        description: parsed.description ?? null,
      },
    });

    return NextResponse.json(connector);
  } catch (error) {
    console.error("[connectors] update failed:", error);
    return apiError(getLocaleFromRequest(request), "validation", 400);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const access = await requireApiRole(["ADMIN"]);
  if (!access.ok) return access.response;
  const { id } = await context.params;
  try {
    await prisma.dataConnector.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return apiError(getLocaleFromRequest(request), "connectorNotFound", 404);
  }
}
