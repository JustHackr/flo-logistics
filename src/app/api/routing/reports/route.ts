import { NextResponse } from "next/server";
import { getRoutingLogisticsOverview } from "@/lib/routing-overview";

export async function GET() {
  const overview = await getRoutingLogisticsOverview();
  return NextResponse.json(overview);
}
