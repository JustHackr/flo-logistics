"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Check, ChevronRight, RotateCcw, Play, ShieldAlert } from "lucide-react";
import { withBasePath } from "@/lib/base-path";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Scenario = {
  id: string;
  status: string;
  step: number;
  synthetic: boolean;
  steps: Array<{ number: number; title: string; state: string }>;
  route: { id: string; driver: string; warehouse: string; status: string; totalDistanceKm: number; totalDurationMin: number; stops: number } | null;
  revision: { id: string; status: string; originalDurationMin: number; revisedDurationMin: number; originalDistanceKm: number; revisedDistanceKm: number; affectedStops: number; reasons: string[] } | null;
  conditions: Array<{ id: string; dataType: string; source: string; stale: boolean; congestionRatio: number | null; precipitationMmPerHour: number | null; incidentCount: number | null }>;
};

const SCENARIO_ID = "rain-disruption";

function minutes(value: number) { return `${Math.round(value)} min`; }

export function DemoScenarioClient() {
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const response = await fetch(withBasePath(`/api/demo/scenarios/${SCENARIO_ID}`), { cache: "no-store" });
    const body = await response.json();
    if (!response.ok) throw new Error(body?.error ?? "Unable to load scenario");
    setScenario(body);
  }

  useEffect(() => { const timer = window.setTimeout(() => void load().catch((cause) => setError(cause instanceof Error ? cause.message : "Unable to load scenario")), 0); return () => window.clearTimeout(timer); }, []);

  async function act(action: "start" | "advance" | "approve" | "reject" | "reset") {
    setLoading(true); setError(null);
    try {
      const response = await fetch(withBasePath(`/api/demo/scenarios/${SCENARIO_ID}`), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error ?? "Scenario action failed");
      setScenario(body);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Scenario action failed"); }
    finally { setLoading(false); }
  }

  if (!scenario) return <div className="text-sm text-muted-foreground">Loading scenario…</div>;
  const canAdvance = scenario.status === "IDLE" || (scenario.status === "RUNNING" && scenario.step < 3);
  const awaitingDecision = scenario.status === "RUNNING" && scenario.step >= 3 && scenario.revision?.status === "DRAFT";

  return <div className="space-y-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div><div className="flex items-center gap-2"><ShieldAlert className="h-5 w-5 text-primary" /><h2 className="text-2xl font-bold tracking-tight">Judge disruption scenario</h2></div><p className="mt-1 max-w-3xl text-muted-foreground">Normal route → heavy rain and congestion → explainable Control Tower alert → operator route decision → measurable impact.</p></div>
      <div className="flex gap-2"><Button variant="outline" onClick={() => void act("reset")} disabled={loading}><RotateCcw className="mr-2 h-4 w-4" />Reset</Button>{canAdvance && <Button onClick={() => void act(scenario.status === "IDLE" ? "start" : "advance")} disabled={loading}><Play className="mr-2 h-4 w-4" />{scenario.status === "IDLE" ? "Start scenario" : "Advance scenario"}</Button>}</div>
    </div>
    {error && <div className="rounded-md border border-destructive/30 p-3 text-sm text-destructive">{error}</div>}
    <Card><CardHeader><CardTitle>Scenario progress</CardTitle><CardDescription>All injected conditions are synthetic and deliberately labeled for the demo.</CardDescription></CardHeader><CardContent className="space-y-3">{scenario.steps.map((step) => <div key={step.number} className="flex items-center gap-3 rounded-lg border p-3"><div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-sm font-semibold">{step.state === "complete" ? <Check className="h-4 w-4 text-primary" /> : step.number}</div><span className="flex-1 text-sm">{step.title}</span><Badge variant={step.state === "complete" ? "default" : step.state === "current" ? "secondary" : "outline"}>{step.state}</Badge></div>)}</CardContent></Card>
    <div className="grid gap-4 lg:grid-cols-2">
      <Card><CardHeader><CardTitle>Data provenance</CardTitle><CardDescription>Source status is part of every decision.</CardDescription></CardHeader><CardContent className="space-y-2">{scenario.conditions.length === 0 ? <p className="text-sm text-muted-foreground">Start and advance the scenario to inject conditions.</p> : scenario.conditions.map((condition) => <div key={condition.id} className="flex items-center justify-between gap-2 rounded-md border p-3 text-sm"><span>{condition.dataType === "TRAFFIC" ? `Traffic ${condition.congestionRatio?.toFixed(2)}x` : condition.dataType === "WEATHER" ? `Rain ${condition.precipitationMmPerHour?.toFixed(1)} mm/h` : `${condition.incidentCount ?? 0} incident(s)`}</span><Badge variant="secondary">{condition.source.toUpperCase()} · {condition.stale ? "STALE" : "FRESH"}</Badge></div>)}</CardContent></Card>
      <Card><CardHeader><CardTitle>Route decision</CardTitle><CardDescription>{scenario.route ? `${scenario.route.driver} · ${scenario.route.warehouse} · ${scenario.route.stops} stops` : "A seeded route is required."}</CardDescription></CardHeader><CardContent className="space-y-3">{scenario.revision ? <><div className="grid gap-2 sm:grid-cols-3 text-sm"><div><span className="text-xs text-muted-foreground">Original ETA</span><div className="font-semibold">{minutes(scenario.revision.originalDurationMin)}</div></div><div><span className="text-xs text-muted-foreground">Revised ETA</span><div className="font-semibold">{minutes(scenario.revision.revisedDurationMin)}</div></div><div><span className="text-xs text-muted-foreground">Affected stops</span><div className="font-semibold">{scenario.revision.affectedStops}</div></div></div><ul className="list-inside list-disc space-y-1 text-xs text-muted-foreground">{scenario.revision.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>{awaitingDecision && <div className="flex flex-wrap gap-2"><Button onClick={() => void act("approve")} disabled={loading}><Check className="mr-1 h-4 w-4" />Approve revision</Button><Button variant="outline" onClick={() => void act("reject")} disabled={loading}>Reject revision</Button></div>}{scenario.revision.status !== "DRAFT" && <Badge>{scenario.revision.status}</Badge>}</> : <p className="text-sm text-muted-foreground">Advance after the disruption to generate an operator-approved route preview.</p>}<Link href="/control-tower" className="inline-flex items-center text-sm font-medium text-primary hover:underline">Open Control Tower <ChevronRight className="ml-1 h-4 w-4" /></Link></CardContent></Card>
    </div>
    {scenario.status === "COMPLETED" && <Card className="border-primary/30 bg-primary/5"><CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="font-semibold">Scenario complete</div><p className="text-sm text-muted-foreground">The decision and its synthetic impact are now persisted for review.</p></div><Link href="/impact"><Button variant="outline">View impact dashboard</Button></Link></CardContent></Card>}
  </div>;
}
