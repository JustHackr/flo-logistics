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

/**
 * The subset of a FLO process-map node shown in the Designer Detail sheet.
 * Kept narrow so the detail sheet never needs the heavy `ProcessNodeDef` (no
 * positions, no icon, no live stats — those are visualisation concerns).
 */
export type FloNodeContext = {
  id: string;
  titleKey: string;
  summaryKey: string;
  kind: "input" | "process" | "output" | "system" | undefined;
  inputs: string[];
  process: string[];
  outputs: string[];
  sourceFiles: string[];
  models: string[] | undefined;
  apiRoutes: string[] | undefined;
  uiRoutes: string[] | undefined;
};

/** Look up a FLO node by id, returning only the fields the detail sheet uses. */
export function getFloNodeContext(floId: string): FloNodeContext | null {
  const def = PROCESS_NODES.find((n) => n.id === floId);
  if (!def) return null;
  return {
    id: def.id,
    titleKey: def.titleKey,
    summaryKey: def.summaryKey,
    kind: def.kind,
    inputs: def.detail.inputs,
    process: def.detail.process,
    outputs: def.detail.outputs,
    sourceFiles: def.detail.sourceFiles,
    models: def.detail.models,
    apiRoutes: def.detail.apiRoutes,
    uiRoutes: def.detail.uiRoutes,
  };
}

export type DesignerNodeEdgeRef = {
  /** id of the node on the *other* end of the edge. */
  otherId: string;
  /** Label of the node on the *other* end. */
  otherLabel: string;
  /** "incoming" or "outgoing" relative to the selected node. */
  direction: "incoming" | "outgoing";
  /** Optional edge label from the graph. */
  label?: string;
};

export type DesignerNodeSummary = {
  /** Connected nodes: who calls this node and who this node calls. */
  incoming: DesignerNodeEdgeRef[];
  outgoing: DesignerNodeEdgeRef[];
  /** FLO integration target (if any) for the selected node. */
  floTarget: FloNodeContext | null;
};

/**
 * Resolve the connector + integration context for a single generated node,
 * given the full graph (post-`integrateWithFlo`). The summary is pure —
 * safe to call from server or client, and easy to unit test.
 *
 * Note: `integrateWithFlo` strips the per-node `_floId` from its public type
 * (only the canvas reads it), so callers must pass the `_floId` they want to
 * use directly. Here we accept it as a separate arg for the same reason.
 */
export function summarizeIntegration(input: {
  selectedId: string;
  nodes: ReadonlyArray<{
    id: string;
    label: string;
    // Optional `_floId` set by `integrateWithFlo`. We accept it loosely
    // because the public `DesignerNode` type does not expose it.
    _floId?: string | null;
  }>;
  edges: ReadonlyArray<{ source: string; target: string; label?: string }>;
  floId?: string | null;
}): DesignerNodeSummary {
  const labelById = new Map(input.nodes.map((n) => [n.id, n.label]));

  const incoming: DesignerNodeEdgeRef[] = [];
  const outgoing: DesignerNodeEdgeRef[] = [];
  for (const e of input.edges) {
    if (e.target === input.selectedId) {
      incoming.push({
        otherId: e.source,
        otherLabel: labelById.get(e.source) ?? e.source,
        direction: "incoming",
        label: e.label,
      });
    } else if (e.source === input.selectedId) {
      outgoing.push({
        otherId: e.target,
        otherLabel: labelById.get(e.target) ?? e.target,
        direction: "outgoing",
        label: e.label,
      });
    }
  }

  const floId = input.floId ?? null;
  const floTarget = floId ? getFloNodeContext(floId) : null;

  return { incoming, outgoing, floTarget };
}
