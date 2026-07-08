import { estimateLeg } from "./estimator";
import type { LatLng } from "./geo";

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
}

export interface OptimizedRoute {
  orderedStops: OptimizedStopLeg[];
  returnLegDistanceKm: number;
  totalDistanceKm: number;
  totalDurationMin: number;
  routeEndAt: Date;
}

export function optimizeRoundTripByNearestNeighbor(
  warehouse: LatLng,
  stops: RoutableStop[],
  departTime: Date
): OptimizedRoute {
  const remaining = [...stops];
  const orderedStops: OptimizedStopLeg[] = [];

  let currentPoint: LatLng = warehouse;
  let currentTime = new Date(departTime);

  while (remaining.length > 0) {
    let bestIdx = 0;
    let bestDuration = Number.POSITIVE_INFINITY;

    for (let i = 0; i < remaining.length; i++) {
      const candidate = remaining[i];
      const { durationMin } = estimateLeg(
        currentPoint,
        { lat: candidate.lat, lng: candidate.lng },
        currentTime
      );
      if (durationMin < bestDuration) {
        bestDuration = durationMin;
        bestIdx = i;
      }
    }

    const next = remaining.splice(bestIdx, 1)[0];
    const leg = estimateLeg(
      currentPoint,
      { lat: next.lat, lng: next.lng },
      currentTime
    );
    const etaAt = new Date(currentTime);
    etaAt.setMinutes(etaAt.getMinutes() + leg.durationMin);

    orderedStops.push({
      orderId: next.orderId,
      sequence: orderedStops.length + 1,
      etaAt,
      distanceKm: leg.distanceKm,
      durationMin: leg.durationMin,
    });

    currentPoint = { lat: next.lat, lng: next.lng };
    currentTime = etaAt;
  }

  const returnLeg = estimateLeg(
    currentPoint,
    warehouse,
    currentTime
  );

  const totalDistanceKm =
    orderedStops.reduce((sum, s) => sum + s.distanceKm, 0) +
    returnLeg.distanceKm;

  const totalDurationMin =
    orderedStops.reduce((sum, s) => sum + s.durationMin, 0) +
    returnLeg.durationMin;

  return {
    orderedStops,
    returnLegDistanceKm: returnLeg.distanceKm,
    totalDistanceKm,
    totalDurationMin,
    routeEndAt: new Date(currentTime.getTime() + returnLeg.durationMin * 60 * 1000),
  };
}

