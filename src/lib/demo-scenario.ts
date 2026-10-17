import { prisma } from "@/lib/prisma";
import { recordAuditEventSafe } from "@/lib/audit";
import { getControlTowerOverview } from "@/lib/control-tower";
import { runIntelligenceRefresh, getLatestSnapshots } from "@/lib/intelligence/service";
import { approveRouteRevision, createRouteRevisionPreview, rejectRouteRevision } from "@/lib/intelligence/revisions";

export const RAIN_DISRUPTION_SCENARIO = "rain-disruption";
export const DEMO_SCENARIO_STEPS = [
  { number: 1, key: "baseline", title: "Normal route baseline" },
  { number: 2, key: "disruption", title: "Heavy rain and congestion begin" },
  { number: 3, key: "risk", title: "Control Tower raises explainable alerts" },
  { number: 4, key: "decision", title: "Operator previews and decides on a revision" },
  { number: 5, key: "impact", title: "Impact results are calculated" },
] as const;

type Baseline = {
  routePlanId: string;
  status: "PLANNED" | "IN_PROGRESS" | "COMPLETED";
  totalDistanceKm: number;
  totalDurationMin: number;
  stops: Array<{ id: string; etaAt: string | null; durationMin: number }>;
};

async function findDemoRoute() {
  const active = await prisma.routePlan.findFirst({
    where: { status: { in: ["PLANNED", "IN_PROGRESS"] } },
    orderBy: { updatedAt: "desc" },
    include: { stops: { orderBy: { sequence: "asc" } }, driver: { select: { name: true } }, warehouse: { select: { name: true } } },
  });
  return active ?? prisma.routePlan.findFirst({
    orderBy: { updatedAt: "desc" },
    include: { stops: { orderBy: { sequence: "asc" } }, driver: { select: { name: true } }, warehouse: { select: { name: true } } },
  });
}

function parseBaseline(value: string | null): Baseline | null {
  if (!value) return null;
  try { return JSON.parse(value) as Baseline; } catch { return null; }
}

async function ensureScenario() {
  return prisma.demoScenarioRun.upsert({
    where: { id: RAIN_DISRUPTION_SCENARIO },
    create: { id: RAIN_DISRUPTION_SCENARIO, scenarioKey: RAIN_DISRUPTION_SCENARIO },
    update: {},
  });
}

export async function getDemoScenario() {
  const run = await ensureScenario();
  const route = run.baselineRoutePlanId ? await prisma.routePlan.findUnique({ where: { id: run.baselineRoutePlanId }, include: { stops: { orderBy: { sequence: "asc" } }, driver: { select: { name: true } }, warehouse: { select: { name: true } } } }) : null;
  const revision = run.baselineRoutePlanId ? await prisma.routeRevision.findFirst({ where: { routePlanId: run.baselineRoutePlanId, scenarioKey: run.scenarioKey }, orderBy: { createdAt: "desc" } }) : null;
  const snapshots = await getLatestSnapshots();
  return {
    id: run.id,
    scenarioKey: run.scenarioKey,
    status: run.status,
    step: run.step,
    synthetic: run.synthetic,
    steps: DEMO_SCENARIO_STEPS.map((item) => ({ ...item, state: run.step >= item.number ? "complete" : run.step + 1 === item.number ? "current" : "upcoming" })),
    route: route ? { id: route.id, driver: route.driver.name, warehouse: route.warehouse.name, status: route.status, totalDistanceKm: route.totalDistanceKm, totalDurationMin: route.totalDurationMin, stops: route.stops.length } : null,
    revision: revision ? { id: revision.id, status: revision.status, originalDurationMin: revision.originalDurationMin, revisedDurationMin: revision.revisedDurationMin, originalDistanceKm: revision.originalDistanceKm, revisedDistanceKm: revision.revisedDistanceKm, affectedStops: revision.affectedStops, reasons: JSON.parse(revision.reasonsJson) as string[] } : null,
    conditions: snapshots.filter((snapshot) => snapshot.source === "fixture"),
    updatedAt: run.updatedAt.toISOString(),
  };
}

export async function startDemoScenario(userId: string) {
  const existing = await ensureScenario();
  if (existing.status === "RUNNING") return getDemoScenario();
  const route = await findDemoRoute();
  if (!route) throw new Error("A seeded route is required to start the demo scenario.");
  const baseline: Baseline = { routePlanId: route.id, status: route.status, totalDistanceKm: route.totalDistanceKm, totalDurationMin: route.totalDurationMin, stops: route.stops.map((stop) => ({ id: stop.id, etaAt: stop.etaAt?.toISOString() ?? null, durationMin: stop.durationMin })) };
  await prisma.demoScenarioRun.update({ where: { id: RAIN_DISRUPTION_SCENARIO }, data: { status: "RUNNING", step: 1, synthetic: true, baselineRoutePlanId: route.id, baselineJson: JSON.stringify(baseline), startedAt: new Date(), completedAt: null } });
  await recordAuditEventSafe({ eventType: "DEMO_SCENARIO", action: "START", summary: "Rain disruption scenario started with a route baseline.", actorUserId: userId, entityType: "DemoScenarioRun", entityId: RAIN_DISRUPTION_SCENARIO, routePlanId: route.id, after: { scenarioKey: RAIN_DISRUPTION_SCENARIO, step: 1, synthetic: true, baseline } });
  return getDemoScenario();
}

export async function advanceDemoScenario(userId: string) {
  const run = await ensureScenario();
  if (run.status !== "RUNNING") return startDemoScenario(userId);
  if (run.step === 1) {
    await runIntelligenceRefresh({ mode: "fixture" });
    await getControlTowerOverview();
    await prisma.demoScenarioRun.update({ where: { id: run.id }, data: { step: 2 } });
    await recordAuditEventSafe({ eventType: "DEMO_SCENARIO", action: "DISRUPTION", summary: "Synthetic heavy rain, congestion, and road closure injected.", actorUserId: userId, entityType: "DemoScenarioRun", entityId: run.id, after: { step: 2, source: "fixture" } });
  } else if (run.step === 2) {
    if (!run.baselineRoutePlanId) throw new Error("Scenario route baseline is missing.");
    await createRouteRevisionPreview(run.baselineRoutePlanId, userId, run.scenarioKey);
    await prisma.demoScenarioRun.update({ where: { id: run.id }, data: { step: 3 } });
    await recordAuditEventSafe({ eventType: "DEMO_SCENARIO", action: "ASSESS", summary: "Control Tower risk assessment and route revision preview created.", actorUserId: userId, entityType: "DemoScenarioRun", entityId: run.id, routePlanId: run.baselineRoutePlanId, after: { step: 3 } });
  }
  return getDemoScenario();
}

export async function decideDemoScenario(userId: string, decision: "approve" | "reject") {
  const run = await ensureScenario();
  if (!run.baselineRoutePlanId) throw new Error("Scenario route baseline is missing.");
  const revision = await prisma.routeRevision.findFirst({ where: { routePlanId: run.baselineRoutePlanId, scenarioKey: run.scenarioKey, status: "DRAFT" }, orderBy: { createdAt: "desc" } });
  if (!revision) throw new Error("No draft scenario revision is available.");
  if (decision === "approve") await approveRouteRevision(revision.id, userId);
  else await rejectRouteRevision(revision.id, userId);
  await prisma.demoScenarioRun.update({ where: { id: run.id }, data: { step: 5, status: "COMPLETED", completedAt: new Date() } });
  await recordAuditEventSafe({ eventType: "DEMO_SCENARIO", action: decision === "approve" ? "APPROVE" : "REJECT", summary: `Scenario route revision ${decision}d.`, actorUserId: userId, entityType: "DemoScenarioRun", entityId: run.id, routePlanId: run.baselineRoutePlanId, routeRevisionId: revision.id, after: { step: 5, status: "COMPLETED", decision } });
  return getDemoScenario();
}

export async function resetDemoScenario(userId: string) {
  const run = await ensureScenario();
  const baseline = parseBaseline(run.baselineJson);
  if (baseline) {
    await prisma.$transaction(async (tx) => {
      await tx.routePlan.update({ where: { id: baseline.routePlanId }, data: { status: baseline.status, totalDistanceKm: baseline.totalDistanceKm, totalDurationMin: baseline.totalDurationMin } });
      for (const stop of baseline.stops) await tx.routeStop.update({ where: { id: stop.id }, data: { etaAt: stop.etaAt ? new Date(stop.etaAt) : null, durationMin: stop.durationMin } });
      await tx.routeRevision.deleteMany({ where: { scenarioKey: run.scenarioKey } });
      await tx.conditionSnapshot.deleteMany({ where: { source: "fixture" } });
      await tx.trafficIncident.deleteMany({ where: { source: "fixture" } });
    });
  }
  await prisma.demoScenarioRun.update({ where: { id: run.id }, data: { status: "IDLE", step: 0, baselineRoutePlanId: null, baselineJson: null, startedAt: null, completedAt: null } });
  await getControlTowerOverview();
  await recordAuditEventSafe({ eventType: "DEMO_SCENARIO", action: "RESET", summary: "Synthetic disruption scenario reset to its baseline.", actorUserId: userId, entityType: "DemoScenarioRun", entityId: run.id, after: { step: 0, status: "IDLE" } });
  return getDemoScenario();
}
