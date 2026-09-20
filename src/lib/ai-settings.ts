import { z } from "zod";

export const AI_PROVIDER_MODES = [
  "sovereign",
  "ollama",
  "openai_compatible",
] as const;

export type AiProviderMode = (typeof AI_PROVIDER_MODES)[number];

export const DEFAULT_OLLAMA_BASE_URL = "http://127.0.0.1:11434/v1";
export const DEFAULT_OLLAMA_MODEL = "llama3.2";
export const DEFAULT_SOVEREIGN_MODEL = "local-operations-helper";

const httpUrlSchema = z
  .string()
  .trim()
  .min(1, "API base URL is required")
  .refine(
    (value) => {
      try {
        const url = new URL(value);
        return url.protocol === "http:" || url.protocol === "https:";
      } catch {
        return false;
      }
    },
    { message: "Enter a valid http(s) URL" }
  );

/** Runtime settings passed to OpenAI-compatible chat (apiKey may be empty for Ollama). */
export const aiProviderSettingsSchema = z.object({
  apiKey: z.string(),
  baseUrl: httpUrlSchema,
  model: z.string().trim().min(1, "Model name is required"),
  mode: z.enum(["ollama", "openai_compatible"]).optional(),
});

export type AiProviderSettings = z.infer<typeof aiProviderSettingsSchema>;

/** Admin PUT body — apiKey empty on openai_compatible means keep existing. */
export const aiProviderUpsertSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("sovereign"),
  }),
  z.object({
    mode: z.literal("ollama"),
    baseUrl: z
      .string()
      .trim()
      .optional()
      .transform((v) => v ?? ""),
    model: z.string().trim().min(1, "Model name is required"),
  }),
  z.object({
    mode: z.literal("openai_compatible"),
    baseUrl: httpUrlSchema,
    model: z.string().trim().min(1, "Model name is required"),
    apiKey: z.string().optional(),
  }),
]);

export type AiProviderUpsertInput = z.infer<typeof aiProviderUpsertSchema>;

/**
 * Safe-to-share provider status. Never includes the API key.
 */
export type AiProviderStatus = {
  /** True when an outbound LLM (Ollama or OpenAI-compatible) is active. */
  configured: boolean;
  model: string;
  mode: AiProviderMode;
  /** Hostname (and port) of the configured base URL, if any. */
  baseUrlHost: string | null;
  /** Full base URL is safe to show for localhost Ollama; omitted for cloud. */
  baseUrl: string | null;
  hasApiKey: boolean;
  source: "sqlite" | "env" | "default";
};

/** @deprecated Prefer AiProviderStatus — kept as an alias for older imports. */
export type AiProviderSettingsPublic = AiProviderStatus;

export function isAiProviderPublicConfigured(
  status: AiProviderStatus | null | undefined
): boolean {
  return Boolean(
    status?.configured &&
      (status.mode === "ollama" || status.mode === "openai_compatible")
  );
}

/**
 * Defaults used only when AI_ALLOW_EXTERNAL=true and AI_API_KEY is set.
 * No hard-coded third-party host — operators must supply AI_BASE_URL.
 */
export const DEFAULT_AI_PROVIDER_SETTINGS: Omit<AiProviderSettings, "apiKey"> = {
  baseUrl: "",
  model: DEFAULT_SOVEREIGN_MODEL,
};

export function normalizeAiBaseUrl(baseUrl: string): string {
  return baseUrl.trim().replace(/\/+$/, "");
}

export function hostFromBaseUrl(baseUrl: string | null | undefined): string | null {
  if (!baseUrl?.trim()) return null;
  try {
    const url = new URL(baseUrl);
    return url.port ? `${url.hostname}:${url.port}` : url.hostname;
  } catch {
    return null;
  }
}

export function resolveOllamaDefaults(input: {
  baseUrl?: string | null;
  model?: string | null;
}): { baseUrl: string; model: string } {
  const baseUrl = input.baseUrl?.trim()
    ? normalizeAiBaseUrl(input.baseUrl)
    : DEFAULT_OLLAMA_BASE_URL;
  const model = input.model?.trim() || DEFAULT_OLLAMA_MODEL;
  return { baseUrl, model };
}

export function isLocalBaseUrl(baseUrl: string): boolean {
  try {
    const host = new URL(baseUrl).hostname;
    return host === "localhost" || host === "127.0.0.1" || host === "::1";
  } catch {
    return false;
  }
}

export type ProviderConfigRow = {
  mode: string;
  apiKey: string;
  baseUrl: string;
  model: string;
};

export type EnvProviderBootstrap = {
  allowExternal: boolean;
  apiKey?: string | null;
  baseUrl?: string | null;
  model?: string | null;
};

/**
 * Pure resolution used by the store and unit tests.
 * SQLite outbound config wins; else env OpenAI-compatible; else sovereign.
 */
export function resolveProviderPriority(input: {
  db: ProviderConfigRow | null;
  env: EnvProviderBootstrap;
}): {
  mode: AiProviderMode;
  settings: AiProviderSettings | null;
  source: "sqlite" | "env" | "default";
} {
  if (input.db) {
    if (input.db.mode === "sovereign") {
      return { mode: "sovereign", settings: null, source: "sqlite" };
    }

    if (input.db.mode === "ollama") {
      const defaults = resolveOllamaDefaults({
        baseUrl: input.db.baseUrl,
        model: input.db.model,
      });
      const parsed = aiProviderSettingsSchema.safeParse({
        apiKey: "",
        baseUrl: defaults.baseUrl,
        model: defaults.model,
        mode: "ollama",
      });
      if (parsed.success) {
        return {
          mode: "ollama",
          settings: parsed.data,
          source: "sqlite",
        };
      }
    }

    if (input.db.mode === "openai_compatible") {
      if (
        input.db.apiKey.trim() &&
        input.db.baseUrl.trim() &&
        input.db.model.trim()
      ) {
        const parsed = aiProviderSettingsSchema.safeParse({
          apiKey: input.db.apiKey.trim(),
          baseUrl: normalizeAiBaseUrl(input.db.baseUrl),
          model: input.db.model.trim(),
          mode: "openai_compatible",
        });
        if (parsed.success) {
          return {
            mode: "openai_compatible",
            settings: parsed.data,
            source: "sqlite",
          };
        }
      }
    }
  }

  if (input.env.allowExternal) {
    const apiKey = input.env.apiKey?.trim();
    const baseUrl = input.env.baseUrl?.trim();
    if (apiKey && baseUrl) {
      const parsed = aiProviderSettingsSchema.safeParse({
        apiKey,
        baseUrl: normalizeAiBaseUrl(baseUrl),
        model:
          input.env.model?.trim() || DEFAULT_AI_PROVIDER_SETTINGS.model,
        mode: "openai_compatible",
      });
      if (parsed.success) {
        return {
          mode: "openai_compatible",
          settings: parsed.data,
          source: "env",
        };
      }
    }
  }

  return { mode: "sovereign", settings: null, source: "default" };
}
