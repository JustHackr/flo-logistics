"use client";

import Link from "next/link";
import { AlertTriangle, ArrowUpRight, Boxes, CloudRain, Clock3, RefreshCw, Route, ShieldAlert, TrafficCone, Truck } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/components/i18n/use-i18n";
import { toIntlLocale, type Locale } from "@/lib/i18n/config";
import { withBasePath } from "@/lib/base-path";
import type { ControlTowerException, ControlTowerExceptionKind, ControlTowerOverview, ControlTowerSeverity } from "@/lib/control-tower";

type AuditItem = { id: string; eventType: string; action: string; summary: string; reason: string | null; actor: string; actorRole: string | null; entityType: string; entityId: string; provider: string | null; createdAt: string };

function formatDateTime(iso: string | null | undefined, locale: Locale) {
  if (!iso) return "—";
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString(toIntlLocale(locale), { hour12: false, month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function severityVariant(severity: ControlTowerSeverity) {
  return severity === "critical" ? "destructive" : severity === "high" ? "secondary" : "outline";
}

function ExceptionIcon({ kind }: { kind: ControlTowerExceptionKind }) {
  if (kind === "fleet_risk") return <Truck className="h-4 w-4" />;
  if (kind === "fulfillment_blocked") return <Boxes className="h-4 w-4" />;
  if (kind === "weather_risk" || kind === "stale_weather") return <CloudRain className="h-4 w-4" />;
  if (kind === "incident_near_route" || kind === "stale_traffic") return <TrafficCone className="h-4 w-4" />;
  if (kind === "congestion_risk") return <TrafficCone className="h-4 w-4" />;
  if (kind === "sla_risk") return <Clock3 className="h-4 w-4" />;
  if (kind === "late_stop") return <AlertTriangle className="h-4 w-4" />;
  return <Route className="h-4 w-4" />;
}

function exceptionHref(exception: ControlTowerException) {
  if (exception.kind === "fleet_risk") return "/vehicles";
  if (exception.kind === "fulfillment_blocked") return "/connectors";
  if (exception.kind === "weather_risk" || exception.kind === "stale_weather") return "/routing/plan";
  if (exception.kind === "unassigned_order") return "/routing/orders";
    return "/routing/dashboard";
}

function MetricCard({ title, value, detail }: { title: string; value: string | number; detail: string }) {
  return <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold tabular-nums">{value}</div><p className="mt-1 text-xs text-muted-foreground">{detail}</p></CardContent></Card>;
}

export function ControlTowerClient({ initialData }: { initialData: ControlTowerOverview }) {
  const { t, locale } = useI18n();
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState("all");
  const [kindFilter, setKindFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [auditEvents, setAuditEvents] = useState<AuditItem[]>([]);

  const refresh = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const response = await fetch(withBasePath("/api/control-tower"), { cache: "no-store" });
      const nextData = await response.json();
      if (!response.ok) throw new Error(t("controlTower.loadFailed"));
      setData(nextData);
    } catch (cause) { setError(cause instanceof Error ? cause.message : t("controlTower.loadFailed")); }
    finally { setLoading(false); }
  }, [t]);

  useEffect(() => {
    const timer = window.setInterval(() => void refresh(), 30_000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  useEffect(() => {
    void fetch(withBasePath("/api/audit?limit=12"), { cache: "no-store" }).then(async (response) => {
      if (response.ok) setAuditEvents(await response.json());
    }).catch(() => undefined);
  }, [data.generatedAt]);

  async function updateException(id: string, status: "ACKNOWLEDGED" | "RESOLVED") {
    const note = status === "RESOLVED" ? window.prompt(t("controlTower.resolveNotePrompt")) ?? "" : "";
    const response = await fetch(withBasePath(`/api/control-tower/exceptions/${id}`), { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status, note }) });
    if (!response.ok) { setError(t("controlTower.actionFailed")); return; }
    await refresh();
  }

  async function runDemoIntelligenceRefresh() {
    setLoading(true); setError(null);
    try {
      const response = await fetch(withBasePath("/api/intelligence/refresh"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "fixture" }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error ?? "Unable to refresh intelligence");
      await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to refresh intelligence"); }
    finally { setLoading(false); }
  }

  const filteredExceptions = useMemo(() => data.exceptions.filter((exception) =>
    (severityFilter === "all" || exception.severity === severityFilter) &&
    (kindFilter === "all" || exception.kind === kindFilter) &&
    (sourceFilter === "all" || exception.sourceSystem === sourceFilter),
  ), [data.exceptions, severityFilter, kindFilter, sourceFilter]);

  const sourceSystems = Array.from(new Set(data.exceptions.map((exception) => exception.sourceSystem).filter(Boolean))) as string[];

  return <div className="space-y-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><div className="flex items-center gap-2"><ShieldAlert className="h-5 w-5 text-primary" /><h2 className="text-2xl font-bold tracking-tight">{t("controlTower.title")}</h2></div><p className="mt-1 max-w-2xl text-muted-foreground">{t("controlTower.subtitle")}</p></div><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => void runDemoIntelligenceRefresh()} disabled={loading}><RefreshCw className={loading ? "mr-2 h-4 w-4 animate-spin" : "mr-2 h-4 w-4"} />Run demo conditions</Button><Button variant="outline" onClick={() => void refresh()} disabled={loading}><RefreshCw className={loading ? "mr-2 h-4 w-4 animate-spin" : "mr-2 h-4 w-4"} />{t("common.refresh")}</Button></div></div>
    {error && <div className="rounded-md border border-destructive/30 p-3 text-sm text-destructive">{error}</div>}
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5"><MetricCard title={t("controlTower.metrics.openExceptions")} value={data.summary.openExceptions} detail={t("controlTower.metrics.openExceptionsDetail", { critical: data.summary.critical, high: data.summary.high })} /><MetricCard title={t("controlTower.metrics.unassignedOrders")} value={data.summary.unassignedOrders} detail={t("controlTower.metrics.unassignedOrdersDetail", { open: data.summary.openOrders })} /><MetricCard title={t("controlTower.metrics.fulfillmentBlocked")} value={data.summary.fulfillmentBlocked} detail={t("controlTower.metrics.atRiskOrders", { count: data.summary.atRiskOrders })} /><MetricCard title={t("controlTower.metrics.fleetRisks")} value={data.summary.fleetRisks} detail={t("controlTower.metrics.activeRoutes", { count: data.summary.activeRoutes })} /><MetricCard title={t("controlTower.metrics.otif")} value={data.summary.otifPercent === null ? "—" : `${data.summary.otifPercent}%`} detail={t("controlTower.metrics.deliveredWithPromise", { count: data.summary.deliveredWithPromise })} /></div>
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.6fr)]"><Card><CardHeader><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><CardTitle>{t("controlTower.queueTitle")}</CardTitle><p className="mt-1 text-sm text-muted-foreground">{t("controlTower.queueDescription")}</p></div><Badge variant={data.summary.critical > 0 ? "destructive" : "outline"}>{t("controlTower.criticalBadge", { count: data.summary.critical })}</Badge></div><div className="flex flex-wrap gap-2 pt-2"><select className="h-9 rounded-md border bg-background px-2 text-sm" value={severityFilter} onChange={(event) => setSeverityFilter(event.target.value)}><option value="all">{t("controlTower.filters.allSeverity")}</option><option value="critical">{t("status.severity.critical")}</option><option value="high">{t("status.severity.high")}</option><option value="watch">{t("status.severity.watch")}</option></select><select className="h-9 rounded-md border bg-background px-2 text-sm" value={kindFilter} onChange={(event) => setKindFilter(event.target.value)}><option value="all">{t("controlTower.filters.allTypes")}</option><option value="unassigned_order">{t("controlTower.exceptionTitles.unassigned_order")}</option><option value="sla_risk">{t("controlTower.exceptionTitles.sla_risk")}</option><option value="late_stop">{t("controlTower.exceptionTitles.late_stop")}</option><option value="fulfillment_blocked">{t("controlTower.exceptionTitles.fulfillment_blocked")}</option><option value="fleet_risk">{t("controlTower.exceptionTitles.fleet_risk")}</option><option value="congestion_risk">{t("controlTower.exceptionTitles.congestion_risk")}</option><option value="weather_risk">{t("controlTower.exceptionTitles.weather_risk")}</option><option value="incident_near_route">{t("controlTower.exceptionTitles.incident_near_route")}</option><option value="stale_traffic">{t("controlTower.exceptionTitles.stale_traffic")}</option><option value="stale_weather">{t("controlTower.exceptionTitles.stale_weather")}</option></select><select className="h-9 rounded-md border bg-background px-2 text-sm" value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)}><option value="all">{t("controlTower.filters.allSources")}</option>{sourceSystems.map((source) => <option key={source} value={source}>{source}</option>)}</select></div></CardHeader><CardContent className="space-y-3">{filteredExceptions.length === 0 ? <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">{t("controlTower.empty")}</div> : filteredExceptions.map((exception) => <div key={exception.id} className="rounded-lg border p-3"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="flex gap-3"><div className="mt-0.5 rounded-md bg-muted p-2 text-muted-foreground"><ExceptionIcon kind={exception.kind} /></div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="font-medium">{t(`controlTower.exceptionTitles.${exception.kind}`)}</span><Badge variant={severityVariant(exception.severity)}>{t(`status.severity.${exception.severity}`)}</Badge><Badge variant="outline">{exception.status === "ACKNOWLEDGED" ? t("controlTower.acknowledged") : t("controlTower.open")}</Badge></div><p className="mt-1 break-words text-sm text-muted-foreground">{exception.address ?? exception.vehicleName ?? "—"}</p><p className="mt-1 text-xs text-muted-foreground">{exception.reason}{exception.externalOrderId ? ` · ${exception.externalOrderId}` : ""}{exception.promisedAt ? ` · ${t("controlTower.promise", { time: formatDateTime(exception.promisedAt, locale) })}` : ""}</p><details className="mt-2 rounded-md bg-muted/50 p-2 text-xs"><summary className="cursor-pointer font-medium">Explain this decision</summary><div className="mt-2 space-y-1 text-muted-foreground"><p>Rule: {exception.reason}</p><p>Source: {exception.sourceSystem ?? "FLO operational rules"}</p><p>Detected: {formatDateTime(exception.detectedAt, locale)}</p><p>Status: {exception.status}</p></div></details></div></div><div className="flex flex-wrap items-center gap-2"><Button size="sm" variant="outline" render={<Link href={exceptionHref(exception)} />}><span>{t("controlTower.actions.open")}</span><ArrowUpRight className="ml-1 h-3.5 w-3.5" /></Button>{exception.status === "OPEN" && <Button size="sm" variant="secondary" onClick={() => void updateException(exception.id, "ACKNOWLEDGED")}>{t("controlTower.actions.acknowledge")}</Button>}<Button size="sm" variant="ghost" onClick={() => void updateException(exception.id, "RESOLVED")}>{t("controlTower.actions.resolve")}</Button></div></div></div>)}</CardContent></Card>
    <Card><CardHeader><CardTitle>{t("controlTower.policyTitle")}</CardTitle><p className="mt-1 text-sm text-muted-foreground">{t("controlTower.policyDescription")}</p></CardHeader><CardContent className="space-y-3 text-sm"><div className="rounded-lg bg-muted/60 p-3"><div className="font-medium">{t("controlTower.policyCritical")}</div><p className="mt-1 text-xs text-muted-foreground">{t("controlTower.policyCriticalDetail")}</p></div><div className="rounded-lg bg-muted/60 p-3"><div className="font-medium">{t("controlTower.policyHigh")}</div><p className="mt-1 text-xs text-muted-foreground">{t("controlTower.policyHighDetail")}</p></div><div className="rounded-lg bg-muted/60 p-3"><div className="font-medium">{t("controlTower.policyWatch")}</div><p className="mt-1 text-xs text-muted-foreground">{t("controlTower.policyWatchDetail")}</p></div><p className="pt-1 text-xs text-muted-foreground">{t("controlTower.generated", { time: formatDateTime(data.generatedAt, locale) })}</p></CardContent></Card></div>
    <Card><CardHeader><CardTitle>Recent audit activity</CardTitle><p className="mt-1 text-sm text-muted-foreground">Append-only evidence of ingestion and operator decisions.</p></CardHeader><CardContent className="space-y-2">{auditEvents.length === 0 ? <p className="text-sm text-muted-foreground">No audit events yet.</p> : auditEvents.map((event) => <details key={event.id} className="rounded-md border p-3 text-sm"><summary className="cursor-pointer"><span className="font-medium">{event.action}</span> · {event.summary} <span className="text-xs text-muted-foreground">· {formatDateTime(event.createdAt, locale)}</span></summary><div className="mt-2 space-y-1 text-xs text-muted-foreground"><p>Actor: {event.actor}{event.actorRole ? ` (${event.actorRole})` : ""}</p><p>Entity: {event.entityType} / {event.entityId}</p>{event.provider && <p>Provider: {event.provider}</p>}{event.reason && <p>Reason: {event.reason}</p>}</div></details>)}</CardContent></Card>
  </div>;
}
