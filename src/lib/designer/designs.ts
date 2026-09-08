/**
 * Persist / hydrate Flo Designer graphs for Saved Designs CRUD.
 *
 * Unlike `parseDesignerGraph` (LLM output), stored graphs may include
 * per-node `_floId` annotations and "integrated with" edges whose targets
 * are FLO process-map ids (not present in `nodes`).
 */

import type {
  DesignerEdge,
  DesignerGraph,
  DesignerNode,
  DesignerNodeKind,
} from "@/lib/designer/schema";

const ALLOWED_KINDS: DesignerNodeKind[] = [
  "input",
  "process",
  "output",
  "system",
];

export type StoredDesignerNode = DesignerNode & {
  _floId?: string | null;
};

export type StoredDesignerGraph = {
  nodes: StoredDesignerNode[];
  edges: DesignerEdge[];
};

export type StoredGraphParseError = {
  ok: false;
  reason: "shape" | "empty" | "duplicate-id" | "unknown-kind" | "edge-source-missing";
  detail?: string;
};

export type StoredGraphParseResult =
  | { ok: true; graph: StoredDesignerGraph }
  | StoredGraphParseError;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Serialize the in-memory canvas graph for SQLite storage. */
export function serializeStoredDesignerGraph(graph: DesignerGraph): string {
  const nodes = graph.nodes.map((n) => {
    const annotated = n as StoredDesignerNode;
    return {
      id: annotated.id,
      label: annotated.label,
      kind: annotated.kind,
      summary: annotated.summary,
      bullets: annotated.bullets,
      lane: annotated.lane,
      ...(annotated._floId !== undefined
        ? { _floId: annotated._floId }
        : {}),
    };
  });
  const edges = graph.edges.map((e) => ({
    source: e.source,
    target: e.target,
    ...(e.label ? { label: e.label } : {}),
  }));
  return JSON.stringify({ nodes, edges });
}

/**
 * Parse a previously saved design graph. Preserves `_floId` and allows edge
 * targets outside the generated node set (FLO integration stubs).
 */
export function parseStoredDesignerGraph(raw: unknown): StoredGraphParseResult {
  if (!isPlainObject(raw)) {
    return { ok: false, reason: "shape", detail: "root is not an object" };
  }
  const nodesRaw = raw.nodes;
  const edgesRaw = raw.edges;
  if (!Array.isArray(nodesRaw) || !Array.isArray(edgesRaw)) {
    return { ok: false, reason: "shape", detail: "nodes/edges missing" };
  }

  const nodes: StoredDesignerNode[] = [];
  const ids = new Set<string>();

  for (let i = 0; i < nodesRaw.length; i += 1) {
    const item = nodesRaw[i];
    if (!isPlainObject(item)) {
      return {
        ok: false,
        reason: "shape",
        detail: `nodes[${i}] is not an object`,
      };
    }
    const id = typeof item.id === "string" ? item.id.trim() : "";
    const label = typeof item.label === "string" ? item.label.trim() : "";
    const kindRaw = typeof item.kind === "string" ? item.kind : "";
    const summary =
      typeof item.summary === "string" ? item.summary.trim() : "";
    const lane = typeof item.lane === "string" ? item.lane.trim() : "core";
    const bullets = Array.isArray(item.bullets)
      ? item.bullets
          .map((b) => (typeof b === "string" ? b.trim() : ""))
          .filter((b) => b.length > 0)
          .slice(0, 6)
      : [];

    if (!id || !label) {
      return {
        ok: false,
        reason: "shape",
        detail: `nodes[${i}] missing id or label`,
      };
    }
    if (ids.has(id)) {
      return {
        ok: false,
        reason: "duplicate-id",
        detail: `nodes[${i}].id=${id}`,
      };
    }
    if (!ALLOWED_KINDS.includes(kindRaw as DesignerNodeKind)) {
      return {
        ok: false,
        reason: "unknown-kind",
        detail: `nodes[${i}].kind=${kindRaw}`,
      };
    }

    let floId: string | null | undefined;
    if (item._floId === null) {
      floId = null;
    } else if (typeof item._floId === "string") {
      floId = item._floId.trim() || null;
    }

    ids.add(id);
    nodes.push({
      id,
      label,
      kind: kindRaw as DesignerNodeKind,
      summary,
      bullets,
      lane,
      ...(floId !== undefined ? { _floId: floId } : {}),
    });
  }

  if (nodes.length === 0) {
    return { ok: false, reason: "empty" };
  }

  const edges: DesignerEdge[] = [];
  for (let i = 0; i < edgesRaw.length; i += 1) {
    const item = edgesRaw[i];
    if (!isPlainObject(item)) {
      return {
        ok: false,
        reason: "shape",
        detail: `edges[${i}] is not an object`,
      };
    }
    const source = typeof item.source === "string" ? item.source : "";
    const target = typeof item.target === "string" ? item.target : "";
    if (!source || !target) {
      return {
        ok: false,
        reason: "shape",
        detail: `edges[${i}] missing source/target`,
      };
    }
    // Source must be a generated node; target may be a FLO stub id.
    if (!ids.has(source)) {
      return {
        ok: false,
        reason: "edge-source-missing",
        detail: `edges[${i}] -> ${source}->${target}`,
      };
    }
    if (source === target) {
      continue;
    }
    const label =
      typeof item.label === "string" && item.label.trim().length > 0
        ? item.label.trim()
        : undefined;
    edges.push(label ? { source, target, label } : { source, target });
  }

  return { ok: true, graph: { nodes, edges } };
}

/** Parse graphJson string from the database. */
export function parseStoredDesignerGraphJson(
  graphJson: string,
): StoredGraphParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(graphJson) as unknown;
  } catch {
    return { ok: false, reason: "shape", detail: "invalid JSON" };
  }
  return parseStoredDesignerGraph(raw);
}
