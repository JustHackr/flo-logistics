import { PROCESS_NODES } from "@/lib/process-map/graph";
import type { DesignerEdge, DesignerGraph } from "@/lib/designer/schema";

/**
 * Keyword mapping from a free-form generated node label/summary to one of
 * FLO's canonical process-map node ids. The first match wins. Substring
 * match is intentionally case-insensitive.
 *
 * FLO ids follow the pattern `input-*`, `proc-*`, `out-*` — see
 * `PROCESS_NODES` in src/lib/process-map/graph.ts.
 */
const KEYWORD_TO_FLO_NODE: Array<{ keywords: string[]; floId: string }> = [
  { keywords: ["order", "purchase", "cart", "checkout"], floId: "input-orders" },
  { keywords: ["payment", "billing", "invoice", "refund"], floId: "proc-cfi" },
  {
    keywords: ["ticket", "support", "complaint", "help"],
    floId: "proc-ai",
  },
  { keywords: ["knowledge", "faq", "article"], floId: "proc-chunking" },
  { keywords: ["agent", "assistant", "bot", "responder"], floId: "proc-ai" },
  { keywords: ["vehicle", "fleet", "truck", "van"], floId: "input-vehicles" },
  { keywords: ["driver", "courier", "rider", "dispatcher"], floId: "input-drivers" },
  {
    keywords: ["warehouse", "dock", "inventory", "stock"],
    floId: "input-connectors",
  },
  { keywords: ["camera", "sensor", "iot", "telemetry"], floId: "input-camera" },
  { keywords: ["fuel", "petrol", "energy"], floId: "input-fuel" },
  { keywords: ["traffic", "route", "navigation"], floId: "input-traffic" },
  { keywords: ["score", "risk", "predict", "estimate"], floId: "proc-vqi" },
  { keywords: ["optim", "plan", "schedule"], floId: "proc-optimizer" },
  { keywords: ["emit", "carbon", "co2"], floId: "proc-cfi" },
  { keywords: ["report", "kpi", "metric"], floId: "out-reports" },
  { keywords: ["maintenance", "service", "repair"], floId: "out-maintenance" },
  { keywords: ["delivery", "deliveries"], floId: "out-deliveries" },
  { keywords: ["cv", "vision", "image"], floId: "out-cv-reports" },
];

/** Return the FLO node id that best matches the given generated node, or null. */
function matchFloNode(label: string, summary: string): string | null {
  const haystack = `${label}\n${summary}`.toLowerCase();
  for (const { keywords, floId } of KEYWORD_TO_FLO_NODE) {
    if (keywords.some((kw) => haystack.includes(kw))) {
      return floId;
    }
  }
  return null;
}

export type IntegrateResult = {
  graph: DesignerGraph;
  /** True when at least one generated node was matched. */
  integrated: boolean;
  /** Generated node ids that were mapped to a FLO node. */
  mapped: string[];
};

/**
 * Annotate each generated node with the closest FLO node (if any) and append
 * virtual "integrated with" edges from the generated node to the FLO node.
 * The generated graph layout is untouched — only `edges` and the per-node
 * `_floId` annotation change.
 */
export function integrateWithFlo(graph: DesignerGraph): IntegrateResult {
  const floIds = new Set(PROCESS_NODES.map((n) => n.id));
  const integrated = graph.nodes.map((node) => {
    const floId = matchFloNode(node.label, node.summary);
    return { ...node, _floId: floId };
  });

  const edges: DesignerEdge[] = [...graph.edges];
  const mapped: string[] = [];

  for (const node of integrated) {
    if (node._floId && floIds.has(node._floId)) {
      mapped.push(node.id);
      // Dedupe edges in case the LLM already drew this one.
      const exists = edges.some(
        (e) => e.source === node.id && e.target === node._floId,
      );
      if (!exists) {
        edges.push({
          source: node.id,
          target: node._floId!,
          label: "integrated with",
        });
      }
    }
  }

  return {
    graph: { nodes: integrated, edges },
    integrated: mapped.length > 0,
    mapped,
  };
}
