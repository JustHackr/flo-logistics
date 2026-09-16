import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/auth/api";
import { prisma } from "@/lib/prisma";
import { assessRouteConditions, associateRouteConditions, getRouteConditionObservations } from "@/lib/intelligence/service";

type RouteContext = { params: Promise<{ routeId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const access = await requireApiRole(["ADMIN", "OPS_MANAGER", "WAREHOUSE", "DRIVER"]);
  if (!access.ok) return access.response;
  const { routeId } = await context.params;
  const route = await prisma.routePlan.findUnique({ where: { id: routeId }, include: { warehouse: true, stops: { orderBy: { sequence: "asc" }, include: { order: true } } } });
  if (!route) return NextResponse.json({ error: "Route plan not found" }, { status: 404 });
  const points = [{ lat: route.warehouse.lat, lng: route.warehouse.lng }, ...route.stops.map((stop) => ({ lat: stop.order.lat, lng: stop.order.lng }))];
  await associateRouteConditions({ routePlanId: route.id, points, stops: route.stops.map((stop) => ({ routeStopId: stop.id, lat: stop.order.lat, lng: stop.order.lng })) });
  const [assessment, observations] = await Promise.all([assessRouteConditions({ points }), getRouteConditionObservations(route.id)]);
  return NextResponse.json({ routePlanId: route.id, generatedAt: new Date().toISOString(), assessment, observations });
}
