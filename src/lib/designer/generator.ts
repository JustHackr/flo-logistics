import "server-only";

import { callOpenAiCompatibleChat } from "@/lib/ai-llm";
import { getAiProviderSettings } from "@/lib/ai-provider-store";
import type { Locale } from "@/lib/i18n/config";
import {
  extractJsonObject,
  parseDesignerGraph,
  type DesignerGraph,
  type DesignerValidationError,
} from "@/lib/designer/schema";
import { integrateWithFlo } from "@/lib/designer/integrate";

export const DESIGNER_SYSTEM_PROMPT = `You are FLO Designer, a senior solutions architect who specialises in business-process and workflow design.

The user describes a process in natural language. You return a single JSON object describing the process as a node graph for a canvas (n8n / Node-RED style).

STRICT OUTPUT — JSON only, no prose, no markdown fences:
{
  "nodes": [
    {
      "id": "snake_case_id",
      "label": "Short title (max 6 words)",
      "kind": "input" | "process" | "output" | "system",
      "summary": "One sentence describing this step.",
      "bullets": ["up to 6 short bullets describing the step's responsibilities"],
      "lane": "swimlane name (e.g. customer, operations, integrations)"
    }
  ],
  "edges": [
    { "source": "id", "target": "id", "label": "optional short verb phrase" }
  ]
}

DESIGN RULES:
- Between 4 and 18 nodes. Prefer fewer for clarity.
- Every node must have a unique id (snake_case). No duplicates.
- At least one node of kind "input" and one of kind "output" when the prompt describes an end-to-end process.
- Edge labels are short verbs ("triggers", "validates", "stores"). Omit the label if obvious.
- Do not invent URLs, code paths, or proprietary system names unless the user names them.
- Output ONLY the JSON object. No preamble, no closing remarks.`;

export type DesignerGenerateOk = {
  ok: true;
  graph: DesignerGraph;
  /** True when at least one generated node was keyword-mapped to a FLO node. */
  integrated: boolean;
};

export type DesignerGenerateError = {
  ok: false;
  code:
    | "no-key"
    | "empty"
    | "parse"
    | "shape"
    | "timeout"
    | "provider";
  message: string;
};

export type DesignerGenerateResult =
  | DesignerGenerateOk
  | DesignerGenerateError;

export type DesignerMessage = {
  role: "user" | "assistant";
  content: string;
};

const SYSTEM_PROMPT = DESIGNER_SYSTEM_PROMPT;
void SYSTEM_PROMPT;

export async function generateDesignerGraph(input: {
  prompt: string;
  history?: DesignerMessage[];
  locale?: Locale;
}): Promise<DesignerGenerateResult> {
  const settings = getAiProviderSettings();
  if (!settings) {
    return {
      ok: false,
      code: "no-key",
      message:
        "Connect an LLM API key in AI Settings first (set AI_ALLOW_EXTERNAL=true, AI_API_KEY, AI_BASE_URL, AI_MODEL).",
    };
  }

  const trimmed = input.prompt.trim();
  if (!trimmed) {
    return {
      ok: false,
      code: "empty",
      message: "Prompt is empty.",
    };
  }

  const history: DesignerMessage[] = (input.history ?? [])
    .slice(-6)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 1000) }));

  let reply = "";
  try {
    reply = await callOpenAiCompatibleChat({
      settings,
      // Replace the logistics-assistant persona (which declines "off-topic"
      // requests) with the designer contract so any business domain is allowed.
      systemPrompt: DESIGNER_SYSTEM_PROMPT,
      userMessage: trimmed,
      history,
      companyContext: "",
      locale: input.locale ?? "en",
      // Reasoning models spend tokens thinking before the JSON; a 10-node
      // graph with descriptions is ~2k tokens on its own.
      maxTokens: 6000,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/timeout|abort/i.test(message)) {
      return { ok: false, code: "timeout", message };
    }
    return { ok: false, code: "provider", message };
  }

  const parsedJson = extractJsonObject(reply);
  if (parsedJson === null) {
    // Server-side diagnostic only — never echoed back to chat or the browser.
    console.warn(
      "[designer/generator] model did not return JSON. First 240 chars:",
      reply.slice(0, 240),
    );
    return {
      ok: false,
      code: "parse",
      message:
        "The model returned something the canvas could not parse. Try again or refine.",
    };
  }

  const validation = parseDesignerGraph(parsedJson);
  if (!validation.ok) {
    const reason = (validation as DesignerValidationError).reason;
    const detail = (validation as DesignerValidationError).detail ?? "";
    console.warn(
      "[designer/generator] graph validation failed",
      { reason, detail, nodeCount: Array.isArray((parsedJson as { nodes?: unknown[] }).nodes) ? (parsedJson as { nodes: unknown[] }).nodes.length : 0 },
    );
    const friendlyReason =
      reason === "duplicate-id"
        ? "the model reused a node id"
        : reason === "edge-target-missing"
          ? "an edge referenced a node that wasn't defined"
          : reason === "self-loop"
            ? "an edge connected a node to itself"
            : reason === "unknown-kind"
              ? "a node used an unrecognised kind"
              : reason === "empty"
                ? "the graph was empty"
                : "the JSON shape did not match";
    return {
      ok: false,
      code: reason === "empty" ? "empty" : "shape",
      message: `The model returned a graph but ${friendlyReason}. Try again or refine.`,
    };
  }

  const { graph, integrated } = integrateWithFlo(validation.graph);
  return { ok: true, graph, integrated };
}
