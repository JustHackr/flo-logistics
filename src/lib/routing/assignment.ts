import type { StopAccess } from "@/generated/prisma/enums";

export const DEFAULT_MAX_STOPS_PER_ROUTE = 15;

export interface OrderStopForRouting {
  orderId: string;
  lat: number;
  lng: number;
  accessRequirement: StopAccess;
}

function chunkArray<T>(arr: T[], chunkSize: number) {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += chunkSize) {
    chunks.push(arr.slice(i, i + chunkSize));
  }
  return chunks;
}

export interface AssignmentResult {
  vanChunks: OrderStopForRouting[][];
  motorcycleChunks: OrderStopForRouting[][];
}

export function assignOrdersToVehicleChunks(
  orders: OrderStopForRouting[],
  maxStopsPerRoute: number
): AssignmentResult {
  const carMandatory = orders.filter(
    (o) => o.accessRequirement === "CAR_ONLY"
  );
  const motorcycleMandatory = orders.filter(
    (o) => o.accessRequirement === "MOTORCYCLE_ONLY"
  );
  const bothOrders = orders.filter((o) => o.accessRequirement === "BOTH");

  const vanSet: OrderStopForRouting[] = [...carMandatory];
  const motorcycleSet: OrderStopForRouting[] = [...motorcycleMandatory];

  // For BOTH-access stops, assign to the currently smaller set so the routes
  // remain feasible for vehicle types.
  for (const o of bothOrders) {
    if (vanSet.length <= motorcycleSet.length) vanSet.push(o);
    else motorcycleSet.push(o);
  }

  return {
    vanChunks: chunkArray(vanSet, maxStopsPerRoute),
    motorcycleChunks: chunkArray(motorcycleSet, maxStopsPerRoute),
  };
}

