import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiRole } from "@/lib/auth/api";
import { advanceDemoScenario, decideDemoScenario, getDemoScenario, resetDemoScenario, startDemoScenario, RAIN_DISRUPTION_SCENARIO } from "@/lib/demo-scenario";

type RouteContext = { params: Promise<{ id: string }> };
const actionSchema = z.object({ action: z.enum(["start", "advance", "approve", "reject", "reset"]) });

export async function GET(_request: Request, context: RouteContext) {
  const access = await requireApiRole(["ADMIN", "OPS_MANAGER"]);
  if (!access.ok) return access.response;
  const { id } = await context.params;
  if (id !== RAIN_DISRUPTION_SCENARIO) return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
  return NextResponse.json(await getDemoScenario());
}

export async function POST(request: Request, context: RouteContext) {
  const access = await requireApiRole(["ADMIN", "OPS_MANAGER"]);
  if (!access.ok) return access.response;
  const { id } = await context.params;
  if (id !== RAIN_DISRUPTION_SCENARIO) return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
  try {
    const { action } = actionSchema.parse(await request.json());
    const data = action === "start" ? await startDemoScenario(access.session.id) : action === "advance" ? await advanceDemoScenario(access.session.id) : action === "approve" ? await decideDemoScenario(access.session.id, "approve") : action === "reject" ? await decideDemoScenario(access.session.id, "reject") : await resetDemoScenario(access.session.id);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Scenario action failed" }, { status: 400 });
  }
}
