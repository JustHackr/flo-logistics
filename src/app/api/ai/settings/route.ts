import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import {
  getAiProviderStatus,
  upsertAiProviderConfig,
} from "@/lib/ai-provider-store";
import { aiProviderUpsertSchema } from "@/lib/ai-settings";
import { getLocaleFromRequest } from "@/lib/i18n/get-locale";
import { apiError } from "@/lib/i18n/api-errors";

/**
 * Public status for the assistant UI (no secrets).
 * Includes canEdit when the session is ADMIN.
 * PUT is ADMIN-only and persists to SQLite AiProviderConfig.
 */
export async function GET() {
  const status = await getAiProviderStatus();
  const session = await getSession();
  return NextResponse.json({
    ...status,
    canEdit: session?.role === "ADMIN",
  });
}

export async function PUT(req: Request) {
  const locale = getLocaleFromRequest(req);
  const session = await getSession();
  if (!session) {
    return apiError(locale, "unauthorized", 401);
  }
  if (session.role !== "ADMIN") {
    return apiError(locale, "forbidden", 403);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError(locale, "validation", 400);
  }

  const parsed = aiProviderUpsertSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(locale, "validation", 400);
  }

  try {
    const status = await upsertAiProviderConfig(parsed.data);
    return NextResponse.json({ ...status, canEdit: true });
  } catch (error) {
    if (error instanceof Error && error.message === "API_KEY_REQUIRED") {
      return NextResponse.json(
        { error: "API key is required for OpenAI-compatible mode" },
        { status: 400 }
      );
    }
    if (error instanceof Error && error.message === "INVALID_BASE_URL") {
      return NextResponse.json(
        { error: "Enter a valid http(s) URL" },
        { status: 400 }
      );
    }
    console.error(
      "[ai/settings] upsert failed:",
      error instanceof Error ? error.message : "unknown error"
    );
    return apiError(locale, "server", 500);
  }
}
