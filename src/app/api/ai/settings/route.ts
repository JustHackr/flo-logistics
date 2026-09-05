import { NextResponse } from "next/server";
import { getAiProviderStatus } from "@/lib/ai-provider-store";

/**
 * Public demo: AI provider credentials live in server-side environment
 * variables and cannot be read or changed through the API. This endpoint
 * only reports non-sensitive status (configured flag + model name).
 */
export async function GET() {
  return NextResponse.json(getAiProviderStatus());
}
