"use client";

import * as React from "react";
import { type NodeProps, type Node } from "@xyflow/react";
import { Code2, Copy, Check, Download, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export type ExportCodeNodeData = {
  /** Always JSON. */
  target: string;
  /** AI-generated summary, capped at ~3 lines on the card. */
  summary: string;
  /** The full artifact (used by the detail sheet; we preview it here). */
  content: string;
  /** Filename suggested when downloading the artifact. */
  fileName: string;
  /** Callback that copies the artifact to the clipboard. */
  onCopy: (() => void) | null;
  /** Callback that downloads the artifact as a file. */
  onDownload: (() => void) | null;
  /** Whether the Copy action was just triggered (flips the icon briefly). */
  copied?: boolean;
  /** Whether this card is the most recent export (subtle primary ring). */
  active?: boolean;
  /** Internal: which entry in the history list this card represents. */
  index?: number;
};

export type ExportCodeNode = Node<ExportCodeNodeData, "exportCodeNode">;

const PREVIEW_LIMIT = 480;

function previewLines(content: string): string {
  const trimmed = content.trim();
  if (trimmed.length <= PREVIEW_LIMIT) return trimmed;
  return `${trimmed.slice(0, PREVIEW_LIMIT)}\n…`;
}

/**
 * A single export rendered as a code-card node on the export text canvas.
 * Click the card body to open the detail sheet; the Copy/Download icons
 * stop propagation so they fire their action without opening the sheet.
 */
export function ExportCodeNodeComponent(
  props: NodeProps<ExportCodeNode>,
): React.JSX.Element {
  const { data, selected } = props;
  const handleIconClick = React.useCallback(
    (action: (() => void) | null) => (e: React.MouseEvent) => {
      e.stopPropagation();
      action?.();
    },
    [],
  );

  return (
    <div
      className={cn(
        "group w-[760px] overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all",
        "ring-2",
        data.active ? "ring-primary/60" : "ring-transparent",
        selected && "outline outline-2 outline-primary/70",
      )}
    >
      <header className="flex items-center gap-2 border-b border-border/60 bg-muted/40 px-3 py-2">
        <span
          aria-hidden
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
        >
          <Code2 className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-primary/80">
            {data.target}
          </p>
          <p className="truncate font-mono text-[10px] text-muted-foreground/80">
            {data.fileName}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Copy export"
            onClick={handleIconClick(data.onCopy)}
            disabled={!data.onCopy}
            className={cn(
              "inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background text-muted-foreground",
              "hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              "disabled:opacity-40",
            )}
          >
            {data.copied ? (
              <Check className="h-3.5 w-3.5 text-primary" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </button>
          <button
            type="button"
            aria-label="Download export"
            onClick={handleIconClick(data.onDownload)}
            disabled={!data.onDownload}
            className={cn(
              "inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background text-muted-foreground",
              "hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              "disabled:opacity-40",
            )}
          >
            <Download className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      {data.summary && (
        <p className="border-b border-border/60 px-3 py-2 text-[11px] leading-snug text-foreground/85">
          <Sparkles className="mr-1.5 inline-block h-3 w-3 text-primary/70" />
          {data.summary}
        </p>
      )}

      <pre className="max-h-[280px] overflow-hidden whitespace-pre-wrap break-words bg-background px-3 py-2 font-mono text-[11px] leading-relaxed text-foreground/90">
        {previewLines(data.content)}
      </pre>
    </div>
  );
}
