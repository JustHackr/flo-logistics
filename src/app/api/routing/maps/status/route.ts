import { NextResponse } from "next/server";
import {
  checkOsrmReachable,
  describeTrafficSource,
  isGoogleMapsConfigured,
} from "@/lib/routing/estimator";
import {
  getGoogleMapsStatus,
  isMapsJsConfigured,
} from "@/lib/routing/google-maps";
import {
  checkRateLimit,
  getClientKey,
  rateLimitExceededBody,
} from "@/lib/rate-limit";

export async function GET(req: Request) {
  const limit = checkRateLimit({
    key: `maps-status:${getClientKey(req)}`,
    limit: 60,
    windowMs: 60_000,
  });
  if (!limit.ok) {
    const { body, init } = rateLimitExceededBody(limit.retryAfterSec);
    return NextResponse.json(body, init);
  }
  const [googleStatus, osrmReachable] = await Promise.all([
    getGoogleMapsStatus(),
    checkOsrmReachable(),
  ]);

  const googleConnected = googleStatus.connected;

  let primarySource: "google_traffic" | "osrm_traffic" | "estimated";
  let message: string;

  if (googleConnected) {
    primarySource = "google_traffic";
    message = googleStatus.message;
  } else if (osrmReachable) {
    primarySource = "osrm_traffic";
    message =
      "Using OSRM road distances with Jakarta rush-hour traffic calibration.";
  } else {
    primarySource = "estimated";
    message =
      "OSRM is temporarily unavailable. Using local Jakarta traffic estimates.";
  }

  const mapVisualizationConfigured = isMapsJsConfigured();

  return NextResponse.json({
    ...googleStatus,
    osrmReachable,
    primarySource,
    primarySourceLabel: describeTrafficSource(primarySource),
    message,
    googleOptional: !isGoogleMapsConfigured(),
    mapVisualizationConfigured,
    mapVisualizationMessage: mapVisualizationConfigured
      ? "Google Maps JavaScript API configured for route visualization."
      : "Set GOOGLE_MAPS_JS_API_KEY (or GOOGLE_MAPS_API_KEY) in server env to render routes on Google Maps.",
  });
}
