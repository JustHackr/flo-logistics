import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { connectorSchema } from "@/lib/schemas/connector";
import { apiError } from "@/lib/i18n/api-errors";
import { getLocaleFromRequest } from "@/lib/i18n/get-locale";

export async function GET() {
  const connectors = await prisma.dataConnector.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { vehicles: true } } },
  });
  return NextResponse.json(connectors);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = connectorSchema.parse(body);

    const connector = await prisma.dataConnector.create({
      data: {
        ...parsed,
        config: parsed.config ?? null,
        description: parsed.description ?? null,
      },
    });

    return NextResponse.json(connector, { status: 201 });
  } catch (error) {
    console.error("[connectors] create failed:", error);
    return apiError(getLocaleFromRequest(request), "validation", 400);
  }
}
