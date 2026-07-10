import { NextResponse } from "next/server";
import { z } from "zod";
import { DEFAULT_AI_PROVIDER_SETTINGS } from "@/lib/ai-settings";
import {
  clearAiProviderSettings,
  getAiProviderSettingsPublic,
  saveAiProviderSettings,
} from "@/lib/ai-provider-store";

const saveSettingsSchema = z.object({
  apiKey: z.string().trim().optional(),
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

export async function GET() {
  try {
    const settings = await getAiProviderSettingsPublic();
    return NextResponse.json(settings);
  } catch (error) {
    const msg =
      error instanceof Error ? error.message : "Failed to load AI settings";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const input = saveSettingsSchema.parse(body);
    const settings = await saveAiProviderSettings({
      baseUrl: input.baseUrl,
      model: input.model,
      apiKey: input.apiKey,
    });
    return NextResponse.json(settings);
  } catch (error) {
    const msg =
      error instanceof Error ? error.message : "Failed to save AI settings";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function DELETE() {
  try {
    await clearAiProviderSettings();
    return NextResponse.json({
      baseUrl: DEFAULT_AI_PROVIDER_SETTINGS.baseUrl,
      model: DEFAULT_AI_PROVIDER_SETTINGS.model,
      hasApiKey: false,
    });
  } catch (error) {
    const msg =
      error instanceof Error ? error.message : "Failed to clear AI settings";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
