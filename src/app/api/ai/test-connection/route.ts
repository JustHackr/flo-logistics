import { NextResponse } from "next/server";
import { getAiProviderSettings } from "@/lib/ai-provider-store";
import { testOpenAiCompatibleConnection } from "@/lib/ai-llm";
import {
  checkRateLimit,
  getClientKey,
  rateLimitExceededBody,
} from "@/lib/rate-limit";
import { apiError } from "@/lib/i18n/api-errors";
import { getLocaleFromRequest } from "@/lib/i18n/get-locale";

/**
 * Tests the server-configured AI provider. No credentials are accepted from
 * the client — the request body is ignored entirely.
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

  const settings = getAiProviderSettings();
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
