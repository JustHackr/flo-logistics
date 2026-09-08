import "server-only";

import type { Locale } from "@/lib/i18n/config";
import type { DesignerGraph } from "@/lib/designer/schema";
import {
  serializeGraphForExport,
  buildDeterministicSummary,
} from "@/lib/designer/export-format";

export const JSON_EXPORT_TARGET = "JSON";

export type DesignerExportOk = {
  ok: true;
  /** Always "JSON". */
  target: string;
  /** Pretty-printed graph JSON. */
  content: string;
  /** Short description of node/edge counts. */
  summary: string;
};

export type DesignerExportError = {
  ok: false;
  code: "no-key" | "empty" | "timeout" | "provider" | "parse";
  message: string;
};

export type DesignerExportResult = DesignerExportOk | DesignerExportError;

/**
 * Flo Designer only exports JSON. The artifact is the graph itself
 * (pretty-printed), not an LLM rewrite into SQL/Mermaid/etc.
 */
export async function exportDesignerGraph(input: {
  graph: DesignerGraph;
  target?: string;
  locale?: Locale;
}): Promise<DesignerExportResult> {
  void input.target;
  void input.locale;

  if (!input.graph.nodes.length) {
    return { ok: false, code: "empty", message: "Graph is empty." };
  }

  const compact = serializeGraphForExport(input.graph);
  const content = JSON.stringify(JSON.parse(compact) as unknown, null, 2);

  return {
    ok: true,
    target: JSON_EXPORT_TARGET,
    content,
    summary: buildDeterministicSummary({
      target: JSON_EXPORT_TARGET,
      graph: input.graph,
    }),
  };
}
