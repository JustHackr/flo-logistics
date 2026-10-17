import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/auth/api";
import { resolveReconciliationIssue } from "@/lib/integrations/reconciliation";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const access = await requireApiRole(["ADMIN", "OPS_MANAGER", "WAREHOUSE"]);
  if (!access.ok) return access.response;
  const { id } = await context.params;
  const body = (await request.json().catch(() => ({}))) as { note?: string };
  try {
    return NextResponse.json(await resolveReconciliationIssue(id, access.session.id, body.note));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to resolve issue" }, { status: 400 });
  }
}
