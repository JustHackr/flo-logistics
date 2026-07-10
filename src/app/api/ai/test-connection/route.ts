import { NextResponse } from "next/server";
import { z } from "zod";
import { aiProviderSettingsSchema } from "@/lib/ai-settings";
import { getAiProviderSettings } from "@/lib/ai-provider-store";
import { testOpenAiCompatibleConnection } from "@/lib/ai-llm";

const testConnectionSchema = z.object({
  apiKey: z.string().trim().optional(),
  baseUrl: z
    .string()
    .trim()
    .min(1, "API base URL is required"),
  model: z.string().trim().min(1, "Model name is required"),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const input = testConnectionSchema.parse(body);
    const stored = await getAiProviderSettings();
    const apiKey = input.apiKey?.trim() || stored?.apiKey?.trim() || "";

    if (!apiKey) {
      return NextResponse.json(
        { error: "API key is required to test the connection" },
        { status: 400 }
      );
    }

    const settings = aiProviderSettingsSchema.parse({
      apiKey,
      baseUrl: input.baseUrl,
      model: input.model,
    });

    const result = await testOpenAiCompatibleConnection(settings);
    return NextResponse.json(result);
  } catch (error) {
    const msg =
      error instanceof Error ? error.message : "Connection test failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
