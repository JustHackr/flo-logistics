import { NextResponse } from "next/server";
import { z } from "zod";
import { aiProviderSettingsSchema } from "@/lib/ai-settings";
import { testOpenAiCompatibleConnection } from "@/lib/ai-llm";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const settings = aiProviderSettingsSchema.parse(body);
    const result = await testOpenAiCompatibleConnection(settings);
    return NextResponse.json(result);
  } catch (error) {
    const msg =
      error instanceof Error ? error.message : "Connection test failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
