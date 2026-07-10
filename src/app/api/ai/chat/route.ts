import { NextResponse } from "next/server";
import { z } from "zod";
import { respondToChatMessage } from "@/lib/ai-chat";
import { aiProviderSettingsSchema } from "@/lib/ai-settings";
import {
  buildLiveCompanyContext,
  callOpenAiCompatibleChat,
} from "@/lib/ai-llm";

const chatRequestSchema = z.object({
  message: z.string().trim().min(1).max(2000),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(4000),
      })
    )
    .max(12)
    .optional(),
  settings: aiProviderSettingsSchema.optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { message, history, settings } = chatRequestSchema.parse(body);

    if (settings) {
      const companyContext = await buildLiveCompanyContext();
      const reply = await callOpenAiCompatibleChat({
        settings,
        userMessage: message,
        history,
        companyContext,
      });

      return NextResponse.json({
        reply,
        source: "llm" as const,
        links: [
          { label: "Logistics dashboard", href: "/routing/dashboard" },
          { label: "AI settings", href: "/ai/settings" },
        ],
      });
    }

    const response = await respondToChatMessage(message);
    return NextResponse.json({ ...response, source: "local" as const });
  } catch (error) {
    const msg =
      error instanceof Error ? error.message : "Failed to process chat message";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
