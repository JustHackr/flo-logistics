/**
 * Lightweight fixed-window rate limiter for public demo API routes.
 *
 * In-memory per serverless instance — good enough to stop casual abuse of a
 * demo deployment without adding external infrastructure.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 10_000;

export type RateLimitResult =
  | { ok: true; remaining: number }
  | { ok: false; retryAfterSec: number };

export function checkRateLimit(input: {
  /** Unique key, e.g. `chat:1.2.3.4` */
  key: string;
  /** Max requests per window. */
  limit: number;
  windowMs: number;
  now?: number;
}): RateLimitResult {
  const now = input.now ?? Date.now();

  if (buckets.size > MAX_BUCKETS) {
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(key);
    }
  }

  const bucket = buckets.get(input.key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(input.key, { count: 1, resetAt: now + input.windowMs });
    return { ok: true, remaining: input.limit - 1 };
  }

  if (bucket.count >= input.limit) {
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }

  bucket.count += 1;
  return { ok: true, remaining: input.limit - bucket.count };
}

/** Best-effort client identifier behind Vercel's proxy. */
export function getClientKey(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

/** Standard 429 JSON body + Retry-After header values. */
export function rateLimitExceededBody(retryAfterSec: number) {
  return {
    body: {
      error: "Too many requests. Please wait a moment and try again.",
    },
    init: {
      status: 429,
      headers: { "Retry-After": String(retryAfterSec) },
    },
  };
}
