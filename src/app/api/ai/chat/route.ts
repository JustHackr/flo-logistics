import { NextResponse } from "next/server";
import { z } from "zod";
import { respondToChatMessage } from "@/lib/ai-chat";
import { getAiProviderSettings } from "@/lib/ai-provider-store";
import {
  buildLiveCompanyContext,
  callOpenAiCompatibleChat,
} from "@/lib/ai-llm";
import {
  checkRateLimit,
  getClientKey,
} from "@/lib/rate-limit";
import { getLocaleFromRequest } from "@/lib/i18n/get-locale";
import { apiError } from "@/lib/i18n/api-errors";

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
});

export async function POST(req: Request) {
  const locale = getLocaleFromRequest(req);
  const limit = checkRateLimit({
    key: `ai-chat:${getClientKey(req)}`,
    limit: 10,
    windowMs: 60_000,
  });
  if (!limit.ok) {
    return apiError(locale, "rateLimited", 429);
  }

  let message: string;
  let history: Array<{ role: "user" | "assistant"; content: string }> | undefined;
  try {
    const parsed = chatRequestSchema.parse(await req.json());
    message = parsed.message;
    history = parsed.history;
  } catch {
    return apiError(locale, "validation", 400);
  }

  const settings = await getAiProviderSettings();

  if (settings) {
    try {
      const companyContext = await buildLiveCompanyContext();
      const reply = await callOpenAiCompatibleChat({
        settings,
        userMessage: message,
        history,
        companyContext,
        locale,
      });

      return NextResponse.json({
        reply,
        source: "llm" as const,
        links: [
          { label: "Logistics dashboard", href: "/routing/dashboard" },
        ],
      });
    } catch (error) {
      // Log detail server-side only; never relay upstream provider errors
      // (which could reference auth headers or account info) to the browser.
      console.error(
        "[ai/chat] LLM request failed:",
        error instanceof Error ? error.message : "unknown error"
      );
      return apiError(locale, "aiUnreachable", 502);
    }
  }

  try {
    const response = await respondToChatMessage(message);
    return NextResponse.json({ ...response, source: "local" as const });
  } catch (error) {
    console.error(
      "[ai/chat] local responder failed:",
      error instanceof Error ? error.message : "unknown error"
    );
    return apiError(locale, "server", 500);
  }
}
