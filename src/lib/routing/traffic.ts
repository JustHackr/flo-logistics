export const JAKARTA_TIMEZONE = "Asia/Jakarta";

/** Urban road distance is typically longer than straight-line (Haversine). */
export const JAKARTA_ROAD_DISTANCE_FACTOR = 1.42;

/** Minutes spent parking, handing off parcels, and re-entering traffic per stop. */
export const DELIVERY_STOP_SERVICE_MIN = 10;

/**
 * OSRM assumes free-flow speeds. Jakarta last-mile delivery is much slower
 * due to signals, lane friction, alley access, and curbside parking.
 */
export const OSRM_URBAN_CALIBRATION_FACTOR = 2.1;

export function getJakartaHour(departTime: Date): number {
  const hourPart = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    hour12: false,
    timeZone: JAKARTA_TIMEZONE,
  })
    .formatToParts(departTime)
    .find((part) => part.type === "hour");

  return hourPart ? Number(hourPart.value) : departTime.getHours();
}

function getJakartaWeekday(departTime: Date) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    timeZone: JAKARTA_TIMEZONE,
  }).format(departTime);
}

function isJakartaWeekend(departTime: Date) {
  const day = getJakartaWeekday(departTime);
  return day === "Sat" || day === "Sun";
}

export function getJakartaTrafficMultiplier(departTime: Date): number {
  const hour = getJakartaHour(departTime);
  const isWeekend = isJakartaWeekend(departTime);

  // Jakarta rush: weekday morning 06:30–10:00 and evening 16:00–20:00 (WIB).
  const isMorningPeak = !isWeekend && hour >= 6 && hour < 10;
  const isEveningPeak = !isWeekend && hour >= 16 && hour < 20;
  const isMiddayCongestion = !isWeekend && hour >= 11 && hour < 14;
  const isNight = hour >= 22 || hour < 5;

  if (isMorningPeak || isEveningPeak) return 1.85;
  if (isMiddayCongestion) return 1.45;
  if (isNight) return 1.05;
  if (isWeekend) return 1.2;
  return 1.3;
}

/** Hard ceiling on average road speed for Jakarta last-mile delivery (km/h). */
export function getJakartaMaxEffectiveSpeedKmh(departTime: Date): number {
  const hour = getJakartaHour(departTime);
  const isWeekend = isJakartaWeekend(departTime);
  const isMorningPeak = !isWeekend && hour >= 6 && hour < 10;
  const isEveningPeak = !isWeekend && hour >= 16 && hour < 20;
  const isMiddayCongestion = !isWeekend && hour >= 11 && hour < 14;
  const isNight = hour >= 22 || hour < 5;

  if (isMorningPeak || isEveningPeak) return 11;
  if (isMiddayCongestion) return 14;
  if (isNight) return 20;
  if (isWeekend) return 17;
  return 15;
}

export function getJakartaEffectiveSpeedKmh(departTime: Date): number {
  return getJakartaMaxEffectiveSpeedKmh(departTime);
}

export function calibrateJakartaDurationMin(
  freeFlowDurationMin: number,
  distanceKm: number,
  departTime: Date
): number {
  const trafficMultiplier = getJakartaTrafficMultiplier(departTime);
  const calibrated =
    freeFlowDurationMin * OSRM_URBAN_CALIBRATION_FACTOR * trafficMultiplier;

  const maxSpeedKmh = getJakartaMaxEffectiveSpeedKmh(departTime);
  const floorMin =
    maxSpeedKmh > 0 ? (distanceKm / maxSpeedKmh) * 60 : calibrated;

  return Math.max(calibrated, floorMin);
}

/** Google traffic APIs require a departure time slightly in the future. */
export function toTrafficDepartureTime(departTime: Date): Date {
  const minFuture = new Date(Date.now() + 60_000);
  return departTime.getTime() < minFuture.getTime() ? minFuture : departTime;
}
