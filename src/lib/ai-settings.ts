import { z } from "zod";

export const aiProviderSettingsSchema = z.object({
  apiKey: z.string().trim().min(1, "API key is required"),
  baseUrl: z
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
    ),
  model: z.string().trim().min(1, "Model name is required"),
});

export type AiProviderSettings = z.infer<typeof aiProviderSettingsSchema>;

/**
 * Safe-to-share provider status. Never includes the API key or base URL —
 * only whether an external provider is active and which mode the assistant
 * is running in (sovereign/local by default).
 */
export type AiProviderMode = "local" | "external";

export type AiProviderStatus = {
  /** True only when an external OpenAI-compatible provider is active. */
  configured: boolean;
  model: string;
  /** Sovereign default: in-process local assistant. */
  mode: AiProviderMode;
};

/** @deprecated Prefer AiProviderStatus — kept as an alias for older imports. */
export type AiProviderSettingsPublic = AiProviderStatus;

export function isAiProviderPublicConfigured(
  status: AiProviderStatus | null | undefined
): boolean {
  return Boolean(status?.configured && status.mode === "external");
}

/**
 * Defaults used only when AI_ALLOW_EXTERNAL=true and AI_API_KEY is set.
 * No hard-coded third-party host — operators must supply AI_BASE_URL.
 */
export const DEFAULT_AI_PROVIDER_SETTINGS: Omit<AiProviderSettings, "apiKey"> = {
  baseUrl: "",
  model: "local-operations-helper",
};
