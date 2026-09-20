import "server-only";
import { prisma } from "@/lib/prisma";
import {
  aiProviderSettingsSchema,
  aiProviderUpsertSchema,
  DEFAULT_OLLAMA_BASE_URL,
  DEFAULT_OLLAMA_MODEL,
  DEFAULT_SOVEREIGN_MODEL,
  hostFromBaseUrl,
  normalizeAiBaseUrl,
  resolveOllamaDefaults,
  resolveProviderPriority,
  type AiProviderMode,
  type AiProviderSettings,
  type AiProviderStatus,
  type AiProviderUpsertInput,
} from "@/lib/ai-settings";

/**
 * AI provider resolution:
 * 1. SQLite AiProviderConfig row (ADMIN-saved) when mode !== sovereign
 * 2. Else env bootstrap (AI_ALLOW_EXTERNAL + AI_API_KEY + AI_BASE_URL)
 * 3. Else sovereign (in-process helper; getAiProviderSettings returns null)
 *
 * API keys are never returned to the browser.
 */

const CONFIG_ID = "default";

function isExternalLlmAllowed(): boolean {
  const flag = process.env.AI_ALLOW_EXTERNAL?.trim().toLowerCase();
  return flag === "1" || flag === "true" || flag === "yes";
}

function envBootstrap() {
  return {
    allowExternal: isExternalLlmAllowed(),
    apiKey: process.env.AI_API_KEY,
    baseUrl: process.env.AI_BASE_URL,
    model: process.env.AI_MODEL,
  };
}

async function readDbConfig() {
  try {
    return await prisma.aiProviderConfig.findUnique({ where: { id: CONFIG_ID } });
  } catch {
    return null;
  }
}

export async function getAiProviderSettings(): Promise<AiProviderSettings | null> {
  const row = await readDbConfig();
  const resolved = resolveProviderPriority({
    db: row,
    env: envBootstrap(),
  });
  return resolved.settings;
}

/** Synchronous env-only lookup for callers that cannot await. */
export function getAiProviderSettingsFromEnv(): AiProviderSettings | null {
  return resolveProviderPriority({
    db: null,
    env: envBootstrap(),
  }).settings;
}

export async function getAiProviderStatus(): Promise<AiProviderStatus> {
  const row = await readDbConfig();
  const resolved = resolveProviderPriority({
    db: row,
    env: envBootstrap(),
  });

  if (resolved.mode === "sovereign" || !resolved.settings) {
    return {
      configured: false,
      model: DEFAULT_SOVEREIGN_MODEL,
      mode: "sovereign",
      baseUrlHost: null,
      baseUrl: null,
      hasApiKey: false,
      source: resolved.source === "sqlite" ? "sqlite" : "default",
    };
  }

  const settings = resolved.settings;

  return {
    configured: true,
    model: settings.model,
    mode: resolved.mode,
    baseUrlHost: hostFromBaseUrl(settings.baseUrl),
    baseUrl: settings.baseUrl,
    hasApiKey:
      resolved.mode === "openai_compatible" &&
      Boolean(
        resolved.source === "env"
          ? process.env.AI_API_KEY?.trim()
          : row?.apiKey?.trim()
      ),
    source: resolved.source,
  };
}

export async function upsertAiProviderConfig(
  input: AiProviderUpsertInput
): Promise<AiProviderStatus> {
  const parsed = aiProviderUpsertSchema.parse(input);
  const existing = await readDbConfig();

  let mode: AiProviderMode = parsed.mode;
  let apiKey = "";
  let baseUrl = "";
  let model = "";

  if (parsed.mode === "sovereign") {
    mode = "sovereign";
    apiKey = "";
    baseUrl = "";
    model = DEFAULT_SOVEREIGN_MODEL;
  } else if (parsed.mode === "ollama") {
    const rawUrl = typeof parsed.baseUrl === "string" ? parsed.baseUrl.trim() : "";
    if (rawUrl) {
      try {
        const url = new URL(rawUrl);
        if (url.protocol !== "http:" && url.protocol !== "https:") {
          throw new Error("INVALID_BASE_URL");
        }
      } catch {
        throw new Error("INVALID_BASE_URL");
      }
    }
    const defaults = resolveOllamaDefaults({
      baseUrl: rawUrl,
      model: parsed.model,
    });
    mode = "ollama";
    apiKey = "";
    baseUrl = defaults.baseUrl;
    model = defaults.model;
  } else {
    mode = "openai_compatible";
    baseUrl = normalizeAiBaseUrl(parsed.baseUrl);
    model = parsed.model.trim();
    const incoming = parsed.apiKey?.trim() ?? "";
    if (incoming) {
      apiKey = incoming;
    } else if (existing?.apiKey?.trim()) {
      apiKey = existing.apiKey.trim();
    } else {
      throw new Error("API_KEY_REQUIRED");
    }
  }

  await prisma.aiProviderConfig.upsert({
    where: { id: CONFIG_ID },
    create: {
      id: CONFIG_ID,
      mode,
      apiKey,
      baseUrl,
      model,
    },
    update: {
      mode,
      apiKey,
      baseUrl,
      model,
    },
  });

  return getAiProviderStatus();
}

/** Build runtime settings from an unsaved admin test payload (does not persist). */
export function settingsFromTestBody(
  body: unknown
): AiProviderSettings | null {
  const parsed = aiProviderUpsertSchema.safeParse(body);
  if (!parsed.success) return null;

  if (parsed.data.mode === "sovereign") return null;

  if (parsed.data.mode === "ollama") {
    const defaults = resolveOllamaDefaults({
      baseUrl: parsed.data.baseUrl,
      model: parsed.data.model,
    });
    const result = aiProviderSettingsSchema.safeParse({
      apiKey: "",
      baseUrl: defaults.baseUrl,
      model: defaults.model,
      mode: "ollama",
    });
    return result.success ? result.data : null;
  }

  const apiKey = parsed.data.apiKey?.trim() ?? "";
  if (!apiKey) return null;

  const result = aiProviderSettingsSchema.safeParse({
    apiKey,
    baseUrl: normalizeAiBaseUrl(parsed.data.baseUrl),
    model: parsed.data.model.trim(),
    mode: "openai_compatible",
  });
  return result.success ? result.data : null;
}

export { DEFAULT_OLLAMA_BASE_URL, DEFAULT_OLLAMA_MODEL };
