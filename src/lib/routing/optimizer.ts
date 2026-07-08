import {
  createLegEstimator,
  type LegEstimator,
  type TrafficSource,
} from "./estimator";
import type { LatLng } from "./geo";
import { DELIVERY_STOP_SERVICE_MIN } from "./traffic";

export interface RoutableStop {
  orderId: string;
  lat: number;
  lng: number;
}

export interface OptimizedStopLeg {
  orderId: string;
  sequence: number;
  etaAt: Date;
  distanceKm: number;
  durationMin: number;
  serviceTimeMin: number;
}

export interface OptimizedRoute {
  orderedStops: OptimizedStopLeg[];
  departureLegDistanceKm: number;
  departureLegDurationMin: number;
  returnLegDistanceKm: number;
  returnLegDurationMin: number;
  totalDistanceKm: number;
  totalDurationMin: number;
  totalServiceTimeMin: number;
  routeEndAt: Date;
  trafficSource: TrafficSource;
}

export async function optimizeRoundTripByNearestNeighbor(
  warehouse: LatLng,
  stops: RoutableStop[],
  departTime: Date
): Promise<OptimizedRoute> {
  const points: LatLng[] = [
    warehouse,
    ...stops.map((s) => ({ lat: s.lat, lng: s.lng })),
  ];
  const legEstimator: LegEstimator = createLegEstimator(points, departTime);
  await legEstimator.ready();

  const stopById = new Map(stops.map((s) => [s.orderId, s]));
  const remaining = [...stops];
  const orderedStops: OptimizedStopLeg[] = [];

  let currentPoint: LatLng = warehouse;
  let currentTime = new Date(departTime);

  while (remaining.length > 0) {
    const candidates = remaining.map((s) => ({ lat: s.lat, lng: s.lng }));
    const legs = await legEstimator.estimateManyFromOrigin(
      currentPoint,
      candidates,
      currentTime
    );

    let bestIdx = 0;
    let bestDuration = Number.POSITIVE_INFINITY;
    for (let i = 0; i < legs.length; i++) {
      if (legs[i].durationMin < bestDuration) {
        bestDuration = legs[i].durationMin;
        bestIdx = i;
      }
    }

    const next = remaining.splice(bestIdx, 1)[0];
    const leg = legs[bestIdx];
    const etaAt = new Date(currentTime);
    etaAt.setMinutes(etaAt.getMinutes() + leg.durationMin);

    orderedStops.push({
      orderId: next.orderId,
      sequence: orderedStops.length + 1,
      etaAt,
      distanceKm: leg.distanceKm,
      durationMin: leg.durationMin,
      serviceTimeMin: DELIVERY_STOP_SERVICE_MIN,
    });

    currentPoint = { lat: next.lat, lng: next.lng };
    currentTime = new Date(etaAt);
    currentTime.setMinutes(
      currentTime.getMinutes() + DELIVERY_STOP_SERVICE_MIN
    );
  }

  return refineOrderedRoute(
    warehouse,
    orderedStops,
    stopById,
    departTime,
    legEstimator,
    currentPoint,
    currentTime
  );
}

async function refineOrderedRoute(
  warehouse: LatLng,
  orderedStops: OptimizedStopLeg[],
  stopById: Map<string, RoutableStop>,
  departTime: Date,
  legEstimator: LegEstimator,
  lastPoint: LatLng,
  timeAfterLastStop: Date
): Promise<OptimizedRoute> {
  let currentPoint = warehouse;
  let currentTime = new Date(departTime);
  const refined: OptimizedStopLeg[] = [];

  for (const stop of orderedStops) {
    const routable = stopById.get(stop.orderId);
    if (!routable) continue;

    const dest = { lat: routable.lat, lng: routable.lng };
    const leg = await legEstimator.estimate(currentPoint, dest, currentTime);
    const etaAt = new Date(currentTime);
    etaAt.setMinutes(etaAt.getMinutes() + leg.durationMin);

    refined.push({
      orderId: stop.orderId,
      sequence: stop.sequence,
      etaAt,
      distanceKm: leg.distanceKm,
      durationMin: leg.durationMin,
      serviceTimeMin: DELIVERY_STOP_SERVICE_MIN,
    });

    currentPoint = dest;
    currentTime = new Date(etaAt);
    currentTime.setMinutes(
      currentTime.getMinutes() + DELIVERY_STOP_SERVICE_MIN
    );
  }

  const returnLeg = await legEstimator.estimate(
    refined.length > 0 ? currentPoint : lastPoint,
    warehouse,
    refined.length > 0 ? currentTime : timeAfterLastStop
  );

  const returnFrom = refined.length > 0 ? currentTime : timeAfterLastStop;

  const totalDistanceKm =
    refined.reduce((sum, s) => sum + s.distanceKm, 0) + returnLeg.distanceKm;

  const drivingDurationMin =
    refined.reduce((sum, s) => sum + s.durationMin, 0) +
    returnLeg.durationMin;

  const totalServiceTimeMin = refined.length * DELIVERY_STOP_SERVICE_MIN;
  const totalDurationMin = drivingDurationMin + totalServiceTimeMin;

  const departureLegDistanceKm = refined[0]?.distanceKm ?? 0;
  const departureLegDurationMin = refined[0]?.durationMin ?? 0;

  return {
    orderedStops: refined,
    departureLegDistanceKm,
    departureLegDurationMin,
    returnLegDistanceKm: returnLeg.distanceKm,
    returnLegDurationMin: returnLeg.durationMin,
    totalDistanceKm,
    totalDurationMin,
    totalServiceTimeMin,
    routeEndAt: new Date(
      returnFrom.getTime() + returnLeg.durationMin * 60 * 1000
    ),
    trafficSource: legEstimator.getPrimarySource() ?? "estimated",
  };
}
