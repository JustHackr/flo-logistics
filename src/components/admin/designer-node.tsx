"use client";

import * as React from "react";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { Sparkles, Workflow, Cpu } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/i18n/use-i18n";

export type DesignerNodeKind = "input" | "process" | "output" | "system";

export type DesignerNodeData = {
  label: string;
  summary: string;
  bullets: string[];
  kind: DesignerNodeKind;
  /** True if at least one FLO integration edge was drawn from this node. */
  integrated: boolean;
  /** FLO node id this generated node was matched to (if any). */
  floId?: string | null;
  selected?: boolean;
  /** True when this node was added or newly integrated on the latest Apply. */
  isNew?: boolean;
  [key: string]: unknown;
};

export type DesignerFlowNode = Node<DesignerNodeData, "designerNode">;

const KIND_RING: Record<DesignerNodeKind, string> = {
  input: "ring-primary/40",
  process: "ring-primary",
  output: "ring-primary/70",
  system: "ring-muted-foreground/40",
};

const KIND_BG: Record<DesignerNodeKind, string> = {
  input: "bg-card",
  process: "bg-card",
  output: "bg-card",
  system: "bg-card",
};

const KIND_LABEL: Record<DesignerNodeKind, string> = {
  input: "Input",
  process: "Process",
  output: "Output",
  system: "System",
};

const KIND_ICON: Record<DesignerNodeKind, React.ComponentType<{ className?: string }>> = {
  input: Sparkles,
  process: Workflow,
  output: Cpu,
  system: Workflow,
};

export function DesignerNodeComponent(
  props: NodeProps<DesignerFlowNode>,
): React.JSX.Element {
  const { t } = useI18n();
  const { data, selected } = props;
  const Icon = KIND_ICON[data.kind] ?? Workflow;

  return (
    <div
      className={cn(
        "group w-[260px] rounded-xl border p-3 shadow-sm transition-all",
        data.isNew
          ? "border-amber-500/70 bg-amber-50/90 ring-2 ring-amber-400/50"
          : cn(
              "border-border",
              KIND_BG[data.kind],
              "ring-2",
              data.integrated ? KIND_RING[data.kind] : "ring-transparent",
            ),
        selected && "outline outline-2 outline-primary/70",
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!h-2.5 !w-2.5 !border-2 !border-card !bg-primary"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!h-2.5 !w-2.5 !border-2 !border-card !bg-primary"
      />

      <div className="flex items-start gap-2">
        <span
          aria-hidden
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
            data.kind === "input" && "bg-primary/10 text-primary",
            data.kind === "process" && "bg-primary/15 text-primary",
            data.kind === "output" && "bg-primary/[0.08] text-primary",
            data.kind === "system" && "bg-muted text-muted-foreground",
          )}
        >
          <Icon className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-1.5">
            <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-primary/80">
              {KIND_LABEL[data.kind]}
            </p>
            {data.isNew && (
              <Badge
                variant="outline"
                className="border-amber-500/50 bg-amber-100/80 text-[9px] text-amber-800"
              >
                {t("designer.node.new")}
              </Badge>
            )}
          </div>
          <h4 className="truncate text-sm font-semibold leading-tight">
            {data.label}
          </h4>
        </div>
      </div>

      {data.summary && (
        <p className="mt-2 line-clamp-3 text-[11px] leading-snug text-muted-foreground">
          {data.summary}
        </p>
      )}

      {data.bullets.length > 0 && (
        <ul className="mt-2 space-y-0.5">
          {data.bullets.slice(0, 3).map((b, i) => (
            <li
              key={i}
              className="flex items-start gap-1.5 text-[11px] leading-snug text-foreground/80"
            >
              <span
                aria-hidden
                className="mt-1 inline-block h-1 w-1 shrink-0 rounded-full bg-primary/70"
              />
              <span className="line-clamp-1">{b}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex items-center justify-between gap-2">
        <Badge
          variant="outline"
          className={cn(
            "text-[9px]",
            data.integrated
              ? "border-primary/30 text-primary"
              : "border-muted-foreground/30 text-muted-foreground",
          )}
        >
          {data.integrated
            ? t("designer.node.integrated")
            : t("designer.node.generated")}
        </Badge>
        {data.floId && (
          <span className="font-mono text-[9px] text-muted-foreground/70">
            → {data.floId}
          </span>
        )}
      </div>
    </div>
  );
}
