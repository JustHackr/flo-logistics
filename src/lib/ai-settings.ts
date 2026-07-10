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

export type AiProviderSettingsPublic = {
  baseUrl: string;
  model: string;
  hasApiKey: boolean;
  apiKeyMasked?: string;
};

export const DEFAULT_AI_PROVIDER_SETTINGS: Omit<AiProviderSettings, "apiKey"> = {
  baseUrl: "https://api.minimax.chat/v1",
  model: "MiniMax-Text-01",
};

export function isAiProviderConfigured(
  settings: Partial<AiProviderSettings> | null | undefined
): settings is AiProviderSettings {
  if (!settings) return false;
  return Boolean(
    settings.apiKey?.trim() &&
      settings.baseUrl?.trim() &&
      settings.model?.trim()
  );
}

export function isAiProviderPublicConfigured(
  settings: AiProviderSettingsPublic | null | undefined
): boolean {
  return Boolean(settings?.hasApiKey && settings.baseUrl?.trim() && settings.model?.trim());
}

/** Mask key for display (last 4 chars only). */
export function maskApiKey(apiKey: string) {
  if (apiKey.length <= 4) return "••••";
  return `••••${apiKey.slice(-4)}`;
}
