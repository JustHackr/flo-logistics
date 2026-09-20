import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import {
  getAiProviderSettings,
  settingsFromTestBody,
} from "@/lib/ai-provider-store";
import { testOpenAiCompatibleConnection } from "@/lib/ai-llm";
import {
  checkRateLimit,
  getClientKey,
  rateLimitExceededBody,
} from "@/lib/rate-limit";
import { apiError } from "@/lib/i18n/api-errors";
import { getLocaleFromRequest } from "@/lib/i18n/get-locale";

/**
 * Tests the AI provider. ADMIN may POST an unsaved form body to probe
 * Ollama / OpenAI-compatible without persisting. Empty body uses saved
 * SQLite or env configuration.
 */
export async function POST(req: Request) {
  const locale = getLocaleFromRequest(req);
  const limit = checkRateLimit({
    key: `ai-test:${getClientKey(req)}`,
    limit: 3,
    windowMs: 60_000,
  });
  if (!limit.ok) {
    const { body, init } = rateLimitExceededBody(limit.retryAfterSec);
    return NextResponse.json(body, init);
  }

  let rawBody: unknown = null;
  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      rawBody = await req.json();
    } catch {
      rawBody = null;
    }
  }

  const hasTestBody =
    rawBody !== null &&
    typeof rawBody === "object" &&
    "mode" in (rawBody as object);

  if (hasTestBody) {
    const session = await getSession();
    if (!session) {
      return apiError(locale, "unauthorized", 401);
    }
    if (session.role !== "ADMIN") {
      return apiError(locale, "forbidden", 403);
    }

    const fromBody = settingsFromTestBody(rawBody);
    if (!fromBody) {
      if (
        typeof rawBody === "object" &&
        rawBody &&
        (rawBody as { mode?: string }).mode === "sovereign"
      ) {
        return NextResponse.json(
          { error: "Sovereign mode has no outbound LLM to test" },
          { status: 400 }
        );
      }
      return apiError(locale, "validation", 400);
    }

    try {
      const result = await testOpenAiCompatibleConnection(fromBody, locale);
      return NextResponse.json(result);
    } catch (error) {
      console.error(
        "[ai/test-connection] body test failed:",
        error instanceof Error ? error.message : "unknown error"
      );
      return apiError(locale, "aiUnreachable", 502);
    }
  }

  const settings = await getAiProviderSettings();
  if (!settings) {
    return apiError(locale, "aiNotConfigured", 503);
  }

  try {
    const result = await testOpenAiCompatibleConnection(settings, locale);
    return NextResponse.json(result);
  } catch (error) {
    console.error(
      "[ai/test-connection] provider test failed:",
      error instanceof Error ? error.message : "unknown error"
    );
    return apiError(locale, "aiUnreachable", 502);
  }
}
