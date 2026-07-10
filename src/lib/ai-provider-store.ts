import { prisma } from "@/lib/prisma";
import {
  aiProviderSettingsSchema,
  DEFAULT_AI_PROVIDER_SETTINGS,
  isAiProviderConfigured,
  maskApiKey,
  type AiProviderSettings,
  type AiProviderSettingsPublic,
} from "@/lib/ai-settings";

const CONFIG_ID = "default";

export async function getAiProviderSettings(): Promise<AiProviderSettings | null> {
  const row = await prisma.aiProviderConfig.findUnique({
    where: { id: CONFIG_ID },
  });
  if (!row) return null;

  const parsed = aiProviderSettingsSchema.safeParse({
    apiKey: row.apiKey,
    baseUrl: row.baseUrl,
    model: row.model,
  });
  return parsed.success ? parsed.data : null;
}

export async function getAiProviderSettingsPublic(): Promise<AiProviderSettingsPublic> {
  const settings = await getAiProviderSettings();
  if (!isAiProviderConfigured(settings)) {
    return {
      baseUrl: DEFAULT_AI_PROVIDER_SETTINGS.baseUrl,
      model: DEFAULT_AI_PROVIDER_SETTINGS.model,
      hasApiKey: false,
    };
  }

  return {
    baseUrl: settings.baseUrl,
    model: settings.model,
    hasApiKey: true,
    apiKeyMasked: maskApiKey(settings.apiKey),
  };
}

export async function saveAiProviderSettings(
  input: AiProviderSettings | Omit<AiProviderSettings, "apiKey"> & { apiKey?: string }
): Promise<AiProviderSettingsPublic> {
  const existing = await getAiProviderSettings();
  const apiKey =
    input.apiKey?.trim() || existing?.apiKey?.trim() || "";

  const settings = aiProviderSettingsSchema.parse({
    apiKey,
    baseUrl: input.baseUrl,
    model: input.model,
  });

  await prisma.aiProviderConfig.upsert({
    where: { id: CONFIG_ID },
    create: {
      id: CONFIG_ID,
      apiKey: settings.apiKey,
      baseUrl: settings.baseUrl,
      model: settings.model,
    },
    update: {
      apiKey: settings.apiKey,
      baseUrl: settings.baseUrl,
      model: settings.model,
    },
  });

  return getAiProviderSettingsPublic();
}

export async function clearAiProviderSettings() {
  await prisma.aiProviderConfig.deleteMany({ where: { id: CONFIG_ID } });
}
