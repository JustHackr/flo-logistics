import "server-only";
import {
  aiProviderSettingsSchema,
  DEFAULT_AI_PROVIDER_SETTINGS,
  type AiProviderSettings,
  type AiProviderStatus,
} from "@/lib/ai-settings";

/**
 * AI provider credentials come exclusively from server-side environment
 * variables. They are never accepted from users, never stored in the
 * database, and never sent to the browser.
 *
 * Sovereign AI (default):
 * - No outbound LLM calls. The in-process local assistant answers from
 *   live SQLite data (`src/lib/ai-chat.ts`).
 *
 * External LLM (opt-in only):
 * - AI_ALLOW_EXTERNAL=true  (required opt-in to leave sovereign mode)
 * - AI_API_KEY              (required)
 * - AI_BASE_URL             (required when external is enabled)
 * - AI_MODEL                (optional; defaults to a generic label)
 */
function isExternalLlmAllowed(): boolean {
  const flag = process.env.AI_ALLOW_EXTERNAL?.trim().toLowerCase();
  return flag === "1" || flag === "true" || flag === "yes";
}

export function getAiProviderSettings(): AiProviderSettings | null {
  if (!isExternalLlmAllowed()) return null;

  const apiKey = process.env.AI_API_KEY?.trim();
  const baseUrl = process.env.AI_BASE_URL?.trim();
  if (!apiKey || !baseUrl) return null;

  const parsed = aiProviderSettingsSchema.safeParse({
    apiKey,
    baseUrl,
    model: process.env.AI_MODEL?.trim() || DEFAULT_AI_PROVIDER_SETTINGS.model,
  });

  return parsed.success ? parsed.data : null;
}

/** Public status for the UI — contains no secret values. */
export function getAiProviderStatus(): AiProviderStatus {
  const settings = getAiProviderSettings();
  if (!settings) {
    return {
      configured: false,
      model: DEFAULT_AI_PROVIDER_SETTINGS.model,
      mode: "local",
    };
  }
  return {
    configured: true,
    model: settings.model,
    mode: "external",
  };
}
