"use client";

import * as React from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  useReactFlow,
  type Node,
  type Edge,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Truck,
  Package,
  Fuel,
  Route as RouteIcon,
  Brain,
  Calculator,
  Wrench,
  Camera,
  Activity,
  User,
  Workflow,
  Warehouse,
  Plug,
  Sparkles,
  Maximize2,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/i18n/use-i18n";
import { cn } from "@/lib/utils";
import {
  PROCESS_EDGES,
  PROCESS_NODES,
  type ProcessNodeDef,
  type LiveStats,
  type NodeKind,
} from "@/lib/process-map/graph";
import { autoLayout } from "@/lib/process-map/layout";

type FlowNodeData = {
  def: ProcessNodeDef;
  liveStat?: string;
  title: string;
  summary: string;
  selected?: boolean;
};

const NODE_ICONS: Record<ProcessNodeDef["icon"], LucideIcon> = {
  Truck,
  Package,
  Fuel,
  Route: RouteIcon,
  Brain,
  Calculator,
  Wrench,
  Camera,
  Activity,
  User,
  Workflow,
  Warehouse,
  Plug,
  Sparkles,
};

const KIND_STYLES: Record<NodeKind, string> = {
  input: "border-l-primary/40 bg-card ring-1 ring-foreground/10",
  process: "border-l-primary bg-card ring-1 ring-foreground/10",
  output: "border-l-primary/70 bg-card ring-1 ring-foreground/10",
};

const KIND_LABELS: Record<NodeKind, string> = {
  input: "processMap.legend.input",
  process: "processMap.legend.process",
  output: "processMap.legend.output",
};

function ProcessNode({ data }: NodeProps<Node<FlowNodeData>>) {
  const { def, liveStat, title, summary, selected } = data;
  const Icon = NODE_ICONS[def.icon];
  const kindLabel = KIND_LABELS[def.kind];

  return (
    <div
      className={cn(
        "group relative w-[240px] rounded-xl border border-border/80 border-l-[3px] bg-card p-3 shadow-sm transition-shadow",
        KIND_STYLES[def.kind],
        selected && "ring-2 ring-primary ring-offset-2 ring-offset-background",
        "hover:shadow-md",
      )}
    >
      <Handle type="target" position={Position.Left} className="!h-2 !w-2 !border-2 !border-primary !bg-background" />
      <Handle type="source" position={Position.Right} className="!h-2 !w-2 !border-2 !border-primary !bg-background" />

      <div className="flex items-start gap-2">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
          aria-hidden
        >
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-xs font-semibold tracking-tight">
              {title}
            </span>
            <span className="shrink-0 text-[9px] font-medium uppercase tracking-[0.14em] text-primary/80">
              {kindLabel}
            </span>
          </div>
          <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-muted-foreground">
            {summary}
          </p>
        </div>
      </div>
      {liveStat && (
        <div className="mt-2 rounded-md border border-primary/20 bg-primary/[0.04] px-2 py-1">
          <span className="block text-[9px] font-medium uppercase tracking-[0.12em] text-primary/70">
            LIVE
          </span>
          <span className="block font-mono text-[11px] leading-tight text-foreground/90">
            {liveStat}
          </span>
        </div>
      )}
    </div>
  );
}

const NODE_TYPES = { process: ProcessNode } as const;

function buildInitialGraph(
  live: LiveStats,
  titles: Record<string, { title: string; summary: string }>,
): { nodes: Node<FlowNodeData>[]; edges: Edge[] } {
  // Pass every ProcessNodeDef through the shared layout helper. Each def has
  // a hand-curated `position` from `src/lib/process-map/graph.ts`, which the
  // helper preserves. This keeps the visualization in lockstep with the
  // designer and centralises future layout tweaks in one place.
  const placements = autoLayout(PROCESS_NODES);
  const placementById = new Map(placements.map((p) => [p.id, p]));
  const nodes: Node<FlowNodeData>[] = PROCESS_NODES.map((def) => ({
    id: def.id,
    type: "process",
    position: placementById.get(def.id) ?? def.position,
    data: {
      def,
      title: titles[def.id]?.title ?? def.titleKey,
      summary: titles[def.id]?.summary ?? def.summaryKey,
      liveStat: def.detail.liveStatKey
        ? live[def.detail.liveStatKey]
        : undefined,
    },
  }));
  const edges: Edge[] = PROCESS_EDGES.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: e.label,
    animated: true,
    type: "smoothstep",
    style: { stroke: "var(--primary)", strokeOpacity: 0.55, strokeWidth: 1.5 },
    labelStyle: {
      fill: "var(--muted-foreground)",
      fontSize: 10,
      fontFamily: "var(--font-geist-sans)",
    },
    labelBgStyle: { fill: "var(--card)", fillOpacity: 0.9 },
    labelBgPadding: [4, 2] as [number, number],
    labelBgBorderRadius: 4,
  }));
  return { nodes, edges };
}

function ProcessMapInner({
  titles,
  live,
}: {
  titles: Record<string, { title: string; summary: string }>;
  live: LiveStats;
}) {
  const { t } = useI18n();
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const { fitView } = useReactFlow();
  const initial = React.useMemo(() => buildInitialGraph(live, titles), [
    live,
    titles,
  ]);
  const [nodes, setNodes, onNodesChange] = useNodesState(initial.nodes);

  // When live stats / titles refresh, update node data but keep drag positions.
  React.useEffect(() => {
    setNodes((prev) => {
      const posById = new Map(prev.map((n) => [n.id, n.position]));
      return initial.nodes.map((n) => ({
        ...n,
        position: posById.get(n.id) ?? n.position,
      }));
    });
  }, [initial.nodes, setNodes]);

  const displayedNodes = React.useMemo(
    () =>
      nodes.map((n) => ({
        ...n,
        data: { ...n.data, selected: n.id === selectedId },
      })),
    [nodes, selectedId],
  );

  const onNodeClick = React.useCallback(
    (_evt: React.MouseEvent, node: Node<FlowNodeData>) => {
      setSelectedId(node.id);
    },
    [],
  );

  const selected = React.useMemo(
    () => PROCESS_NODES.find((n) => n.id === selectedId) ?? null,
    [selectedId],
  );

  return (
    <div className="grid h-[calc(100vh-9rem)] grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
      <div className="relative overflow-hidden rounded-xl border border-border bg-card ring-1 ring-foreground/5">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="outline" className="border-primary/30 text-primary">
              FLO
            </Badge>
            <span className="text-sm font-semibold tracking-tight">
              {t("processMap.title")}
            </span>
            <span className="hidden text-xs text-muted-foreground md:inline">
              {t("processMap.subtitle")}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Legend />
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => fitView({ padding: 0.15, duration: 400 })}
            >
              <Maximize2 className="mr-1.5 h-3.5 w-3.5" />
              {t("processMap.fitView")}
            </Button>
          </div>
        </div>
        <ReactFlow
          nodes={displayedNodes}
          edges={initial.edges}
          nodeTypes={NODE_TYPES}
          onNodesChange={onNodesChange}
          onNodeClick={onNodeClick}
          onPaneClick={() => setSelectedId(null)}
          fitView
          fitViewOptions={{ padding: 0.18 }}
          proOptions={{ hideAttribution: true }}
          nodesDraggable
          nodesConnectable={false}
          elementsSelectable
          minZoom={0.4}
          maxZoom={1.4}
          defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1}
            color="var(--muted-foreground)"
          />
          <Controls
            showInteractive={false}
            className="[&_button]:!border-border [&_button]:!bg-card [&_button]:!text-foreground [&_button:hover]:!bg-muted"
          />
          <MiniMap
            pannable
            zoomable
            maskColor="oklch(0.96 0.015 245 / 0.6)"
            nodeColor={() => "var(--primary)"}
            nodeStrokeWidth={2}
            style={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 12,
            }}
          />
        </ReactFlow>
      </div>

      <DetailPane selected={selected} live={live} titles={titles} />
    </div>
  );
}

function Legend() {
  return (
    <div className="hidden items-center gap-2 text-[11px] text-muted-foreground md:flex">
      <LegendChip variant="input" />
      <LegendChip variant="process" />
      <LegendChip variant="output" />
    </div>
  );
}

function LegendChip({ variant }: { variant: NodeKind }) {
  const { t } = useI18n();
  return (
    <span className="inline-flex items-center gap-1">
      <span
        aria-hidden
        className={cn(
          "inline-block h-2 w-2 rounded-sm",
          variant === "input" && "bg-primary/40",
          variant === "process" && "bg-primary",
          variant === "output" && "bg-primary/70",
        )}
      />
      {t(KIND_LABELS[variant])}
    </span>
  );
}

function DetailPane({
  selected,
  live,
  titles,
}: {
  selected: ProcessNodeDef | null;
  live: LiveStats;
  titles: Record<string, { title: string; summary: string }>;
}) {
  const { t } = useI18n();
  return (
    <aside className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-card ring-1 ring-foreground/5">
      {selected ? (
        <NodeDetail
          def={selected}
          live={live}
          title={titles[selected.id]?.title ?? labelForKey(selected.titleKey)}
          summary={
            titles[selected.id]?.summary ?? labelForKey(selected.summaryKey)
          }
        />
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
          <Workflow className="h-7 w-7 text-muted-foreground/40" aria-hidden />
          <p className="text-sm text-muted-foreground">
            {t("processMap.noNodeSelected")}
          </p>
        </div>
      )}
    </aside>
  );
}

function NodeDetail({
  def,
  live,
  title,
  summary,
}: {
  def: ProcessNodeDef;
  live: LiveStats;
  title: string;
  summary: string;
}) {
  const Icon = NODE_ICONS[def.icon];
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-border px-5 py-4">
        <div className="flex items-start gap-3">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
            aria-hidden
          >
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-primary/80">
              {labelForKind(def.kind)}
            </p>
            <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {summary}
            </p>
          </div>
        </div>
        {def.detail.liveStatKey && (
          <div className="mt-3 rounded-lg border border-primary/20 bg-primary/[0.04] px-3 py-2">
            <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-primary/80">
              live
            </p>
            <p className="mt-0.5 font-mono text-xs leading-tight">
              {live[def.detail.liveStatKey]}
            </p>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        <DetailSection
          title="Inputs"
          items={def.detail.inputs}
          icon={<Package className="h-3.5 w-3.5" />}
        />
        <DetailSection
          title="Process"
          items={def.detail.process}
          icon={<Workflow className="h-3.5 w-3.5" />}
        />
        <DetailSection
          title="Outputs"
          items={def.detail.outputs}
          icon={<Activity className="h-3.5 w-3.5" />}
        />
        <CodeSection def={def} />
      </div>
    </div>
  );
}

function DetailSection({
  title,
  items,
  icon,
}: {
  title: string;
  items: string[];
  icon: React.ReactNode;
}) {
  return (
    <section className="mb-5">
      <h4 className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {icon}
        {title}
      </h4>
      <ul className="space-y-1.5 text-sm leading-relaxed text-foreground/90">
        {items.map((line, i) => (
          <li key={i} className="flex gap-2">
            <span
              aria-hidden
              className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60"
            />
            <span>{line}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function CodeSection({ def }: { def: ProcessNodeDef }) {
  return (
    <section className="mb-5 rounded-lg bg-muted/40 p-3 ring-1 ring-foreground/5">
      <h4 className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        <Wrench className="h-3.5 w-3.5" />
        Code references
      </h4>
      <ul className="space-y-1 font-mono text-[11px] leading-relaxed text-foreground/85">
        {def.detail.sourceFiles.map((file) => (
          <li key={file} className="break-all">
            {file}
          </li>
        ))}
        {def.detail.models && (
          <li className="pt-2 text-muted-foreground">
            models: {def.detail.models.join(", ")}
          </li>
        )}
        {def.detail.apiRoutes && (
          <li className="text-muted-foreground">
            api: {def.detail.apiRoutes.join(", ")}
          </li>
        )}
        {def.detail.uiRoutes && (
          <li className="text-muted-foreground">
            ui: {def.detail.uiRoutes.join(", ")}
          </li>
        )}
      </ul>
    </section>
  );
}

function labelForKind(kind: NodeKind): string {
  switch (kind) {
    case "input":
      return "Input";
    case "process":
      return "Process";
    case "output":
      return "Output";
  }
}

function labelForKey(key: string): string {
  // graph.ts stores bare keys like "orders", "optimizer".
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

export function ProcessMapClient({
  live,
}: {
  live: LiveStats;
}) {
  // titles/summaries are static in graph.ts — no per-locale dictionary for the
  // graph nodes themselves yet, so use the keyed labels verbatim.
  const titles = React.useMemo(() => {
    return Object.fromEntries(
      PROCESS_NODES.map((n) => [
        n.id,
        {
          title: labelForKey(n.titleKey),
          summary: labelForKey(n.summaryKey),
        },
      ]),
    ) as Record<string, { title: string; summary: string }>;
  }, []);

  return (
    <ReactFlowProvider>
      <ProcessMapInner titles={titles} live={live} />
    </ReactFlowProvider>
  );
}
