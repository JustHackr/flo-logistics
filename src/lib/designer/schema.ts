/**
 * Schema + validator for the Flo Designer LLM output.
 *
 * The model is instructed to return strict JSON that conforms to this shape.
 * The validator is intentionally a hand-rolled guard (no `zod` runtime dep) so
 * the lib stays tiny and easy to read.
 */

export type DesignerNodeKind =
  | "input"
  | "process"
  | "output"
  | "system";

export type DesignerNode = {
  id: string;
  label: string;
  kind: DesignerNodeKind;
  summary: string;
  bullets: string[];
  lane: string;
};

export type DesignerEdge = {
  source: string;
  target: string;
  label?: string;
};

export type DesignerGraph = {
  nodes: DesignerNode[];
  edges: DesignerEdge[];
};

export type DesignerValidationError = {
  ok: false;
  reason:
    | "shape"
    | "empty"
    | "duplicate-id"
    | "unknown-kind"
    | "edge-target-missing"
    | "self-loop";
  detail?: string;
};

export type DesignerValidationOk = {
  ok: true;
  graph: DesignerGraph;
};

export type DesignerValidationResult =
  | DesignerValidationOk
  | DesignerValidationError;

const ALLOWED_KINDS: DesignerNodeKind[] = [
  "input",
  "process",
  "output",
  "system",
];

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" && value !== null && !Array.isArray(value)
  );
}

export function parseDesignerGraph(raw: unknown): DesignerValidationResult {
  if (!isPlainObject(raw)) {
    return { ok: false, reason: "shape", detail: "root is not an object" };
  }
  const nodesRaw = raw.nodes;
  const edgesRaw = raw.edges;
  if (!Array.isArray(nodesRaw) || !Array.isArray(edgesRaw)) {
    return { ok: false, reason: "shape", detail: "nodes/edges missing" };
  }

  const nodes: DesignerNode[] = [];
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

    ids.add(id);
    nodes.push({
      id,
      label,
      kind: kindRaw as DesignerNodeKind,
      summary,
      bullets,
      lane,
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
    if (!ids.has(source) || !ids.has(target)) {
      return {
        ok: false,
        reason: "edge-target-missing",
        detail: `edges[${i}] -> ${source}->${target}`,
      };
    }
    if (source === target) {
      return {
        ok: false,
        reason: "self-loop",
        detail: `edges[${i}]`,
      };
    }
    const label =
      typeof item.label === "string" && item.label.trim().length > 0
        ? item.label.trim().slice(0, 60)
        : undefined;
    edges.push({ source, target, label });
  }

  return { ok: true, graph: { nodes, edges } };
}

/**
 * Best-effort JSON extraction for chat models that occasionally wrap JSON in
 * ```json fences or add prose around the object. Falls back to null.
 */
export function extractJsonObject(text: string): unknown | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  // Strip ```json fences if present.
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fence ? fence[1].trim() : trimmed;

  // First, try parsing the whole thing.
  try {
    return JSON.parse(candidate);
  } catch {
    // Fall back to scanning for the first balanced { ... } block.
    const start = candidate.indexOf("{");
    if (start < 0) return null;
    let depth = 0;
    let inString = false;
    let escape = false;
    for (let i = start; i < candidate.length; i += 1) {
      const ch = candidate[i];
      if (escape) {
        escape = false;
        continue;
      }
      if (inString) {
        if (ch === "\\") escape = true;
        else if (ch === '"') inString = false;
        continue;
      }
      if (ch === '"') {
        inString = true;
        continue;
      }
      if (ch === "{") depth += 1;
      else if (ch === "}") {
        depth -= 1;
        if (depth === 0) {
          const slice = candidate.slice(start, i + 1);
          try {
            return JSON.parse(slice);
          } catch {
            return null;
          }
        }
      }
    }
    return null;
  }
}
