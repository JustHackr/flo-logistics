import { NextResponse } from "next/server";
import {
  checkOsrmReachable,
  describeTrafficSource,
  isGoogleMapsConfigured,
} from "@/lib/routing/estimator";
import { getGoogleMapsStatus } from "@/lib/routing/google-maps";

export async function GET() {
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
      "Using OSRM road distances with Jakarta rush-hour traffic calibration. No API keys required.";
  } else {
    primarySource = "estimated";
    message =
      "OSRM is temporarily unavailable. Using local Jakarta traffic estimates.";
  }

  return NextResponse.json({
    ...googleStatus,
    osrmReachable,
    primarySource,
    primarySourceLabel: describeTrafficSource(primarySource),
    message,
    googleOptional: !isGoogleMapsConfigured(),
  });
}
