export type GeoPoint = { lat: number; lng: number };

const EARTH_RADIUS_KM = 6371;

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

export function haversineDistanceKm(a: GeoPoint, b: GeoPoint) {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const latA = toRadians(a.lat);
  const latB = toRadians(b.lat);
  const haversine = Math.sin(dLat / 2) ** 2 + Math.cos(latA) * Math.cos(latB) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

/** Approximate distance to a route segment using a local equirectangular projection. */
function distanceToSegmentKm(point: GeoPoint, start: GeoPoint, end: GeoPoint) {
  const latScale = 111.32;
  const lngScale = 111.32 * Math.cos(toRadians((start.lat + end.lat + point.lat) / 3));
  const px = (point.lng - start.lng) * lngScale;
  const py = (point.lat - start.lat) * latScale;
  const sx = 0;
  const sy = 0;
  const ex = (end.lng - start.lng) * lngScale;
  const ey = (end.lat - start.lat) * latScale;
  const lengthSquared = ex * ex + ey * ey;
  const t = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, (px * ex + py * ey) / lengthSquared));
  return Math.hypot(px - (sx + t * ex), py - (sy + t * ey));
}

export function distanceToRouteKm(point: GeoPoint, routePoints: GeoPoint[]) {
  if (routePoints.length === 0) return Number.POSITIVE_INFINITY;
  if (routePoints.length === 1) return haversineDistanceKm(point, routePoints[0]);
  return routePoints.slice(1).reduce((best, end, index) => Math.min(best, distanceToSegmentKm(point, routePoints[index], end)), Number.POSITIVE_INFINITY);
}

export function nearestRouteStop(point: GeoPoint, stops: Array<GeoPoint & { routeStopId: string }>) {
  return stops.reduce<{ routeStopId: string; distanceKm: number } | null>((nearest, stop) => {
    const distanceKm = haversineDistanceKm(point, stop);
    return !nearest || distanceKm < nearest.distanceKm ? { routeStopId: stop.routeStopId, distanceKm } : nearest;
  }, null);
}
