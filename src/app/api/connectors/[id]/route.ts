import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { connectorSchema } from "@/lib/schemas/connector";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const connector = await prisma.dataConnector.findUnique({
    where: { id },
    include: { _count: { select: { vehicles: true } } },
  });
  if (!connector) {
    return NextResponse.json({ error: "Connector not found" }, { status: 404 });
  }
  return NextResponse.json(connector);
}

export async function PUT(request: Request, context: RouteContext) {
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
    const message =
      error instanceof Error ? error.message : "Failed to update connector";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  try {
    await prisma.dataConnector.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Connector not found" }, { status: 404 });
  }
}
