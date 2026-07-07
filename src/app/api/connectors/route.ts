import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { connectorSchema } from "@/lib/schemas/connector";

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
    const message =
      error instanceof Error ? error.message : "Failed to create connector";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
