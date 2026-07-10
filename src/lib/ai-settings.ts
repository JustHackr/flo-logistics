import { z } from "zod";

export const AI_SETTINGS_STORAGE_KEY = "balon-ai-provider-settings";

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

export function loadAiProviderSettings(): AiProviderSettings | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(AI_SETTINGS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AiProviderSettings>;
    const result = aiProviderSettingsSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export function saveAiProviderSettings(settings: AiProviderSettings) {
  const validated = aiProviderSettingsSchema.parse(settings);
  localStorage.setItem(AI_SETTINGS_STORAGE_KEY, JSON.stringify(validated));
}

export function clearAiProviderSettings() {
  localStorage.removeItem(AI_SETTINGS_STORAGE_KEY);
}

/** Mask key for display (last 4 chars only). */
export function maskApiKey(apiKey: string) {
  if (apiKey.length <= 4) return "••••";
  return `••••${apiKey.slice(-4)}`;
}
