import type { DesignerGraph } from "@/lib/designer/schema";

/**
 * The structured envelope the export LLM is expected to return. The summary
 * is rendered in the export detail sheet; the artifact is the raw text that
 * gets previewed and downloaded.
 */
export type ExportEnvelope = {
  summary: string;
  artifact: string;
};

export type ExportEnvelopeParseError = {
  ok: false;
  reason: "shape" | "empty";
  detail?: string;
};

export type ExportEnvelopeParseResult =
  | { ok: true; envelope: ExportEnvelope }
  | ExportEnvelopeParseError;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" && value !== null && !Array.isArray(value)
  );
}

/**
 * Validate that the model's reply is a `{ summary, artifact }` JSON object.
 * Both fields must be non-empty trimmed strings. Mirrors the shape of
 * `parseDesignerGraph` so the call site reads symmetrically.
 */
export function parseExportEnvelope(raw: unknown): ExportEnvelopeParseResult {
  if (!isPlainObject(raw)) {
    return { ok: false, reason: "shape", detail: "root is not an object" };
  }
  const summary =
    typeof raw.summary === "string" ? raw.summary.trim() : "";
  const artifact =
    typeof raw.artifact === "string" ? raw.artifact.trim() : "";
  if (!summary || !artifact) {
    return {
      ok: false,
      reason: "empty",
      detail: "summary and artifact must both be non-empty",
    };
  }
  return {
    ok: true,
    envelope: {
      summary: summary.slice(0, 600),
      artifact,
    },
  };
}

/**
 * Build a deterministic 1–2 sentence summary when the LLM fails to return a
 * structured envelope. Uses node + edge counts and the user's target so the
 * detail sheet still shows something useful.
 */
export function buildDeterministicSummary(input: {
  target: string;
  graph: DesignerGraph;
}): string {
  const { target, graph } = input;
  const n = graph.nodes.length;
  const e = graph.edges.length;
  const counts = graph.nodes.reduce<Record<string, number>>((acc, node) => {
    acc[node.kind] = (acc[node.kind] ?? 0) + 1;
    return acc;
  }, {});
  const kindList = Object.entries(counts)
    .map(([k, v]) => `${v} ${k}`)
    .join(", ");
  return `Exported a ${n}-node, ${e}-edge schema (${kindList}) as ${target}. Use the artifact below to drop into your stack.`;
}

/**
 * Serialize the designer graph into a deterministic, compact JSON string for
 * the LLM. Stable ordering means two retries with the same graph produce the
 * same input.
 */
export function serializeGraphForExport(graph: DesignerGraph): string {
  const nodes = [...graph.nodes]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((n) => ({
      id: n.id,
      label: n.label,
      kind: n.kind,
      summary: n.summary,
      bullets: n.bullets,
      lane: n.lane,
    }));
  const edges = [...graph.edges]
    .map((e) => ({ source: e.source, target: e.target, label: e.label ?? null }))
    .sort((a, b) => {
      const k = a.source.localeCompare(b.source);
      return k !== 0 ? k : a.target.localeCompare(b.target);
    });
  return JSON.stringify({ nodes, edges });
}

/**
 * Normalise a free-form export target string into something we can use for
 * the preview sheet's filename. Lowercases, replaces spaces with `-`, drops
 * anything outside a-z0-9 and `-`, trims leading/trailing dashes, and caps
 * the length at 48 chars.
 */
export function exportSlug(target: string): string {
  const cleaned = target
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return cleaned.slice(0, 48) || "export";
}

/** Pick a sensible filename extension for the download button. */
export function exportExtension(target: string): string {
  const lower = target.toLowerCase();
  if (/postgres|sql|ddl/.test(lower)) return "sql";
  if (/openapi[ -]?yaml|yaml\b|\byml\b/.test(lower)) return "yaml";
  if (/mermaid/.test(lower)) return "md";
  if (/\bjson\b/.test(lower)) return "json";
  if (/\bcsv\b/.test(lower)) return "csv";
  if (/markdown|\bmd\b/.test(lower)) return "md";
  if (/\bxml\b|drawio/.test(lower)) return "xml";
  return "txt";
}
