import { DELIVERY_STOP_SERVICE_MIN } from "./traffic";
import type { RiskLevel } from "@/lib/vqi";

export type OrderStatus =
  | "RECEIVED"
  | "PREPARING"
  | "ON_ROUTE"
  | "ETA"
  | "DELIVERED";

export type MapCoordinate = {
  lat: number;
  lng: number;
};

export type WarehouseWaypoint = MapCoordinate & {
  stopType: "warehouse";
  role: "departure" | "return";
  sequence: number;
  name: string;
  address: string;
  etaAt: string | null;
  distanceKm: number;
  durationMin: number;
};

export type DeliveryWaypoint = MapCoordinate & {
  stopType: "delivery";
  sequence: number;
  orderId: string;
  recipientAddress: string;
  etaAt: string | null;
  distanceKm: number;
  durationMin: number;
  serviceTimeMin?: number;
  orderStatus?: OrderStatus;
  dtiScore?: number;
  dtiRisk?: RiskLevel;
  dtiPending?: boolean;
  cfiScore?: number;
};

export type RouteWaypoint = WarehouseWaypoint | DeliveryWaypoint;

export type WarehouseInfo = MapCoordinate & {
  name: string;
  address: string;
};

export type DeliveryStopInput = {
  orderId: string;
  recipientAddress: string;
  lat: number;
  lng: number;
  etaAt: string | null;
  distanceKm: number;
  durationMin: number;
  serviceTimeMin?: number;
  orderStatus?: OrderStatus;
  dtiScore?: number;
  dtiRisk?: RiskLevel;
  dtiPending?: boolean;
  cfiScore?: number;
};

export type RouteLegInfo = {
  distanceKm: number;
  durationMin: number;
};

export function buildRouteWaypoints(
  warehouse: WarehouseInfo,
  routeStartAt: Date | string | null,
  deliveryStops: DeliveryStopInput[],
  _departureLeg: RouteLegInfo,
  returnLeg: RouteLegInfo
): RouteWaypoint[] {
  const startAt =
    routeStartAt instanceof Date
      ? routeStartAt
      : routeStartAt
        ? new Date(routeStartAt)
        : null;

  const waypoints: RouteWaypoint[] = [];

  waypoints.push({
    stopType: "warehouse",
    role: "departure",
    sequence: 0,
    name: warehouse.name,
    address: warehouse.address,
    lat: warehouse.lat,
    lng: warehouse.lng,
    etaAt: startAt && !Number.isNaN(startAt.getTime()) ? startAt.toISOString() : null,
    distanceKm: 0,
    durationMin: 0,
  });

  deliveryStops.forEach((stop, index) => {
    waypoints.push({
      stopType: "delivery",
      sequence: index + 1,
      orderId: stop.orderId,
      recipientAddress: stop.recipientAddress,
      lat: stop.lat,
      lng: stop.lng,
      etaAt: stop.etaAt,
      distanceKm: stop.distanceKm,
      durationMin: stop.durationMin,
      serviceTimeMin: stop.serviceTimeMin ?? DELIVERY_STOP_SERVICE_MIN,
      orderStatus: stop.orderStatus,
      dtiScore: stop.dtiScore,
      dtiRisk: stop.dtiRisk,
      dtiPending: stop.dtiPending,
      cfiScore: stop.cfiScore,
    });
  });

  const lastDelivery = deliveryStops[deliveryStops.length - 1];
  let returnEta: string | null = null;
  if (lastDelivery?.etaAt) {
    const lastEta = new Date(lastDelivery.etaAt);
    if (!Number.isNaN(lastEta.getTime())) {
      const serviceMin = lastDelivery.serviceTimeMin ?? DELIVERY_STOP_SERVICE_MIN;
      const returnAt = new Date(lastEta.getTime() + serviceMin * 60 * 1000);
      returnAt.setMinutes(returnAt.getMinutes() + returnLeg.durationMin);
      returnEta = returnAt.toISOString();
    }
  }

  waypoints.push({
    stopType: "warehouse",
    role: "return",
    sequence: deliveryStops.length + 1,
    name: warehouse.name,
    address: warehouse.address,
    lat: warehouse.lat,
    lng: warehouse.lng,
    etaAt: returnEta,
    distanceKm: returnLeg.distanceKm,
    durationMin: returnLeg.durationMin,
  });

  return waypoints;
}

export function deriveReturnLegFromTotals(
  totalDistanceKm: number,
  totalDurationMin: number,
  deliveryStops: Array<{ distanceKm: number; durationMin: number }>
): RouteLegInfo {
  const deliveryDistance = deliveryStops.reduce((sum, s) => sum + s.distanceKm, 0);
  const deliveryDriving = deliveryStops.reduce((sum, s) => sum + s.durationMin, 0);
  const serviceTime = deliveryStops.length * DELIVERY_STOP_SERVICE_MIN;

  return {
    distanceKm: Math.max(0, Math.round((totalDistanceKm - deliveryDistance) * 100) / 100),
    durationMin: Math.max(
      0,
      Math.round((totalDurationMin - deliveryDriving - serviceTime) * 10) / 10
    ),
  };
}

export function deriveDepartureLegFromStops(
  deliveryStops: Array<{ distanceKm: number; durationMin: number }>
): RouteLegInfo {
  const first = deliveryStops[0];
  return {
    distanceKm: first?.distanceKm ?? 0,
    durationMin: first?.durationMin ?? 0,
  };
}

export function waypointsToRoutePath(waypoints: RouteWaypoint[]): MapCoordinate[] {
  const path: MapCoordinate[] = [];
  for (const wp of waypoints) {
    if (wp.stopType === "warehouse" && wp.role === "return") {
      path.push({ lat: wp.lat, lng: wp.lng });
      continue;
    }
    path.push({ lat: wp.lat, lng: wp.lng });
  }
  return path;
}
