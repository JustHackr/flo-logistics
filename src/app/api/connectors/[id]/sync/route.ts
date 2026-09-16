import { NextResponse } from "next/server";
import Papa from "papaparse";
import { requireApiRole } from "@/lib/auth/api";
import { getIntegrationFixture } from "@/lib/integrations/fixtures";
import { runIntegrationSync } from "@/lib/integrations/service";
import type { IntegrationFixture } from "@/lib/integrations/types";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const access = await requireApiRole(["ADMIN", "OPS_MANAGER", "WAREHOUSE"]);
  if (!access.ok) return access.response;
  const { id } = await context.params;
  const connector = await prisma.dataConnector.findUnique({
    where: { id },
    select: { id: true, type: true, name: true },
  });
  if (!connector) return NextResponse.json({ error: "Connector not found" }, { status: 404 });
  if (connector.type !== "oms" && connector.type !== "wms") {
    return NextResponse.json({ error: "Only OMS and WMS connectors support demo sync" }, { status: 400 });
  }

  try {
    let rows: unknown[] = [];
    let mode: "fixture" | "file" | "json" = "json";
    let fixture: IntegrationFixture | undefined;
    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("file");
      if (!(file instanceof File)) {
        return NextResponse.json({ error: "A CSV or JSON file is required" }, { status: 400 });
      }
      const text = await file.text();
      mode = "file";
      if (file.name.toLowerCase().endsWith(".json")) {
        const parsed = JSON.parse(text);
        rows = Array.isArray(parsed) ? parsed : parsed.rows;
      } else {
        const parsed = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });
        rows = parsed.data;
      }
      if (!Array.isArray(rows)) throw new Error("The file must contain an array of rows");
    } else {
      const body = (await request.json()) as { fixture?: IntegrationFixture; rows?: unknown[] };
      fixture = body.fixture;
      rows = body.rows ?? (fixture ? getIntegrationFixture(fixture) : []);
      mode = fixture ? "fixture" : "json";
    }

    const result = await runIntegrationSync({ connector, fixture, rows, mode, actorUserId: access.session.id, actorRole: access.session.role });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Sync failed" },
      { status: 400 },
    );
  }
}
