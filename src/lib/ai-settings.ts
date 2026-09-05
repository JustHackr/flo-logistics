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
 * only whether the server-side provider is configured and which model runs.
 */
export type AiProviderStatus = {
  configured: boolean;
  model: string;
};

/** @deprecated Prefer AiProviderStatus — kept as an alias for older imports. */
export type AiProviderSettingsPublic = AiProviderStatus;

export function isAiProviderPublicConfigured(
  status: AiProviderStatus | null | undefined
): boolean {
  return Boolean(status?.configured);
}

export const DEFAULT_AI_PROVIDER_SETTINGS: Omit<AiProviderSettings, "apiKey"> = {
  baseUrl: "https://api.minimax.io/v1",
  model: "MiniMax-Text-01",
};
