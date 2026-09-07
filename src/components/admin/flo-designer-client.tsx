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
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/i18n/use-i18n";
import {
  DesignerNodeComponent,
  type DesignerFlowNode,
} from "@/components/admin/designer-node";
import {
  generateSchemaAction,
  type DesignerActionResult,
} from "@/app/actions/designer";
import type {
  DesignerGraph,
  DesignerNode,
  DesignerEdge,
} from "@/lib/designer/schema";
import { autoLayout } from "@/lib/process-map/layout";

const NODE_TYPES = { designerNode: DesignerNodeComponent };

type HistoryEntry = {
  prompt: string;
  at: number;
  integrated: boolean;
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
  const [history, setHistory] = React.useState<HistoryEntry[]>([]);
  const [pending, setPending] = React.useState(false);
  const [errorKey, setErrorKey] = React.useState<string | null>(null);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

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

      <div className="grid h-[calc(100vh-12rem)] grid-cols-1 gap-4 lg:grid-cols-[1fr_380px]">
        {/* Canvas */}
        <div className="overflow-hidden rounded-xl border border-border bg-card ring-1 ring-foreground/5">
          <ReactFlowProvider>
            <CanvasInner
              graph={graph}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          </ReactFlowProvider>
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
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <HistoryIcon className="h-3.5 w-3.5 text-muted-foreground" />
              {t("designer.history.title")}
            </h3>
            <ul className="mt-3 flex-1 space-y-1.5 overflow-y-auto pr-1">
              {history.length === 0 && (
                <li className="text-xs text-muted-foreground">
                  {t("designer.history.empty")}
                </li>
              )}
              {history.map((h, i) => (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => setRefine(h.prompt)}
                    className={cn(
                      "w-full rounded-lg border border-border bg-background p-2 text-left text-[11px] leading-snug",
                      "hover:border-primary/40 hover:bg-primary/[0.03]",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    )}
                  >
                    <span className="block line-clamp-2">{h.prompt}</span>
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
