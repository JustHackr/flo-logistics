import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/auth/api";
import { createRouteRevisionPreview } from "@/lib/intelligence/revisions";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const access = await requireApiRole(["ADMIN", "OPS_MANAGER"]);
  if (!access.ok) return access.response;
  try {
    const { id } = await context.params;
    return NextResponse.json(await createRouteRevisionPreview(id, access.session.id));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not preview route revision" }, { status: 400 });
  }
}
