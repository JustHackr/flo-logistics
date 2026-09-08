import "server-only";

import { callOpenAiCompatibleChat } from "@/lib/ai-llm";
import { getAiProviderSettings } from "@/lib/ai-provider-store";
import type { Locale } from "@/lib/i18n/config";
import type { DesignerGraph } from "@/lib/designer/schema";
import {
  serializeGraphForExport,
  buildDeterministicSummary,
  type ExportEnvelopeParseError,
  type ExportEnvelope,
  parseExportEnvelope,
} from "@/lib/designer/export-format";

export const EXPORT_SYSTEM_PROMPT = `You are FLO Designer's export module.

The user gives a free-form export target ("Postgres DDL", "Mermaid flowchart",
"OpenAPI 3.1 YAML", "as a CSV of edges", "as a Markdown table", ...). You receive
a JSON process graph with nodes (id, label, kind, summary, bullets, lane) and
edges (source, target, label).

Return ONLY a single JSON object with two string keys:

{
  "summary": "Two or three short sentences describing what was generated, who the audience is, and the key shape of the artifact.",
  "artifact": "The full requested artifact goes here. Preserve every node and edge. For SQL DDL emit CREATE TABLE per node and an edges join table. For Mermaid use flowchart LR. For OpenAPI 3.1 emit one path per node with one operation per outgoing edge."
}

Rules:
- Do NOT wrap the response in markdown fences. The response itself is the JSON object.
- Be precise with identifiers. Prefer snake_case for SQL/DDL, kebab-case for Mermaid/OpenAPI.
- Do not invent URLs, code paths, env names, or proprietary system names.
- Output language matches the user's request. The summary can be in the same locale as the user prompt when obvious.`;

export type DesignerExportOk = {
  ok: true;
  /** What the user asked for, trimmed. */
  target: string;
  /** The serialized artifact as a single string. */
  content: string;
  /** AI-generated short summary (or deterministic fallback). */
  summary: string;
};

export type DesignerExportError = {
  ok: false;
  code: "no-key" | "empty" | "timeout" | "provider" | "parse";
  message: string;
};

export type DesignerExportResult = DesignerExportOk | DesignerExportError;

export async function exportDesignerGraph(input: {
  graph: DesignerGraph;
  target: string;
  locale?: Locale;
}): Promise<DesignerExportResult> {
  const settings = getAiProviderSettings();
  if (!settings) {
    return {
      ok: false,
      code: "no-key",
      message:
        "Connect an LLM API key in AI Settings first (set AI_ALLOW_EXTERNAL=true, AI_API_KEY, AI_BASE_URL, AI_MODEL).",
    };
  }

  const target = input.target.trim();
  if (!target) {
    return { ok: false, code: "empty", message: "Export target is empty." };
  }

  const payload = serializeGraphForExport(input.graph);
  const userMessage = [
    `EXPORT TARGET: ${target}`,
    "",
    "PROCESS GRAPH (JSON, authoritative; do not modify or invent):",
    payload,
  ].join("\n");

  let reply = "";
  try {
    reply = await callOpenAiCompatibleChat({
      settings,
      // Same persona swap as the generator: bypass the logistics-assistant's
      // "decline off-topic" rule so any export format is allowed.
      systemPrompt: EXPORT_SYSTEM_PROMPT,
      userMessage,
      companyContext: "",
      locale: input.locale ?? "en",
      // Exports are large (SQL DDL for an 18-node graph is ~150 lines; Mermaid
      // for the same graph is ~30). 3000 leaves headroom for thinking models.
      maxTokens: 3000,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/timeout|abort/i.test(message)) {
      return { ok: false, code: "timeout", message };
    }
    return { ok: false, code: "provider", message };
  }

  const trimmedReply = reply
    .replace(/^```(?:[a-zA-Z0-9_-]+)?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();

  if (!trimmedReply) {
    return {
      ok: false,
      code: "parse",
      message: "The model returned an empty export. Try a more specific target.",
    };
  }

  // First, try to parse the structured { summary, artifact } envelope. The
  // model is instructed to return JSON; we run `parseExportEnvelope` and fall
  // back to the raw reply + a deterministic summary if it does not comply.
  const parsed = parseExportEnvelopeFromText(trimmedReply);
  if (parsed) {
    return {
      ok: true,
      target,
      content: parsed.artifact,
      summary: parsed.summary,
    };
  }

  // Fallback: treat the whole reply as the artifact and synthesize a summary.
  return {
    ok: true,
    target,
    content: trimmedReply,
    summary: buildDeterministicSummary({ target, graph: input.graph }),
  };
}

/**
 * Try to extract a `{ summary, artifact }` object from a possibly noisy LLM
 * reply. Returns null when the reply is clearly not JSON (then the caller
 * falls back to treating the whole thing as the artifact).
 */
function parseExportEnvelopeFromText(text: string): ExportEnvelope | null {
  // Look for a JSON object on the first balanced { ... }.
  const start = text.indexOf("{");
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < text.length; i += 1) {
    const ch = text[i];
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
        const slice = text.slice(start, i + 1);
        try {
          const obj = JSON.parse(slice);
          const parsed = parseExportEnvelope(obj);
          return parsed.ok ? parsed.envelope : null;
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}
