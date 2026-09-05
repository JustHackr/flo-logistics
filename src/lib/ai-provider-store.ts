import "server-only";
import {
  aiProviderSettingsSchema,
  DEFAULT_AI_PROVIDER_SETTINGS,
  type AiProviderSettings,
  type AiProviderStatus,
} from "@/lib/ai-settings";

/**
 * AI provider credentials come exclusively from server-side environment
 * variables (set in Vercel project settings). They are never accepted from
 * users, never stored in the database, and never sent to the browser.
 *
 * - AI_API_KEY   (required to enable the LLM assistant)
 * - AI_BASE_URL  (optional, defaults to MiniMax's OpenAI-compatible API)
 * - AI_MODEL     (optional, defaults to MiniMax-Text-01)
 */
export function getAiProviderSettings(): AiProviderSettings | null {
  const apiKey = process.env.AI_API_KEY?.trim();
  if (!apiKey) return null;

  const parsed = aiProviderSettingsSchema.safeParse({
    apiKey,
    baseUrl:
      process.env.AI_BASE_URL?.trim() || DEFAULT_AI_PROVIDER_SETTINGS.baseUrl,
    model: process.env.AI_MODEL?.trim() || DEFAULT_AI_PROVIDER_SETTINGS.model,
  });

  return parsed.success ? parsed.data : null;
}

/** Public status for the UI — contains no secret values. */
export function getAiProviderStatus(): AiProviderStatus {
  const settings = getAiProviderSettings();
  if (!settings) {
    return { configured: false, model: DEFAULT_AI_PROVIDER_SETTINGS.model };
  }
  return { configured: true, model: settings.model };
}
