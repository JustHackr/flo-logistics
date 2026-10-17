import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/auth/api";
import { listReconciliationIssues, reconcileIntegrationData } from "@/lib/integrations/reconciliation";

export async function GET(request: Request) {
  const access = await requireApiRole(["ADMIN", "OPS_MANAGER", "WAREHOUSE"]);
  if (!access.ok) return access.response;
  const status = new URL(request.url).searchParams.get("status") ?? undefined;
  return NextResponse.json({ issues: await listReconciliationIssues(status) });
}

export async function POST() {
  const access = await requireApiRole(["ADMIN", "OPS_MANAGER", "WAREHOUSE"]);
  if (!access.ok) return access.response;
  return NextResponse.json(await reconcileIntegrationData({ actorUserId: access.session.id, actorRole: access.session.role }));
}
