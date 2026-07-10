import { NextResponse } from "next/server";
import { computeRoutePolyline } from "@/lib/routing/google-maps";
import { routePolylineRequestSchema } from "@/lib/schemas/route";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = routePolylineRequestSchema.parse(body);
    const encodedPolyline = await computeRoutePolyline(
      parsed.points,
      parsed.departTime ?? new Date()
    );

    return NextResponse.json({ encodedPolyline });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to compute route polyline";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
