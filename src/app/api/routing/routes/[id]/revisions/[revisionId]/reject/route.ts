import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/auth/api";
import { rejectRouteRevision } from "@/lib/intelligence/revisions";

type RouteContext = { params: Promise<{ id: string; revisionId: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const access = await requireApiRole(["ADMIN", "OPS_MANAGER"]);
  if (!access.ok) return access.response;
  try {
    const { revisionId } = await context.params;
    return NextResponse.json(await rejectRouteRevision(revisionId, access.session.id));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not reject route revision" }, { status: 400 });
  }
}
