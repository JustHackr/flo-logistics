"use client";

import * as React from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Loader2,
  Maximize2,
  Sparkles,
  Wand2,
  AlertTriangle,
  History as HistoryIcon,
  Plus,
  Download,
  Copy,
  Check,
  FileDown,
  Activity,
  ArrowRight,
  ArrowLeft,
  Trash2,
  Code2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/i18n/use-i18n";
import {
  DesignerNodeComponent,
  type DesignerFlowNode,
} from "@/components/admin/designer-node";
import {
  ExportCodeNodeComponent,
  type ExportCodeNode,
} from "@/components/admin/export-code-node";
import {
  exportDesignerAction,
  generateSchemaAction,
  type DesignerActionResult,
} from "@/app/actions/designer";
import type {
  DesignerGraph,
  DesignerNode,
  DesignerEdge,
} from "@/lib/designer/schema";
import { autoLayout } from "@/lib/process-map/layout";
import {
  summarizeIntegration,
  type DesignerNodeSummary,
} from "@/lib/designer/integrate";
import {
  exportExtension,
  exportSlug,
} from "@/lib/designer/export-format";

const NODE_TYPES = { designerNode: DesignerNodeComponent };
const EXPORT_NODE_TYPES = { exportCodeNode: ExportCodeNodeComponent };

type HistoryEntry = {
  prompt: string;
  at: number;
  integrated: boolean;
};

type ExportEntry = {
  /** Stable id so React Flow can key the canvas node. */
  id: string;
  /** Free-form target ("Postgres DDL", "Mermaid", ...). */
  target: string;
  /** AI-generated summary shown on the card and at the top of the sheet. */
  summary: string;
  /** The full artifact (DDL, Mermaid, ...). */
  content: string;
  /** When the export was produced (epoch ms). */
  at: number;
};

function layoutGraph(graph: DesignerGraph): {
  nodes: DesignerFlowNode[];
  edges: Edge[];
} {
  // Adapt the generated graph to the shared layout helper. Each node becomes a
  // "boxed" item keyed by (column=node.kind, lane=node.lane) and rendered at
  // 260x180 to match the wider card.
  const boxed = graph.nodes.map((node) => {
    const annotated = node as DesignerNode & { _floId?: string | null };
    return {
      id: node.id,
      lane: node.lane || "core",
      column: node.kind,
      width: 260,
      height: 200,
      _floId: annotated._floId ?? null,
      _label: node.label,
      _summary: node.summary,
      _bullets: node.bullets,
      _kind: node.kind,
    };
  });
  const placements = autoLayout(boxed, { defaultWidth: 260, defaultHeight: 200 });
  const placementById = new Map(placements.map((p) => [p.id, p]));

  const flowNodes: DesignerFlowNode[] = graph.nodes.map((node) => {
    const annotated = node as DesignerNode & { _floId?: string | null };
    const placement = placementById.get(node.id);
    return {
      id: node.id,
      type: "designerNode",
      position: placement
        ? { x: placement.x, y: placement.y }
        : { x: 40, y: 40 },
      data: {
        label: node.label,
        summary: node.summary,
        bullets: node.bullets,
        kind: node.kind,
        integrated: Boolean(annotated._floId),
        floId: annotated._floId ?? null,
        selected: false,
      },
    };
  });

  const edges: Edge[] = (graph.edges as DesignerEdge[]).map((e, i) => ({
    id: `e-${i}`,
    source: e.source,
    target: e.target,
    label: e.label,
    animated: true,
    type: "smoothstep",
    style: {
      stroke: e.label === "integrated with" ? "var(--primary)" : "#94a3b8",
      strokeOpacity: e.label === "integrated with" ? 0.7 : 0.5,
      strokeWidth: e.label === "integrated with" ? 1.8 : 1.2,
      strokeDasharray: e.label === "integrated with" ? undefined : "4 4",
    },
    labelStyle: {
      fill: "var(--muted-foreground)",
      fontSize: 10,
      fontFamily: "var(--font-geist-sans)",
    },
    labelBgStyle: { fill: "var(--card)", fillOpacity: 0.9 },
    labelBgPadding: [4, 2] as [number, number],
    labelBgBorderRadius: 4,
  }));

  return { nodes: flowNodes, edges };
}

function CanvasInner({
  graph,
  selectedId,
  onSelect,
}: {
  graph: DesignerGraph | null;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const { fitView } = useReactFlow();
  const { t } = useI18n();
  const layout = React.useMemo(
    () => (graph ? layoutGraph(graph) : { nodes: [], edges: [] }),
    [graph],
  );

  const nodes = React.useMemo<DesignerFlowNode[]>(() => {
    return layout.nodes.map((n) => ({
      ...n,
      data: { ...n.data, selected: n.id === selectedId },
    }));
  }, [layout.nodes, selectedId]);

  return (
    <div className="relative h-full">
      {graph === null && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 text-center">
          <Sparkles className="h-8 w-8 text-primary/60" />
          <p className="text-sm font-medium text-foreground">
            {t("designer.canvas.empty")}
          </p>
          <p className="max-w-xs text-xs text-muted-foreground">
            {t("designer.canvas.layoutHint")}
          </p>
        </div>
      )}
      <ReactFlow
        nodes={nodes}
        edges={layout.edges}
        nodeTypes={NODE_TYPES}
        onNodeClick={(_e, n) => onSelect(n.id)}
        onPaneClick={() => onSelect(null)}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        proOptions={{ hideAttribution: true }}
        nodesDraggable
        nodesConnectable={false}
        elementsSelectable
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
        <Controls position="bottom-right" showInteractive={false} />
        <div className="absolute right-3 top-3 z-10">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => fitView({ padding: 0.2, duration: 400 })}
          >
            <Maximize2 className="mr-1.5 h-3.5 w-3.5" />
            {t("processMap.fitView")}
          </Button>
        </div>
      </ReactFlow>
    </div>
  );
}

export function FloDesignerClient(): React.JSX.Element {
  const { t, locale } = useI18n();
  const [graph, setGraph] = React.useState<DesignerGraph | null>(null);
  const [prompt, setPrompt] = React.useState("");
  const [refine, setRefine] = React.useState("");
  const [exportTarget, setExportTarget] = React.useState("");
  const [history, setHistory] = React.useState<HistoryEntry[]>([]);
  const [pending, setPending] = React.useState(false);
  const [errorKey, setErrorKey] = React.useState<string | null>(null);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [exportHistory, setExportHistory] = React.useState<ExportEntry[]>([]);
  const [exportCallState, setExportCallState] = React.useState<ExportCallState>({
    kind: "idle",
  });
  /** Which export (if any) is open in the detail sheet. */
  const [viewingExportId, setViewingExportId] = React.useState<string | null>(
    null,
  );
  /** Per-export "copied" flag, keyed by export id. */
  const [copiedMap, setCopiedMap] = React.useState<Record<string, boolean>>({});

  const callDesigner = React.useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || pending) return;
      setPending(true);
      setErrorKey(null);
      try {
        const historyPayload = [
          ...history.map((h) => ({ role: "user" as const, content: h.prompt })),
        ];
        const result: DesignerActionResult = await generateSchemaAction({
          prompt: trimmed,
          history: historyPayload,
          locale: locale === "id" ? "id" : "en",
        });
        if (!result.ok) {
          setErrorKey(`designer.prompt.error${cap(result.code)}`);
          return;
        }
        setGraph(result.graph);
        // New graph = stale export history; reset it inline so the canvas
        // never shows artifacts that were generated against a previous schema.
        setExportHistory([]);
        setViewingExportId(null);
        setExportTarget("");
        setHistory((prev) => [
          { prompt: trimmed, at: Date.now(), integrated: result.integrated },
          ...prev,
        ].slice(0, 12));
        setPrompt("");
        setRefine("");
      } catch (error) {
        // Server-action transport failure (network drop, proxy timeout, 5xx).
        console.error("[designer] action failed", error);
        setErrorKey("designer.prompt.errorNetwork");
      } finally {
        setPending(false);
      }
    },
    [history, locale, pending],
  );

  const onGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    callDesigner(prompt);
  };
  const onRefine = (e: React.FormEvent) => {
    e.preventDefault();
    callDesigner(refine);
  };

  const callExport = React.useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || !graph || exportCallState.kind === "pending") return;
      setExportCallState({ kind: "pending" });
      try {
        const result = await exportDesignerAction({
          graph,
          target: trimmed,
          locale: locale === "id" ? "id" : "en",
        });
        if (!result.ok) {
          setExportCallState({ kind: "error", code: result.code });
          return;
        }
        const id = `export-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        setExportHistory((prev) =>
          [
            {
              id,
              target: result.target,
              summary: result.summary,
              content: result.content,
              at: Date.now(),
            },
            ...prev,
          ].slice(0, 12),
        );
        setViewingExportId(id);
        setExportCallState({ kind: "idle" });
        setExportTarget("");
      } catch (error) {
        console.error("[designer] export failed", error);
        setExportCallState({ kind: "error", code: "network" });
      }
    },
    [exportCallState.kind, graph, locale],
  );

  const onExport = (e: React.FormEvent) => {
    e.preventDefault();
    callExport(exportTarget);
  };

  const triggerDownload = React.useCallback((entry: ExportEntry) => {
    const blob = new Blob([entry.content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const today = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `flo-designer-${exportSlug(entry.target)}-${today}.${exportExtension(entry.target)}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  const triggerCopy = React.useCallback(async (entry: ExportEntry) => {
    try {
      await navigator.clipboard.writeText(entry.content);
      setCopiedMap((prev) => ({ ...prev, [entry.id]: true }));
      window.setTimeout(() => {
        setCopiedMap((prev) => ({ ...prev, [entry.id]: false }));
      }, 1500);
    } catch {
      /* clipboard blocked; user can still copy from the preview */
    }
  }, []);

  const closeExportSheet = React.useCallback(() => {
    setViewingExportId(null);
    setExportCallState({ kind: "idle" });
  }, []);

  // Reset export history when the underlying graph changes (new generate).
  // Done inline in the generate handler to avoid the lint rule against
  // setting state inside an effect.

  const clearHistory = React.useCallback(() => {
    if (typeof window !== "undefined" && !window.confirm(t("designer.history.confirm"))) {
      return;
    }
    setHistory([]);
  }, [t]);

  const viewingExport = React.useMemo(
    () => exportHistory.find((e) => e.id === viewingExportId) ?? null,
    [exportHistory, viewingExportId],
  );

  const selectedNode = React.useMemo(() => {
    if (!graph || !selectedId) return null;
    const node = graph.nodes.find((n) => n.id === selectedId);
    if (!node) return null;
    const annotated = node as DesignerNode & { _floId?: string | null };
    return {
      ...node,
      floId: annotated._floId ?? null,
    };
  }, [graph, selectedId]);

  const detailSummary = React.useMemo<DesignerNodeSummary | null>(() => {
    if (!graph || !selectedNode) return null;
    const nodesWithFlo = (graph.nodes as Array<DesignerNode & { _floId?: string | null }>).map(
      (n) => ({ id: n.id, label: n.label, _floId: n._floId ?? null }),
    );
    return summarizeIntegration({
      selectedId: selectedNode.id,
      nodes: nodesWithFlo,
      edges: graph.edges,
      floId: selectedNode.floId,
    });
  }, [graph, selectedNode]);

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-primary/30 text-primary">
            <Sparkles className="mr-1.5 h-3 w-3" />
            AI
          </Badge>
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("designer.title")}
          </h1>
        </div>
        <p className="max-w-3xl text-sm text-muted-foreground">
          {t("designer.subtitle")}
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_380px]">
        {/* Canvas column: visual canvas on top, export text canvas below */}
        <div className="flex min-h-[calc(100vh-12rem)] flex-col gap-4">
          <div className="min-h-[60vh] flex-1 overflow-hidden rounded-xl border border-border bg-card ring-1 ring-foreground/5">
            <ReactFlowProvider>
              <CanvasInner
                graph={graph}
                selectedId={selectedId}
                onSelect={setSelectedId}
              />
            </ReactFlowProvider>
          </div>
          <ExportCanvas
            entries={exportHistory}
            copiedMap={copiedMap}
            onSelect={setViewingExportId}
            onCopy={triggerCopy}
            onDownload={triggerDownload}
          />
        </div>

        {/* Prompt panel */}
        <aside className="flex min-h-0 flex-col gap-4">
          <form
            onSubmit={onGenerate}
            className="rounded-xl border border-border bg-card p-4 ring-1 ring-foreground/5"
          >
            <label
              htmlFor="designer-prompt"
              className="flex items-center gap-2 text-sm font-medium"
            >
              <Wand2 className="h-3.5 w-3.5 text-primary" />
              {t("designer.prompt.send")}
            </label>
            <textarea
              id="designer-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              placeholder={t("designer.prompt.placeholder")}
              disabled={pending}
              className={cn(
                "mt-2 w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm",
                "placeholder:text-muted-foreground/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                "disabled:opacity-60",
              )}
            />
            <div className="mt-3 flex items-center justify-between gap-2">
              <p className="text-[11px] text-muted-foreground">
                {pending
                  ? t("designer.prompt.thinking")
                  : errorKey
                    ? t(errorKey)
                    : ""}
              </p>
              <Button
                type="submit"
                size="sm"
                disabled={pending || prompt.trim().length === 0}
              >
                {pending ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                )}
                {t("designer.prompt.send")}
              </Button>
            </div>
          </form>

          {graph && (
            <form
              onSubmit={onRefine}
              className="rounded-xl border border-border bg-card p-4 ring-1 ring-foreground/5"
            >
              <label
                htmlFor="designer-refine"
                className="flex items-center gap-2 text-sm font-medium"
              >
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                {t("designer.prompt.refine")}
              </label>
              <textarea
                id="designer-refine"
                value={refine}
                onChange={(e) => setRefine(e.target.value)}
                rows={3}
                placeholder={t("designer.prompt.refinePlaceholder")}
                disabled={pending}
                className={cn(
                  "mt-2 w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm",
                  "placeholder:text-muted-foreground/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  "disabled:opacity-60",
                )}
              />
              <div className="mt-3 flex items-center justify-end gap-2">
                <Button
                  type="submit"
                  size="sm"
                  variant="outline"
                  disabled={pending || refine.trim().length === 0}
                >
                  {t("designer.prompt.refine")}
                </Button>
              </div>
            </form>
          )}

          {graph && (
            <form
              onSubmit={onExport}
              className="rounded-xl border border-border bg-card p-4 ring-1 ring-foreground/5"
            >
              <label
                htmlFor="designer-export"
                className="flex items-center gap-2 text-sm font-medium"
              >
                <Download className="h-3.5 w-3.5 text-primary" />
                {t("designer.export.label")}
              </label>
              <textarea
                id="designer-export"
                value={exportTarget}
                onChange={(e) => setExportTarget(e.target.value)}
                rows={2}
                placeholder={t("designer.export.placeholder")}
                disabled={exportCallState.kind === "pending"}
                className={cn(
                  "mt-2 w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm",
                  "placeholder:text-muted-foreground/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  "disabled:opacity-60",
                )}
              />
              <div className="mt-3 flex items-center justify-end gap-2">
                <Button
                  type="submit"
                  size="sm"
                  variant="outline"
                  disabled={
                    exportCallState.kind === "pending" ||
                    exportTarget.trim().length === 0
                  }
                >
                  {exportCallState.kind === "pending" ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Download className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  {t("designer.export.send")}
                </Button>
              </div>
            </form>
          )}

          {errorKey && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/[0.06] p-3 text-xs text-destructive"
            >
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{t(errorKey)}</span>
            </div>
          )}

          <section className="flex min-h-0 flex-1 flex-col rounded-xl border border-border bg-card p-4 ring-1 ring-foreground/5">
            <header className="flex items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <HistoryIcon className="h-3.5 w-3.5 text-muted-foreground" />
                {t("designer.history.title")}
                <span className="text-[10px] font-normal text-muted-foreground">
                  ({history.length})
                </span>
              </h3>
              {history.length > 0 && (
                <button
                  type="button"
                  onClick={clearHistory}
                  aria-label={t("designer.history.clear")}
                  title={t("designer.history.clear")}
                  className={cn(
                    "inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background text-muted-foreground",
                    "hover:border-destructive/40 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  )}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </header>
            <ul className="mt-3 flex-1 space-y-1.5 overflow-y-auto pr-1">
              {history.length === 0 && (
                <li className="text-xs text-muted-foreground">
                  {t("designer.history.empty")}
                </li>
              )}
              {history.map((h) => (
                <li key={`${h.at}-${h.prompt}`}>
                  <button
                    type="button"
                    onClick={() => setRefine(h.prompt)}
                    className={cn(
                      "w-full rounded-lg border border-border bg-background p-2 text-left text-[11px] leading-snug",
                      "hover:border-primary/40 hover:bg-primary/[0.03]",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    )}
                  >
                    <span className="block line-clamp-3">{h.prompt}</span>
                    {h.integrated && (
                      <span className="mt-1 inline-flex items-center gap-1 text-[9px] uppercase tracking-[0.12em] text-primary/80">
                        <Sparkles className="h-2.5 w-2.5" />
                        {t("designer.node.integrated")}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>

      {/* Node detail sheet */}
      <Sheet
        open={selectedNode !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null);
        }}
      >
        <SheetContent
          side="right"
          className="w-full overflow-y-auto sm:max-w-md"
        >
          <SheetHeader>
            <SheetTitle>{t("designer.detail.sheetTitle")}</SheetTitle>
            <SheetDescription>{t("designer.detail.noSelection")}</SheetDescription>
          </SheetHeader>
          <div className="mt-4">
            {selectedNode && detailSummary && (
              <NodeDetailBody selected={selectedNode} summary={detailSummary} />
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Export preview sheet */}
      <Sheet
        open={viewingExport !== null || exportCallState.kind === "error"}
        onOpenChange={(open) => {
          if (!open) closeExportSheet();
        }}
      >
        <SheetContent
          side="right"
          className="flex w-full flex-col overflow-hidden sm:max-w-2xl"
        >
          <SheetHeader>
            <SheetTitle>{t("designer.export.sheet.title")}</SheetTitle>
            {viewingExport && (
              <SheetDescription>
                {t("designer.export.sheet.target")}:{" "}
                <span className="font-mono">{viewingExport.target}</span>
              </SheetDescription>
            )}
          </SheetHeader>

          {exportCallState.kind === "error" && !viewingExport && (
            <div
              role="alert"
              className="mt-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/[0.06] p-3 text-xs text-destructive"
            >
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                {t(
                  `designer.export.error${exportErrorCap(exportCallState.code)}`,
                )}
              </span>
            </div>
          )}

          {viewingExport && (
            <>
              <section className="mt-3 rounded-lg border border-primary/20 bg-primary/[0.04] p-3">
                <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-primary/80">
                  {t("designer.export.detail.summary")}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-foreground/85">
                  {viewingExport.summary ||
                    t("designer.export.detail.noSummary")}
                </p>
              </section>
              <div className="mt-3 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    void triggerCopy(viewingExport);
                  }}
                >
                  {copiedMap[viewingExport.id] ? (
                    <Check className="mr-1.5 h-3.5 w-3.5" />
                  ) : (
                    <Copy className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  {copiedMap[viewingExport.id]
                    ? t("designer.export.sheet.copied")
                    : t("designer.export.sheet.copy")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => triggerDownload(viewingExport)}
                >
                  <Download className="mr-1.5 h-3.5 w-3.5" />
                  {t("designer.export.sheet.download")}
                </Button>
              </div>
              <pre className="mt-3 max-h-[calc(100vh-22rem)] flex-1 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-border bg-muted/30 p-3 font-mono text-[11px] leading-relaxed">
                {viewingExport.content}
              </pre>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

type ExportCallState =
  | { kind: "idle" }
  | { kind: "pending" }
  | { kind: "error"; code: DesignerExportErrorCode; message?: string };

type DesignerExportErrorCode =
  | "no-key"
  | "empty"
  | "parse"
  | "timeout"
  | "provider"
  | "unauthorized"
  | "network";

function DetailSection({
  title,
  items,
  icon,
}: {
  title: string;
  items: string[];
  icon: React.ReactNode;
}): React.JSX.Element | null {
  if (items.length === 0) return null;
  return (
    <section className="mt-3">
      <h5 className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-primary/80">
        {icon}
        {title}
      </h5>
      <ul className="mt-1.5 space-y-1 font-mono text-[11px] leading-relaxed text-foreground/85">
        {items.map((line, i) => (
          <li key={i} className="break-words">
            {line}
          </li>
        ))}
      </ul>
    </section>
  );
}

function ExportCanvas({
  entries,
  copiedMap,
  onSelect,
  onCopy,
  onDownload,
}: {
  entries: ExportEntry[];
  copiedMap: Record<string, boolean>;
  onSelect: (id: string) => void;
  onCopy: (entry: ExportEntry) => void | Promise<void>;
  onDownload: (entry: ExportEntry) => void;
}): React.JSX.Element {
  const { t } = useI18n();
  const today = new Date().toISOString().slice(0, 10);
  const flowNodes = React.useMemo<ExportCodeNode[]>(() => {
    if (entries.length === 0) return [];
    const Y_GAP = 24;
    const HEIGHT = 360;
    return entries.map((entry, i) => {
      const todaySlug = exportSlug(entry.target);
      const fileName = `flo-designer-${todaySlug}-${today}.${exportExtension(entry.target)}`;
      return {
        id: entry.id,
        type: "exportCodeNode",
        position: { x: 0, y: i * (HEIGHT + Y_GAP) },
        data: {
          target: entry.target,
          summary: entry.summary,
          content: entry.content,
          fileName,
          copied: Boolean(copiedMap[entry.id]),
          active: i === 0,
          onCopy: () => {
            void onCopy(entry);
          },
          onDownload: () => onDownload(entry),
        },
      };
    });
  }, [entries, copiedMap, onCopy, onDownload, today]);

  return (
    <div className="flex h-[40vh] min-h-[320px] flex-col overflow-hidden rounded-xl border border-border bg-card ring-1 ring-foreground/5">
      <header className="flex items-center justify-between gap-2 border-b border-border/60 bg-muted/40 px-3 py-2">
        <div className="flex items-center gap-2">
          <Code2 className="h-3.5 w-3.5 text-primary" />
          <h2 className="text-sm font-semibold">
            {t("designer.export.canvas.title")}
          </h2>
          <span className="text-[10px] text-muted-foreground">
            ({entries.length})
          </span>
        </div>
        {entries.length > 0 && (
          <p className="text-[10px] text-muted-foreground">
            {t("designer.export.canvas.hint")}
          </p>
        )}
      </header>

      <div className="relative flex-1">
        {entries.length === 0 ? (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 text-center">
            <Code2 className="h-7 w-7 text-muted-foreground/40" />
            <p className="text-sm font-medium text-muted-foreground">
              {t("designer.export.canvas.empty")}
            </p>
          </div>
        ) : (
          <ReactFlowProvider>
            <ExportCanvasInner
              nodes={flowNodes}
              onSelect={onSelect}
            />
          </ReactFlowProvider>
        )}
      </div>
    </div>
  );
}

function ExportCanvasInner({
  nodes,
  onSelect,
}: {
  nodes: ExportCodeNode[];
  onSelect: (id: string) => void;
}): React.JSX.Element {
  const { fitView } = useReactFlow();
  React.useEffect(() => {
    if (nodes.length === 0) return;
    // Fit after layout settles so the most recent card is always visible.
    const t = window.setTimeout(() => {
      fitView({ padding: 0.18, duration: 250 });
    }, 50);
    return () => window.clearTimeout(t);
  }, [nodes, fitView]);

  const renderedNodes = React.useMemo<ExportCodeNode[]>(
    () =>
      nodes.map((n) => ({
        ...n,
        data: { ...n.data, selected: false },
      })),
    [nodes],
  );

  return (
    <ReactFlow
      nodes={renderedNodes}
      edges={[]}
      nodeTypes={EXPORT_NODE_TYPES}
      onNodeClick={(_e, n) => onSelect(n.id)}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable
      proOptions={{ hideAttribution: true }}
      fitView
      fitViewOptions={{ padding: 0.18 }}
      minZoom={0.5}
      maxZoom={1.2}
      panOnDrag
    >
      <Background
        variant={BackgroundVariant.Dots}
        gap={16}
        size={1}
      />
      <Controls position="bottom-right" showInteractive={false} />
    </ReactFlow>
  );
}

function NodeDetailBody({
  selected,
  summary,
}: {
  selected: DesignerNode & { floId: string | null };
  summary: DesignerNodeSummary;
}): React.JSX.Element {
  const { t } = useI18n();
  const { incoming, outgoing, floTarget } = summary;

  const kindLabel = t(`designer.node.${selected.kind}`, {
    defaultValue: selected.kind,
  });

  return (
    <div className="flex flex-col gap-4">
      <section>
        <Badge variant="outline" className="border-primary/30 text-primary">
          {kindLabel}
        </Badge>
        <h3 className="mt-2 text-base font-semibold leading-tight">
          {selected.label}
        </h3>
        {selected.floId && (
          <p className="mt-0.5 font-mono text-[10px] text-muted-foreground/80">
            {t("designer.detail.floId")}: {selected.floId}
          </p>
        )}
      </section>

      <section>
        <h5 className="text-[10px] font-medium uppercase tracking-[0.14em] text-primary/80">
          {t("designer.detail.about")}
        </h5>
        <p className="mt-1.5 text-xs leading-relaxed text-foreground/85">
          {selected.summary || t("designer.detail.noSummary")}
        </p>
        {selected.bullets.length > 0 && (
          <>
            <h5 className="mt-3 text-[10px] font-medium uppercase tracking-[0.14em] text-primary/80">
              {t("designer.detail.responsibilities")}
            </h5>
            <ul className="mt-1.5 space-y-1">
              {selected.bullets.map((b, i) => (
                <li
                  key={i}
                  className="flex items-start gap-1.5 text-[11px] leading-snug text-foreground/85"
                >
                  <span
                    aria-hidden
                    className="mt-1.5 inline-block h-1 w-1 shrink-0 rounded-full bg-primary/70"
                  />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section>
        <h5 className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-primary/80">
          <Activity className="h-3 w-3" />
          {t("designer.detail.connectors")}
        </h5>
        {incoming.length + outgoing.length === 0 ? (
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            {t("designer.detail.noConnectors")}
          </p>
        ) : (
          <div className="mt-1.5 space-y-2">
            {incoming.map((e, i) => (
              <div
                key={`in-${i}`}
                className="flex items-start gap-1.5 rounded-md border border-border/60 bg-background px-2 py-1.5 text-[11px]"
              >
                <ArrowLeft className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground/85">
                    {e.otherLabel}
                  </p>
                  {e.label && (
                    <p className="text-[10px] text-muted-foreground">
                      {t("designer.detail.edge")}: {e.label}
                    </p>
                  )}
                </div>
              </div>
            ))}
            {outgoing.map((e, i) => (
              <div
                key={`out-${i}`}
                className="flex items-start gap-1.5 rounded-md border border-border/60 bg-background px-2 py-1.5 text-[11px]"
              >
                <ArrowRight className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground/85">
                    {e.otherLabel}
                  </p>
                  {e.label && (
                    <p className="text-[10px] text-muted-foreground">
                      {t("designer.detail.edge")}: {e.label}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h5 className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-primary/80">
          <Sparkles className="h-3 w-3" />
          {t("designer.detail.integration")}
        </h5>
        {floTarget ? (
          <div className="mt-1.5 rounded-lg border border-primary/20 bg-primary/[0.04] p-3">
            <p className="text-[11px] font-medium text-primary">
              {floTarget.titleKey} <span className="text-muted-foreground">·</span>{" "}
              <span className="font-mono">{floTarget.id}</span>
            </p>
            <DetailSection
              title={t("designer.detail.inputs")}
              items={floTarget.inputs}
              icon={<ArrowLeft className="h-3 w-3" />}
            />
            <DetailSection
              title={t("designer.detail.process")}
              items={floTarget.process}
              icon={<Activity className="h-3 w-3" />}
            />
            <DetailSection
              title={t("designer.detail.outputs")}
              items={floTarget.outputs}
              icon={<ArrowRight className="h-3 w-3" />}
            />
            <DetailSection
              title={t("designer.detail.sourceFiles")}
              items={floTarget.sourceFiles}
              icon={<FileDown className="h-3 w-3" />}
            />
            <DetailSection
              title={t("designer.detail.models")}
              items={floTarget.models ?? []}
              icon={<FileDown className="h-3 w-3" />}
            />
            <DetailSection
              title={t("designer.detail.apiRoutes")}
              items={floTarget.apiRoutes ?? []}
              icon={<FileDown className="h-3 w-3" />}
            />
            <DetailSection
              title={t("designer.detail.uiRoutes")}
              items={floTarget.uiRoutes ?? []}
              icon={<FileDown className="h-3 w-3" />}
            />
          </div>
        ) : (
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            {t("designer.detail.noIntegration")}
          </p>
        )}
      </section>
    </div>
  );
}

function cap(code: string): string {
  if (code === "no-key") return "NoKey";
  if (code === "parse") return "Parse";
  if (code === "shape") return "Shape";
  if (code === "empty") return "Empty";
  if (code === "timeout") return "Rate";
  if (code === "provider") return "Provider";
  if (code === "unauthorized") return "Unauthorized";
  return "Parse";
}

function exportErrorCap(code: DesignerExportErrorCode): string {
  if (code === "no-key") return "NoKey";
  if (code === "parse") return "Parse";
  if (code === "timeout") return "Rate";
  if (code === "provider") return "Provider";
  if (code === "unauthorized") return "Unauthorized";
  if (code === "network") return "Network";
  return "Parse";
}
