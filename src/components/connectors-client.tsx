"use client";

import { withBasePath } from "@/lib/base-path";
import { useEffect, useState } from "react";
import { ClipboardCheck, Download, Pencil, Plus, RefreshCw, Trash2, Upload, Wifi } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CONNECTOR_TYPE_REGISTRY } from "@/lib/connectors/registry";
import { connectorStatuses, connectorTypes, type ConnectorInput } from "@/lib/schemas/connector";
import { useI18n } from "@/components/i18n/use-i18n";
import type { Role } from "@/lib/auth/roles";

type ConnectorRecord = {
  id: string;
  name: string;
  type: string;
  status: string;
  config: string | null;
  description: string | null;
  _count?: { vehicles: number };
};

type IntegrationRun = {
  id: string;
  kind: string;
  mode: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  createdCount: number;
  updatedCount: number;
  rejectedCount: number;
  errorsJson: string | null;
};

type IntelligenceRegionConfig = {
  id: string;
  name: string;
  config: { enabled: boolean; refreshIntervalSec: number; providerPriority: string[]; thresholds: Record<string, number>; updatedAt: string } | null;
};

type ReconciliationIssue = {
  id: string;
  issueType: string;
  status: string;
  externalOrderId: string;
  omsStatus: string | null;
  wmsStatus: string | null;
  firstDetectedAt: string;
  lastDetectedAt: string;
  details: { message?: string };
};

const OMS_TEMPLATE = "externalOrderId,recipientAddress,lat,lng,accessRequirement,promisedAt,serviceLevel,priority\nBLI-ORDER-001,Jl. Sudirman Jakarta,-6.2252,106.8087,BOTH,2026-09-15T18:00:00+07:00,SAME_DAY,HIGH\n";
const WMS_TEMPLATE = "externalOrderId,externalEventId,status,occurredAt,warehouseCode,reason\nBLI-ORDER-001,WMS-EVENT-001,PACKED,2026-09-15T12:00:00+07:00,BLI-JKT-01,\n";

function downloadText(filename: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function formatRunDate(value: string) {
  return new Date(value).toLocaleString(undefined, { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export function ConnectorsClient({ initialConnectors, userRole }: { initialConnectors: ConnectorRecord[]; userRole: Role }) {
  const { t, locale } = useI18n();
  const [connectors, setConnectors] = useState(initialConnectors);
  const [runs, setRuns] = useState<Record<string, IntegrationRun[]>>({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ConnectorRecord | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<ConnectorInput>({ name: "", type: "iot", status: "disabled", config: "", description: "" });
  const [configFields, setConfigFields] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [intelligenceRegions, setIntelligenceRegions] = useState<IntelligenceRegionConfig[]>([]);
  const [savingIntelligence, setSavingIntelligence] = useState<string | null>(null);
  const [reconciliationIssues, setReconciliationIssues] = useState<ReconciliationIssue[]>([]);
  const [reconciliationLoading, setReconciliationLoading] = useState(false);
  const canConfigure = userRole === "ADMIN";

  useEffect(() => {
    void fetch(withBasePath("/api/intelligence/config"), { cache: "no-store" }).then(async (response) => {
      if (response.ok) setIntelligenceRegions((await response.json()).regions ?? []);
    }).catch(() => undefined);
  }, []);

  async function loadReconciliation() {
    const response = await fetch(withBasePath("/api/connectors/reconciliation?status=OPEN"), { cache: "no-store" });
    if (response.ok) setReconciliationIssues(((await response.json()).issues ?? []) as ReconciliationIssue[]);
  }

  useEffect(() => { const timer = window.setTimeout(() => void loadReconciliation(), 0); return () => window.clearTimeout(timer); }, []);

  async function scanReconciliation() {
    setReconciliationLoading(true); setError(null);
    try {
      const response = await fetch(withBasePath("/api/connectors/reconciliation"), { method: "POST" });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error ?? "Unable to scan OMS/WMS reconciliation");
      await loadReconciliation();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to scan OMS/WMS reconciliation"); }
    finally { setReconciliationLoading(false); }
  }

  async function resolveReconciliation(issueId: string) {
    const response = await fetch(withBasePath(`/api/connectors/reconciliation/${issueId}`), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ note: "Reviewed in FLO connector console." }) });
    if (response.ok) setReconciliationIssues((current) => current.filter((issue) => issue.id !== issueId));
  }

  async function saveIntelligenceRegion(region: IntelligenceRegionConfig) {
    if (!region.config) return;
    setSavingIntelligence(region.id); setError(null);
    try {
      const response = await fetch(withBasePath(`/api/intelligence/config?regionId=${encodeURIComponent(region.id)}`), { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(region.config) });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error ?? "Unable to save intelligence settings");
      setIntelligenceRegions((current) => current.map((item) => item.id === region.id ? { ...item, config: body.config } : item));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to save intelligence settings"); }
    finally { setSavingIntelligence(null); }
  }

  function openCreate() {
    setEditing(null);
    setForm({ name: "", type: "iot", status: "disabled", config: "", description: "" });
    setConfigFields({});
    setDialogOpen(true);
  }

  function openEdit(connector: ConnectorRecord) {
    setEditing(connector);
    setForm({ name: connector.name, type: connector.type as ConnectorInput["type"], status: connector.status as ConnectorInput["status"], config: connector.config ?? "", description: connector.description ?? "" });
    try { setConfigFields(connector.config ? JSON.parse(connector.config) : {}); } catch { setConfigFields({}); }
    setDialogOpen(true);
  }

  async function handleSave() {
    setLoading(true); setError(null);
    const payload: ConnectorInput = { ...form, config: JSON.stringify(configFields), description: form.description || null };
    const response = await fetch(editing ? `/api/connectors/${editing.id}` : "/api/connectors", { method: editing ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (!response.ok) { const body = await response.json(); setError(body.error ?? t("errors.requestFailed")); setLoading(false); return; }
    const saved = await response.json();
    if (editing) setConnectors((prev) => prev.map((connector) => connector.id === saved.id ? { ...saved, _count: connector._count } : connector));
    else setConnectors((prev) => [...prev, { ...saved, _count: { vehicles: 0 } }]);
    setLoading(false); setDialogOpen(false);
  }

  async function handleDelete() {
    if (!deleteId) return;
    const response = await fetch(withBasePath(`/api/connectors/${deleteId}`), { method: "DELETE" });
    if (response.ok) setConnectors((prev) => prev.filter((connector) => connector.id !== deleteId));
    setDeleteId(null);
  }

  async function loadRuns(connectorId: string) {
    const response = await fetch(withBasePath(`/api/connectors/${connectorId}/runs`));
    if (response.ok) {
      const body = await response.json();
      setRuns((prev) => ({ ...prev, [connectorId]: body }));
    }
  }

  async function syncConnector(connector: ConnectorRecord, fixture: "oms-orders" | "wms-events", file?: File) {
    setSyncing(connector.id); setError(null);
    const response = file
      ? await fetch(withBasePath(`/api/connectors/${connector.id}/sync`), { method: "POST", body: (() => { const formData = new FormData(); formData.append("file", file); return formData; })() })
      : await fetch(withBasePath(`/api/connectors/${connector.id}/sync`), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fixture }) });
    const body = await response.json();
    if (!response.ok) setError(body.error ?? t("errors.requestFailed"));
    await loadRuns(connector.id);
    setSyncing(null);
  }

  function statusVariant(status: string) {
    return status === "active" ? "default" as const : status === "planned" ? "secondary" as const : "outline" as const;
  }

  return (
    <div lang={locale} className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div><h2 className="text-2xl font-bold tracking-tight">{t("system.connectors.title")}</h2><p className="text-muted-foreground">{t("system.connectors.description")}</p></div>
        {canConfigure && <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />{t("system.connectors.addConnector")}</Button>}
      </div>
      {intelligenceRegions.length > 0 && <Card>
      <CardHeader><CardTitle className="text-base">Traffic, weather & incident intelligence</CardTitle><CardDescription>Admin-controlled regions, providers, refresh policy, and predictive SLA thresholds. Provider keys stay server-side in environment variables.</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          {intelligenceRegions.map((region) => region.config && <div key={region.id} className="grid gap-3 rounded-lg border p-3 md:grid-cols-[1fr_auto_auto_auto] md:items-center">
            <div><div className="font-medium">{region.name}</div>{canConfigure ? <Input className="mt-2 max-w-sm" aria-label={`${region.name} provider priority`} value={region.config.providerPriority.join(", ")} onChange={(event) => setIntelligenceRegions((current) => current.map((item) => item.id === region.id && item.config ? { ...item, config: { ...item.config, providerPriority: event.target.value.split(",").map((value) => value.trim()).filter(Boolean) } } : item))} /> : <div className="text-xs text-muted-foreground">Priority: {region.config.providerPriority.join(" → ")}</div>}<div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">{canConfigure ? <><label className="flex items-center gap-1">Watch <Input className="h-7 w-16" type="number" min="0" max="100" value={region.config.thresholds.slaRiskWatchScore ?? 35} onChange={(event) => setIntelligenceRegions((current) => current.map((item) => item.id === region.id && item.config ? { ...item, config: { ...item.config, thresholds: { ...item.config.thresholds, slaRiskWatchScore: Number(event.target.value) } } } : item))} /></label><label className="flex items-center gap-1">High <Input className="h-7 w-16" type="number" min="0" max="100" value={region.config.thresholds.slaRiskHighScore ?? 60} onChange={(event) => setIntelligenceRegions((current) => current.map((item) => item.id === region.id && item.config ? { ...item, config: { ...item.config, thresholds: { ...item.config.thresholds, slaRiskHighScore: Number(event.target.value) } } } : item))} /></label><label className="flex items-center gap-1">Critical <Input className="h-7 w-16" type="number" min="0" max="100" value={region.config.thresholds.slaRiskCriticalScore ?? 80} onChange={(event) => setIntelligenceRegions((current) => current.map((item) => item.id === region.id && item.config ? { ...item, config: { ...item.config, thresholds: { ...item.config.thresholds, slaRiskCriticalScore: Number(event.target.value) } } } : item))} /></label></> : <span>Risk thresholds: {region.config.thresholds.slaRiskWatchScore ?? 35} / {region.config.thresholds.slaRiskHighScore ?? 60} / {region.config.thresholds.slaRiskCriticalScore ?? 80}</span>}</div></div>
            {canConfigure ? <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={region.config.enabled} onChange={(event) => setIntelligenceRegions((current) => current.map((item) => item.id === region.id && item.config ? { ...item, config: { ...item.config, enabled: event.target.checked } } : item))} />Enabled</label> : <Badge variant={region.config.enabled ? "outline" : "secondary"}>{region.config.enabled ? "Enabled" : "Disabled"}</Badge>}
            {canConfigure ? <label className="flex items-center gap-2 text-sm">Refresh <Input className="w-24" type="number" min={60} value={region.config.refreshIntervalSec} onChange={(event) => setIntelligenceRegions((current) => current.map((item) => item.id === region.id && item.config ? { ...item, config: { ...item.config, refreshIntervalSec: Number(event.target.value) || 300 } } : item))} /> sec</label> : <span className="text-xs text-muted-foreground">Every {region.config.refreshIntervalSec}s</span>}
            {canConfigure && <Button size="sm" onClick={() => void saveIntelligenceRegion(region)} disabled={savingIntelligence === region.id}>{savingIntelligence === region.id ? "Saving…" : "Save"}</Button>}
          </div>)}
        </CardContent>
      </Card>}
      <Card>
        <CardHeader><div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><div><CardTitle className="text-base">OMS/WMS reconciliation</CardTitle><CardDescription>Checks Blibli order and warehouse feeds for missing, duplicated, stale, or conflicting state.</CardDescription></div><Button size="sm" variant="outline" onClick={() => void scanReconciliation()} disabled={reconciliationLoading}><ClipboardCheck className="mr-2 h-4 w-4" />{reconciliationLoading ? "Scanning…" : "Scan now"}</Button></div></CardHeader>
        <CardContent>{reconciliationIssues.length === 0 ? <p className="text-sm text-muted-foreground">No open reconciliation issues.</p> : <div className="space-y-2">{reconciliationIssues.slice(0, 8).map((issue) => <div key={issue.id} className="flex flex-col gap-2 rounded-lg border p-3 text-sm sm:flex-row sm:items-center sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><Badge variant="destructive">{issue.issueType.replaceAll("_", " ")}</Badge><span className="font-medium">{issue.externalOrderId}</span></div><p className="mt-1 text-xs text-muted-foreground">{issue.details.message ?? "Feed state needs operator review."}{issue.omsStatus ? ` OMS: ${issue.omsStatus}.` : ""}{issue.wmsStatus ? ` WMS: ${issue.wmsStatus}.` : ""}</p></div><Button size="sm" variant="ghost" onClick={() => void resolveReconciliation(issue.id)}>Resolve</Button></div>)}</div>}</CardContent>
      </Card>
      {error && <div className="rounded-md border border-destructive/30 p-3 text-sm text-destructive">{error}</div>}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {connectors.map((connector) => {
          const meta = CONNECTOR_TYPE_REGISTRY[connector.type as keyof typeof CONNECTOR_TYPE_REGISTRY];
          const isDemoConnector = connector.type === "oms" || connector.type === "wms";
          const fixture = connector.type === "oms" ? "oms-orders" : "wms-events";
          const connectorRuns = runs[connector.id] ?? [];
          return (
            <Card key={connector.id}>
              <CardHeader><div className="flex items-start justify-between gap-2"><div><CardTitle className="text-base">{connector.name}</CardTitle><CardDescription>{meta?.label ?? connector.type}</CardDescription></div><Badge variant={statusVariant(connector.status)} className="capitalize">{t(`system.connectors.status.${connector.status}`)}</Badge></div></CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{connector.description ?? meta?.description}</p>
                <p className="text-xs text-muted-foreground">{t("system.connectors.linkedVehicles", { count: connector._count?.vehicles ?? 0 })}</p>
                {isDemoConnector ? (
                  <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
                    <p className="text-xs font-medium">{t("system.connectors.demoSync")}</p>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" disabled={syncing === connector.id} onClick={() => void syncConnector(connector, fixture)}><RefreshCw className={cn("mr-1 h-3 w-3", syncing === connector.id && "animate-spin")} />{t("system.connectors.runSample")}</Button>
                      <label className={cn(buttonVariants({ size: "sm", variant: "outline" }), "cursor-pointer")}><Upload className="mr-1 h-3 w-3" />{t("system.connectors.upload") }<input className="hidden" type="file" accept=".csv,.json" onChange={(event) => { const file = event.target.files?.[0]; if (file) void syncConnector(connector, fixture, file); event.currentTarget.value = ""; }} /></label>
                      <Button size="sm" variant="ghost" onClick={() => downloadText(`${connector.type}-template.csv`, connector.type === "oms" ? OMS_TEMPLATE : WMS_TEMPLATE)}><Download className="mr-1 h-3 w-3" />{t("system.connectors.template")}</Button>
                    </div>
                    {connectorRuns.length > 0 && <div className="space-y-1 text-xs text-muted-foreground"><p className="font-medium text-foreground">{t("system.connectors.lastRuns")}</p>{connectorRuns.slice(0, 3).map((run) => { let errors: Array<{ row: number; error: string }> = []; try { errors = run.errorsJson ? JSON.parse(run.errorsJson) : []; } catch { errors = []; } return <div key={run.id} className="space-y-1"><div className="flex justify-between gap-2"><span>{formatRunDate(run.startedAt)} · {run.status}</span><span>+{run.createdCount} ↻{run.updatedCount} !{run.rejectedCount}</span></div>{errors.length > 0 && <details><summary className="cursor-pointer text-destructive">{t("system.connectors.showRejected", { count: errors.length })}</summary><ul className="mt-1 list-inside list-disc">{errors.slice(0, 3).map((item, index) => <li key={`${run.id}-${index}`}>{t("system.connectors.rowError", { row: item.row, error: item.error })}</li>)}</ul></details>}</div>; })}</div>}
                    {connectorRuns.length === 0 && <button className="text-xs text-muted-foreground underline" onClick={() => void loadRuns(connector.id)}>{t("system.connectors.loadRuns")}</button>}
                  </div>
                ) : (
                  <Tooltip><TooltipTrigger className={cn(buttonVariants({ size: "sm", variant: "outline" }), "pointer-events-none opacity-50")} disabled><Wifi className="mr-1 h-3 w-3" />{t("system.connectors.test")}</TooltipTrigger><TooltipContent>{t("system.connectors.futureTooltip")}</TooltipContent></Tooltip>
                )}
                {canConfigure && <div className="flex gap-2"><Button size="sm" variant="ghost" onClick={() => openEdit(connector)}><Pencil className="h-3 w-3" /></Button><Button size="sm" variant="ghost" onClick={() => setDeleteId(connector.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button></div>}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogContent className="max-w-lg"><DialogHeader><DialogTitle>{editing ? t("system.connectors.editConnector") : t("system.connectors.addConnector")}</DialogTitle></DialogHeader><div className="grid gap-4 py-2">
        <div className="space-y-2"><Label htmlFor="connector-name">{t("common.name")}</Label><Input id="connector-name" value={form.name} onChange={(e) => setForm((value) => ({ ...value, name: e.target.value }))} /></div>
        <div className="space-y-2"><Label>{t("system.connectors.type")}</Label><Select value={form.type} onValueChange={(value) => { const type = (value ?? "iot") as ConnectorInput["type"]; setForm((current) => ({ ...current, type })); setConfigFields({}); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{connectorTypes.map((type) => <SelectItem key={type} value={type}>{CONNECTOR_TYPE_REGISTRY[type].label}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-2"><Label>{t("common.status")}</Label><Select value={form.status} onValueChange={(value) => setForm((current) => ({ ...current, status: (value ?? "disabled") as ConnectorInput["status"] }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{connectorStatuses.map((status) => <SelectItem key={status} value={status}>{t(`system.connectors.status.${status}`)}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-2"><Label htmlFor="connector-desc">{t("common.description")}</Label><Textarea id="connector-desc" value={form.description ?? ""} onChange={(e) => setForm((value) => ({ ...value, description: e.target.value }))} /></div>
        {CONNECTOR_TYPE_REGISTRY[form.type]?.configFields.map((field) => <div key={field.key} className="space-y-2"><Label htmlFor={field.key}>{field.label}</Label><Input id={field.key} type={field.type === "password" ? "password" : field.type === "number" ? "number" : "text"} placeholder={field.placeholder} value={configFields[field.key] ?? ""} onChange={(e) => setConfigFields((prev) => ({ ...prev, [field.key]: e.target.value }))} /></div>)}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div><DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>{t("common.cancel")}</Button><Button onClick={() => void handleSave()} disabled={loading}>{loading ? t("system.connectors.saving") : t("common.save")}</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}><DialogContent><DialogHeader><DialogTitle>{t("system.connectors.deleteConnector")}</DialogTitle></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setDeleteId(null)}>{t("common.cancel")}</Button><Button variant="destructive" onClick={() => void handleDelete()}>{t("common.delete")}</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
}
