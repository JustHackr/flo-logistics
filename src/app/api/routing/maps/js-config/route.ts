import { NextResponse } from "next/server";
import { getMapsJsApiKey, isMapsJsConfigured } from "@/lib/routing/google-maps";
import {
  checkRateLimit,
  getClientKey,
  rateLimitExceededBody,
} from "@/lib/rate-limit";

/**
 * Supplies the Maps JavaScript API key to the client after mount.
 *
 * The key is never baked into the JS bundle via NEXT_PUBLIC_. Prefer a
 * separate referrer-restricted key in GOOGLE_MAPS_JS_API_KEY for demos.
 * Rate-limited to reduce casual key scraping.
 */
export async function GET(req: Request) {
  const limit = checkRateLimit({
    key: `maps-js:${getClientKey(req)}`,
    limit: 30,
    windowMs: 60_000,
  });
  if (!limit.ok) {
    const { body, init } = rateLimitExceededBody(limit.retryAfterSec);
    return NextResponse.json(body, init);
  }

  if (!isMapsJsConfigured()) {
    return NextResponse.json({
      configured: false,
      message: "Interactive Google Maps is not configured on this deployment.",
    });
  }

  const apiKey = getMapsJsApiKey();
  if (!apiKey) {
    return NextResponse.json({
      configured: false,
      message: "Interactive Google Maps is not configured on this deployment.",
    });
  }

  return NextResponse.json({
    configured: true,
    apiKey,
  });
}
