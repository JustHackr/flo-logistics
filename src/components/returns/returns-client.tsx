"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, Camera, CheckCircle2, CircleDot, ClipboardCheck, Database, Play, RefreshCw, Recycle, RotateCcw, ScanLine, ShieldAlert, Sparkles, Warehouse } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { ReturnCaseView } from "@/lib/returns/types";

type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

function tone(value: string): BadgeVariant { return ["CRITICAL", "HIGH", "UNSAFE", "COUNTERFEIT_SUSPECTED"].includes(value) ? "destructive" : ["WATCH", "MINOR_DAMAGE", "MANUAL_REVIEW", "REFUND_HELD"].includes(value) ? "secondary" : "outline"; }
function money(value: number) { return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value); }
function label(value: string) { return value.replaceAll("_", " "); }

const STEPS = [
  { key: "request", title: "Return created", description: "OMS creates the customer return case." },
  { key: "scan", title: "QR custody verified", description: "FLO checks identity, hub, stage, and duplicate scans." },
  { key: "inspect", title: "Package inspected", description: "Warehouse combines checklist, fixture, and lightweight CV signals." },
  { key: "risk", title: "Risk explained", description: "Rules score anomalies and route high risk to a human." },
  { key: "refund", title: "Refund decided", description: "Finance receives a recommendation, hold, or approval." },
  { key: "disposition", title: "Disposition approved", description: "WMS receives restock, repair, recycle, or reject." },
];

function stepComplete(active: ReturnCaseView, index: number) {
  if (index === 0) return active.events.length > 0;
  if (index === 1) return active.events.some((event) => event.eventType === "RETURN_SCAN");
  if (index === 2) return Boolean(active.latestInspection);
  if (index === 3) return Boolean(active.latestFraud);
  if (index === 4) return Boolean(active.latestRefund);
  return Boolean(active.latestDisposition);
}

function Provenance({ value }: { value: string }) { return <Badge variant="outline" className="gap-1.5 text-[10px] uppercase tracking-wide"><span className={`h-1.5 w-1.5 rounded-full ${value === "LIVE" ? "bg-emerald-500" : value === "FALLBACK" ? "bg-amber-500" : "bg-sky-500"}`} />{value}</Badge>; }

export function ReturnsClient({ initial, selectedId }: { initial?: ReturnCaseView[]; selectedId?: string }) {
  const [returns, setReturns] = React.useState<ReturnCaseView[]>(initial ?? []);
  const [activeId, setActiveId] = React.useState(selectedId ?? initial?.[0]?.id ?? "");
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const active = returns.find((item) => item.id === activeId) ?? returns[0];

  const refresh = React.useCallback(async () => {
    const response = await fetch("/api/returns", { cache: "no-store" });
    if (!response.ok) return;
    const body = await response.json() as { returns: ReturnCaseView[] };
    setReturns(body.returns);
    setActiveId((current) => current || body.returns[0]?.id || "");
  }, []);

  React.useEffect(() => { if (!initial?.length) { const timer = window.setTimeout(() => void refresh(), 0); return () => window.clearTimeout(timer); } }, [initial, refresh]);

  async function postFor(id: string, path: string, body: unknown = {}) {
    const response = await fetch(`/api/returns/${id}/${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const result = await response.json() as { error?: string };
    if (!response.ok) throw new Error(result.error ?? "Action failed");
    return result;
  }

  async function action(path: string, body: unknown = {}) {
    if (!active) return;
    setBusy(true); setMessage("");
    try { await postFor(active.id, path, body); setMessage("Saved. The decision, audit trail, and timeline were updated."); await refresh(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Action failed"); }
    finally { setBusy(false); }
  }

  async function resetDemo() {
    setBusy(true); setMessage("");
    try { const response = await fetch("/api/returns/demo/reset", { method: "POST" }); if (!response.ok) throw new Error("The demo could not be reset."); await refresh(); setMessage("Demo reset. It is ready to replay from the OMS return request."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Demo reset failed"); }
    finally { setBusy(false); }
  }

  async function runDemo() {
    if (!active) return;
    setBusy(true); setMessage("");
    try {
      const resetResponse = await fetch("/api/returns/demo/reset", { method: "POST" });
      if (!resetResponse.ok) throw new Error("The demo could not be reset.");
      const resetCase = await resetResponse.json() as ReturnCaseView;
      await postFor(resetCase.id, "scan", { code: resetCase.parcelCode, hubCode: resetCase.expectedHub, stage: "HUB_RECEIPT", format: "QR_CODE", source: "SYNTHETIC" });
      await postFor(resetCase.id, "inspect", { fixtureId: "water", checklist: { outerIntact: false, visibleDamage: true, safeForResale: false } });
      await postFor(resetCase.id, "fraud-assess", { overrides: { serialMismatch: true, missingCustody: true } });
      await postFor(resetCase.id, "refund/preview", { itemValue: 650000 });
      await postFor(resetCase.id, "disposition/preview", { itemValue: 650000 });
      await refresh(); setMessage("Scenario complete: water damage created a high-risk review, held refund recommendation, and recycle recommendation.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Demo failed"); }
    finally { setBusy(false); }
  }

  const completed = active ? STEPS.filter((_, index) => stepComplete(active, index)).length : 0;
  const triggeredSignals = active?.latestFraud?.signals.filter((signal) => signal.triggered) ?? [];
  const clearSignals = active?.latestFraud?.signals.filter((signal) => !signal.triggered) ?? [];

  return <div className="mx-auto max-w-7xl space-y-6">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><div className="flex flex-wrap items-center gap-2"><Sparkles className="h-5 w-5 text-primary" /><h1 className="text-2xl font-semibold tracking-tight">Reverse Logistics Intelligence</h1><Badge variant="secondary">Judge-ready demo</Badge><Provenance value={active?.dataSource ?? "SYNTHETIC"} /></div><p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">FLO turns a return into an explainable operational decision: verify the parcel, inspect its condition, score trust, protect the refund, and tell the warehouse what to do next.</p></div><div className="flex flex-wrap gap-2"><Button onClick={() => void runDemo()} disabled={busy}><Play className="mr-2 h-4 w-4" />Run full demo</Button><Button variant="outline" onClick={() => void resetDemo()} disabled={busy}><RotateCcw className="mr-2 h-4 w-4" />Reset scenario</Button><Button variant="outline" onClick={() => void refresh()} disabled={busy}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button></div></div>

    <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background"><CardContent className="p-5"><div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between"><div><Badge variant="outline">Replayable synthetic scenario</Badge><h2 className="mt-2 text-xl font-semibold">Heavy return damage → trust review → safe disposition</h2><p className="mt-1 max-w-2xl text-sm text-muted-foreground">Use one button to show judges how FLO connects Blibli OMS, warehouse evidence, the Control Tower, refund policy, and WMS disposition.</p></div><div className="grid min-w-[250px] grid-cols-2 gap-2 text-xs sm:grid-cols-4 lg:grid-cols-2"><div className="rounded-lg border bg-background/70 p-2"><p className="text-muted-foreground">Case</p><p className="mt-1 font-mono font-medium">BLI-RET-DEMO-001</p></div><div className="rounded-lg border bg-background/70 p-2"><p className="text-muted-foreground">Original order</p><p className="mt-1 font-mono font-medium">BLI-DEMO-1003</p></div><div className="rounded-lg border bg-background/70 p-2"><p className="text-muted-foreground">Hub</p><p className="mt-1 font-medium">JKT-01</p></div><div className="rounded-lg border bg-background/70 p-2"><p className="text-muted-foreground">Progress</p><p className="mt-1 font-medium">{completed}/{STEPS.length} steps</p></div></div></div></CardContent></Card>

    <div className="grid gap-3 lg:grid-cols-6">{STEPS.map((step, index) => { const done = active ? stepComplete(active, index) : false; const current = active ? !done && (index === 0 || stepComplete(active, index - 1)) : false; return <div key={step.key} className={`relative rounded-xl border p-3 ${done ? "border-emerald-500/40 bg-emerald-50/40" : current ? "border-primary bg-primary/5" : "bg-muted/20"}`}><div className="flex items-center gap-2">{done ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : current ? <CircleDot className="h-4 w-4 text-primary" /> : <span className="flex h-4 w-4 items-center justify-center rounded-full border text-[10px] text-muted-foreground">{index + 1}</span>}<span className="text-xs font-semibold">{step.title}</span></div><p className="mt-2 text-[11px] leading-4 text-muted-foreground">{step.description}</p>{index < STEPS.length - 1 && <ArrowRight className="absolute -right-3 top-6 z-10 hidden h-4 w-4 bg-background text-muted-foreground lg:block" />}</div>; })}</div>

    <div className="grid gap-4 md:grid-cols-4"><Card><CardHeader className="pb-2"><CardDescription>Cases in queue</CardDescription><CardTitle>{returns.length}</CardTitle></CardHeader><CardContent><p className="text-xs text-muted-foreground">OMS-linked returns being monitored</p></CardContent></Card><Card><CardHeader className="pb-2"><CardDescription>Open workflow</CardDescription><CardTitle>{returns.filter((item) => item.state !== "CLOSED").length}</CardTitle></CardHeader><CardContent><p className="text-xs text-muted-foreground">No automatic route or refund replacement</p></CardContent></Card><Card><CardHeader className="pb-2"><CardDescription>High-risk review</CardDescription><CardTitle>{returns.filter((item) => ["HIGH", "CRITICAL"].includes(item.riskLevel)).length}</CardTitle></CardHeader><CardContent><p className="text-xs text-muted-foreground">Requires a human decision</p></CardContent></Card><Card><CardHeader className="pb-2"><CardDescription>Net recovery</CardDescription><CardTitle>{money(returns.reduce((sum, item) => sum + (item.cost?.netRecovery ?? 0), 0))}</CardTitle></CardHeader><CardContent><p className="text-xs text-muted-foreground">Estimate after reverse handling</p></CardContent></Card></div>

    <div className="grid gap-4 lg:grid-cols-[0.72fr_1.28fr]"><Card><CardHeader><CardTitle className="text-base">Return queue</CardTitle><CardDescription>Select a case to inspect its evidence and decision logic.</CardDescription></CardHeader><CardContent className="space-y-2">{returns.map((item) => <button key={item.id} type="button" onClick={() => setActiveId(item.id)} className={`w-full rounded-xl border p-3 text-left transition ${item.id === active?.id ? "border-primary bg-primary/5 shadow-sm" : "hover:bg-muted/50"}`}><div className="flex items-center justify-between gap-2"><span className="font-medium">{item.externalReturnId}</span><Badge variant={tone(item.riskLevel)}>{item.riskLevel}</Badge></div><div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground"><span>{label(item.state)}</span><span>{item.expectedHub}</span></div><div className="mt-2 flex items-center gap-1.5"><Provenance value={item.dataSource} />{item.openExceptions > 0 && <Badge variant="destructive" className="text-[10px]">{item.openExceptions} exception{item.openExceptions === 1 ? "" : "s"}</Badge>}</div></button>)}{returns.length === 0 && <p className="text-sm text-muted-foreground">Loading the synthetic return fixture…</p>}</CardContent></Card>

      {active && <div className="space-y-4"><Card><CardHeader><div className="flex flex-wrap items-center gap-2"><CardTitle className="text-base">{active.externalReturnId}</CardTitle><Provenance value={active.dataSource} /><Badge variant={tone(active.state)}>{label(active.state)}</Badge><Badge variant={tone(active.riskLevel)}>{active.riskLevel} · {active.riskScore}/100</Badge></div><CardDescription>{active.reason} · OMS order {active.externalOrderId ?? "not linked"} · hub {active.expectedHub}</CardDescription></CardHeader><CardContent><div className="grid gap-3 sm:grid-cols-3"><div className="rounded-xl border p-3"><div className="flex items-center gap-2 text-xs text-muted-foreground"><Database className="h-3.5 w-3.5" />Identity contract</div><p className="mt-2 font-mono text-sm">{active.parcelCode}</p><p className="mt-1 text-xs text-muted-foreground">SKU {active.expectedSku ?? "pending"} · Serial {active.expectedSerial ?? "pending"}</p></div><div className="rounded-xl border p-3"><div className="flex items-center gap-2 text-xs text-muted-foreground"><ClipboardCheck className="h-3.5 w-3.5" />Evidence result</div><p className="mt-2 font-medium">{active.latestInspection?.result ?? "Awaiting inspection"}</p><p className="mt-1 text-xs text-muted-foreground">{active.latestInspection?.notes ?? "Choose an inspection scenario below."}</p></div><div className="rounded-xl border p-3"><div className="flex items-center gap-2 text-xs text-muted-foreground"><Recycle className="h-3.5 w-3.5" />Recovery model</div><p className="mt-2 font-medium">{active.cost ? money(active.cost.netRecovery) : "Not calculated"}</p><p className="mt-1 text-xs text-muted-foreground">{active.carbonKg ?? "—"} kg CO₂e estimate</p></div></div></CardContent></Card>

        <Card><CardHeader><div className="flex items-center gap-2"><ScanLine className="h-4 w-4 text-primary" /><CardTitle className="text-base">Operator demo controls</CardTitle></div><CardDescription>Every button calls the server workflow and appends a persistent event. Use “Run full demo” for the complete judge narrative.</CardDescription></CardHeader><CardContent className="space-y-4"><div className="flex flex-wrap gap-2"><Button size="sm" disabled={busy} onClick={() => void action("scan", { code: active.parcelCode, hubCode: active.expectedHub, stage: "HUB_RECEIPT", format: "QR_CODE", source: "SYNTHETIC" })}><ScanLine className="mr-2 h-4 w-4" />Verify return QR</Button><Button size="sm" variant="outline" disabled={busy} onClick={() => void action("inspect", { fixtureId: "water", checklist: { outerIntact: false, visibleDamage: true, safeForResale: false } })}><Camera className="mr-2 h-4 w-4" />Inspect water damage</Button><Button size="sm" variant="outline" disabled={busy} onClick={() => void action("fraud-assess", { overrides: { serialMismatch: true, missingCustody: true } })}><ShieldAlert className="mr-2 h-4 w-4" />Score trust risk</Button><Button size="sm" variant="outline" disabled={busy} onClick={() => void action("refund/preview", { itemValue: 650000 })}>Preview refund</Button><Button size="sm" variant="outline" disabled={busy} onClick={() => void action("disposition/preview", { itemValue: 650000 })}>Preview disposition</Button><Link href={`/returns/${active.id}`} className="inline-flex h-8 items-center rounded-md border px-3 text-sm font-medium hover:bg-muted">Open audit detail</Link></div><Separator /><div className="grid gap-3 md:grid-cols-3"><div className="rounded-lg bg-muted/50 p-3"><p className="text-xs font-medium">If QR passes</p><p className="mt-1 text-xs leading-5 text-muted-foreground">FLO advances the case to inspection and records hub, stage, source, and operator.</p></div><div className="rounded-lg bg-muted/50 p-3"><p className="text-xs font-medium">If evidence conflicts</p><p className="mt-1 text-xs leading-5 text-muted-foreground">The case is held for fraud review; FLO does not silently reject or refund it.</p></div><div className="rounded-lg bg-muted/50 p-3"><p className="text-xs font-medium">If Ops approves</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Only the approved refund/disposition changes the return state and downstream handoff.</p></div></div></CardContent></Card>

        <div className="grid gap-4 xl:grid-cols-2"><Card><CardHeader><div className="flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-primary" /><CardTitle className="text-base">Why FLO assigned this risk</CardTitle></div><CardDescription>Transparent rule signals—not a black-box rejection.</CardDescription></CardHeader><CardContent>{active.latestFraud ? <div className="space-y-3"><div className="flex items-center justify-between rounded-lg border p-3"><div><p className="text-sm font-medium">{active.latestFraud.riskLevel} review</p><p className="text-xs text-muted-foreground">Confidence: {active.latestFraud.confidence} · score {active.latestFraud.score}/100</p></div><Badge variant={tone(active.latestFraud.riskLevel)}>{active.latestFraud.requiresApproval ? "Human approval required" : "Continue workflow"}</Badge></div>{triggeredSignals.map((signal) => <div key={signal.key} className="rounded-lg border border-amber-500/30 bg-amber-50/40 p-3"><div className="flex items-center justify-between gap-2"><p className="text-sm font-medium">{signal.label}</p><Badge variant="secondary">+{signal.points} points</Badge></div><p className="mt-1 text-xs leading-5 text-muted-foreground">{signal.explanation}</p></div>)}{clearSignals.length > 0 && <details className="rounded-lg border p-3"><summary className="cursor-pointer text-xs font-medium">Show {clearSignals.length} checks that did not trigger</summary><div className="mt-2 space-y-1 text-xs text-muted-foreground">{clearSignals.map((signal) => <p key={signal.key}>✓ {signal.label}</p>)}</div></details>}<p className="text-xs text-muted-foreground">Recommendation: {active.latestFraud.recommendation}</p></div> : <div className="rounded-lg border border-dashed p-5 text-center"><ShieldAlert className="mx-auto h-5 w-5 text-muted-foreground" /><p className="mt-2 text-sm font-medium">No fraud assessment yet</p><p className="mt-1 text-xs text-muted-foreground">Run the full demo or score trust risk after inspection.</p></div>}</CardContent></Card>

          <Card><CardHeader><div className="flex items-center gap-2"><Warehouse className="h-4 w-4 text-primary" /><CardTitle className="text-base">Recommended decision</CardTitle></div><CardDescription>FLO separates recommendation from operator approval.</CardDescription></CardHeader><CardContent className="space-y-3">{active.latestRefund ? <div className="rounded-lg border p-3"><div className="flex items-center justify-between gap-2"><div><p className="text-sm font-medium">Refund: {label(active.latestRefund.decision)}</p><p className="text-xs text-muted-foreground">{money(active.latestRefund.amount)} · {active.latestRefund.status}</p></div><Badge variant={active.latestRefund.status === "APPROVED" ? "default" : "secondary"}>{active.latestRefund.status}</Badge></div><p className="mt-2 text-xs leading-5 text-muted-foreground">{active.latestRefund.rationale}</p><div className="mt-3 flex flex-wrap gap-2"><Button size="sm" disabled={busy || active.latestRefund.status === "APPROVED"} onClick={() => void action("refund/approve", { decision: active.latestRefund?.decision, amount: active.latestRefund?.amount })}>Approve refund</Button><Button size="sm" variant="outline" disabled={busy} onClick={() => void action("refund/hold")}>Hold for review</Button></div></div> : <p className="rounded-lg border border-dashed p-4 text-xs text-muted-foreground">Preview the refund after inspection to see the policy recommendation.</p>}{active.latestDisposition ? <div className="rounded-lg border p-3"><div className="flex items-center justify-between gap-2"><div><p className="text-sm font-medium">Disposition: {label(active.latestDisposition.disposition)}</p><p className="text-xs text-muted-foreground">Net recovery {money(active.latestDisposition.netRecovery)} · {active.latestDisposition.status}</p></div><Badge variant={active.latestDisposition.status === "APPROVED" ? "default" : "secondary"}>{active.latestDisposition.status}</Badge></div><p className="mt-2 text-xs leading-5 text-muted-foreground">{active.latestDisposition.rationale}</p><Button className="mt-3" size="sm" disabled={busy || active.latestDisposition.status === "APPROVED"} onClick={() => void action("disposition/approve", { disposition: active.latestDisposition?.disposition })}>Approve disposition</Button></div> : <p className="rounded-lg border border-dashed p-4 text-xs text-muted-foreground">Preview disposition to calculate restock, repair, recycle, or reject economics.</p>}</CardContent></Card></div>
        </div>
      }
    </div>

    {active && <><Card><CardHeader><div className="flex items-center gap-2"><ArrowRight className="h-4 w-4 text-primary" /><CardTitle className="text-base">How this integrates with Blibli operations</CardTitle></div><CardDescription>One return identity moves through systems while FLO keeps the reasoning and custody evidence together.</CardDescription></CardHeader><CardContent><div className="grid gap-2 md:grid-cols-6">{[{ icon: Database, title: "OMS", body: "Return request + order identity" }, { icon: ScanLine, title: "FLO QR", body: "Identity, hub, stage, duplicate" }, { icon: Camera, title: "Warehouse", body: "Checklist + condition evidence" }, { icon: ShieldAlert, title: "Control Tower", body: "Exception + explainable risk" }, { icon: Sparkles, title: "Finance", body: "Refund recommendation + approval" }, { icon: Recycle, title: "WMS", body: "Restock, repair, recycle, reject" }].map(({ icon: Icon, title, body }) => <div key={title} className="rounded-xl border bg-muted/20 p-3"><Icon className="h-4 w-4 text-primary" /><p className="mt-2 text-sm font-medium">{title}</p><p className="mt-1 text-xs leading-4 text-muted-foreground">{body}</p></div>)}</div></CardContent></Card><Card><CardHeader><div className="flex items-center gap-2"><CircleDot className="h-4 w-4 text-primary" /><CardTitle className="text-base">Evidence and custody timeline</CardTitle><Provenance value={active.dataSource} /></div><CardDescription>The timeline is append-only from the operator’s perspective. A reset only resets this synthetic demo case.</CardDescription></CardHeader><CardContent><div className="space-y-3">{active.events.slice(-12).map((event) => <div key={event.id} className="flex gap-3"><div className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10"><CircleDot className="h-3 w-3 text-primary" /></div><div className="min-w-0 flex-1 rounded-lg border p-3"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-medium">{label(event.eventType)}{event.toState ? ` → ${label(event.toState)}` : ""}</p><Provenance value={event.dataSource} /></div><p className="mt-1 text-xs text-muted-foreground">{event.location ?? "FLO operational service"} · {new Date(event.occurredAt).toLocaleString()}</p></div></div>)}</div>{message && <div className="mt-4 flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{message}</div>}</CardContent></Card></>}
  </div>;
}
