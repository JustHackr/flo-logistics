import { NextResponse } from "next/server";
import { computeRoutePolyline } from "@/lib/routing/google-maps";
import { routePolylineRequestSchema } from "@/lib/schemas/route";
import {
  checkRateLimit,
  getClientKey,
  rateLimitExceededBody,
} from "@/lib/rate-limit";

export async function POST(req: Request) {
  const limit = checkRateLimit({
    key: `polyline:${getClientKey(req)}`,
    limit: 20,
    windowMs: 60_000,
  });
  if (!limit.ok) {
    const { body, init } = rateLimitExceededBody(limit.retryAfterSec);
    return NextResponse.json(body, init);
  }

  try {
    const body = await req.json();
    const parsed = routePolylineRequestSchema.parse(body);
    const encodedPolyline = await computeRoutePolyline(
      parsed.points,
      parsed.departTime ?? new Date()
    );

    return NextResponse.json({ encodedPolyline });
  } catch {
    return NextResponse.json(
      { error: "Invalid route request. Check waypoints and try again." },
      { status: 400 }
    );
  }
}
