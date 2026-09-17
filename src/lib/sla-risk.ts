export type SlaRiskLevel = "LOW" | "WATCH" | "HIGH" | "CRITICAL";
export type SlaRiskConfidence = "LOW" | "MEDIUM" | "HIGH";

export type SlaRiskFactors = {
  slaPressure: number;
  fulfillmentDelay: number;
  traffic: number;
  weather: number;
  driverFleet: number;
  historical: number;
};

export type SlaRiskInput = {
  now: Date;
  promisedAt: Date;
  predictedDeliveryAt?: Date | null;
  remainingDurationMin?: number | null;
  remainingStops?: number;
  fulfillmentStatus: string;
  routeAssigned: boolean;
  driverAssigned: boolean;
  driverStatus?: string | null;
  vehicleRiskLevel?: "low" | "medium" | "high" | null;
  capacityRatio?: number | null;
  priority?: string | null;
  serviceLevel?: string | null;
  traffic?: { congestionRatio?: number | null; stale: boolean; source: string; providerFailed?: boolean } | null;
  weather?: { precipitationMmPerHour?: number | null; visibilityMeters?: number | null; windKmh?: number | null; stale: boolean; source: string; providerFailed?: boolean } | null;
  incident?: { roadClosed: boolean; severity: "MINOR" | "MAJOR" | "CRITICAL"; distanceKm: number; source?: string } | null;
  historical?: { averageDelayMin: number; samples: number } | null;
  thresholds?: { watchScore?: number; highScore?: number; criticalScore?: number };
};

export type SlaRiskResult = {
  score: number;
  riskLevel: SlaRiskLevel;
  confidence: SlaRiskConfidence;
  factors: SlaRiskFactors;
  reasons: string[];
  recommendation: string;
  predictedDeliveryAt: Date | null;
  remainingBufferMin: number | null;
  dominantCause: keyof SlaRiskFactors;
  dataSources: string[];
  stale: boolean;
};

const WEIGHTS: Record<keyof SlaRiskFactors, number> = {
  slaPressure: 0.3,
  fulfillmentDelay: 0.2,
  traffic: 0.2,
  weather: 0.1,
  driverFleet: 0.1,
  historical: 0.1,
};

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));
}

function minutesBetween(later: Date, earlier: Date) {
  return (later.getTime() - earlier.getTime()) / 60_000;
}

export function calculateSlaPressure(input: Pick<SlaRiskInput, "now" | "promisedAt" | "predictedDeliveryAt" | "remainingDurationMin">) {
  const availableMin = minutesBetween(input.promisedAt, input.now);
  const predictedMin = input.predictedDeliveryAt ? minutesBetween(input.predictedDeliveryAt, input.now) : input.remainingDurationMin ?? 120;
  if (availableMin <= 0) return 100;
  const buffer = availableMin - predictedMin;
  if (buffer <= 0) return clamp(85 + Math.abs(buffer) / 30 * 15);
  if (buffer < 30) return 75;
  if (buffer < 60) return 50;
  if (buffer < 120) return 25;
  return 5;
}

export function calculateFulfillmentDelay(input: Pick<SlaRiskInput, "fulfillmentStatus" | "now" | "promisedAt">) {
  const availableMin = minutesBetween(input.promisedAt, input.now);
  const status = input.fulfillmentStatus.toUpperCase();
  if (status === "EXCEPTION") return 100;
  if (status === "NOT_STARTED") return availableMin < 120 ? 95 : availableMin < 240 ? 75 : 45;
  if (status === "PICKING") return availableMin < 120 ? 85 : availableMin < 240 ? 65 : 35;
  if (status === "PACKED") return availableMin < 120 ? 90 : availableMin < 180 ? 70 : 40;
  if (status === "READY_FOR_DISPATCH") return 20;
  if (status === "LOADED") return 10;
  return 50;
}

export function calculateTrafficRisk(input: SlaRiskInput["traffic"], incident: SlaRiskInput["incident"]) {
  if (incident?.roadClosed && incident.distanceKm <= 5) return 100;
  const ratio = input?.congestionRatio ?? 1;
  return ratio >= 2 ? 100 : ratio >= 1.6 ? 80 : ratio >= 1.3 ? 50 : 10;
}

export function calculateWeatherRisk(input: SlaRiskInput["weather"]) {
  if (!input) return 20;
  const rain = input.precipitationMmPerHour ?? 0;
  const visibility = input.visibilityMeters;
  const wind = input.windKmh ?? 0;
  return clamp(Math.max(rain >= 25 ? 100 : rain >= 10 ? 75 : rain >= 5 ? 45 : 5, visibility !== null && visibility !== undefined && visibility < 1000 ? 90 : 0, wind >= 60 ? 75 : wind >= 40 ? 45 : 0));
}

export function calculateDriverFleetRisk(input: Pick<SlaRiskInput, "routeAssigned" | "driverAssigned" | "driverStatus" | "vehicleRiskLevel" | "capacityRatio" | "remainingStops">) {
  if (!input.routeAssigned) return 95;
  if (!input.driverAssigned) return 90;
  if (input.driverStatus && !["available", "active", "on_route"].includes(input.driverStatus.toLowerCase())) return 75;
  if (input.capacityRatio !== null && input.capacityRatio !== undefined && input.capacityRatio > 1) return 90;
  if (input.vehicleRiskLevel === "high") return 80;
  if ((input.remainingStops ?? 0) >= 12) return 65;
  if (input.vehicleRiskLevel === "medium") return 45;
  return 10;
}

export function calculateHistoricalRisk(input: SlaRiskInput["historical"]) {
  if (!input || input.samples === 0) return 50;
  return input.averageDelayMin >= 30 ? 100 : input.averageDelayMin >= 15 ? 70 : input.averageDelayMin >= 5 ? 40 : 10;
}

function riskLevel(score: number, input: SlaRiskInput, weatherRisk: number) {
  const watchScore = input.thresholds?.watchScore ?? 35;
  const highScore = input.thresholds?.highScore ?? 60;
  const criticalScore = input.thresholds?.criticalScore ?? 80;
  if (input.incident?.roadClosed && input.incident.distanceKm <= 5) return "CRITICAL" as const;
  if (weatherRisk >= 100 || input.fulfillmentStatus.toUpperCase() === "EXCEPTION") return "CRITICAL" as const;
  return score >= criticalScore ? "CRITICAL" : score >= highScore ? "HIGH" : score >= watchScore ? "WATCH" : "LOW";
}

function dominantCause(factors: SlaRiskFactors): keyof SlaRiskFactors {
  return (Object.keys(factors) as Array<keyof SlaRiskFactors>).sort((a, b) => factors[b] - factors[a])[0];
}

export function assessSlaRisk(input: SlaRiskInput): SlaRiskResult {
  const factors: SlaRiskFactors = {
    slaPressure: calculateSlaPressure(input),
    fulfillmentDelay: calculateFulfillmentDelay(input),
    traffic: calculateTrafficRisk(input.traffic, input.incident),
    weather: calculateWeatherRisk(input.weather),
    driverFleet: calculateDriverFleetRisk(input),
    historical: calculateHistoricalRisk(input.historical),
  };
  const priorityAdjustment = /same_day|same-day|express|urgent/i.test(`${input.serviceLevel ?? ""} ${input.priority ?? ""}`) ? 5 : /high/i.test(input.priority ?? "") ? 3 : 0;
  const score = clamp(Object.entries(WEIGHTS).reduce((sum, [key, weight]) => sum + factors[key as keyof SlaRiskFactors] * weight, priorityAdjustment));
  const predictedDeliveryAt = input.predictedDeliveryAt ?? null;
  const remainingBufferMin = predictedDeliveryAt ? Math.round(minutesBetween(input.promisedAt, predictedDeliveryAt) * 10) / 10 : null;
  const stale = Boolean(input.traffic?.stale || input.weather?.stale || input.traffic?.providerFailed || input.weather?.providerFailed || input.traffic?.source === "fallback" || input.weather?.source === "fallback");
  const confidenceReasons = [
    stale,
    !input.routeAssigned,
    !input.historical || input.historical.samples < 3,
    Boolean(input.traffic?.providerFailed || input.weather?.providerFailed),
  ];
  const confidence = confidenceReasons.filter(Boolean).length >= 3 ? "LOW" : confidenceReasons.filter(Boolean).length > 0 ? "MEDIUM" : "HIGH";
  const reasons: string[] = [];
  if (factors.slaPressure >= 50) reasons.push(remainingBufferMin !== null && remainingBufferMin < 0 ? `Predicted delivery is ${Math.abs(Math.round(remainingBufferMin))} minutes beyond the customer promise.` : `Only ${Math.max(0, Math.round(remainingBufferMin ?? minutesBetween(input.promisedAt, input.now)))} minutes of promise buffer remain.`);
  if (["PACKED", "PICKING", "NOT_STARTED"].includes(input.fulfillmentStatus.toUpperCase()) && factors.fulfillmentDelay >= 60) reasons.push(`WMS is ${input.fulfillmentStatus.toUpperCase()} and not yet ready for dispatch.`);
  if (factors.traffic >= 50) reasons.push(input.incident?.roadClosed ? "A road closure intersects the route." : `Traffic congestion is increasing the route risk${input.traffic?.congestionRatio ? ` at ${input.traffic.congestionRatio.toFixed(2)}x` : ""}.`);
  if (factors.weather >= 45) reasons.push(input.weather?.visibilityMeters !== null && input.weather?.visibilityMeters !== undefined && input.weather.visibilityMeters < 1000 ? "Visibility is below 1,000m." : `Weather conditions may slow safe delivery${input.weather?.precipitationMmPerHour ? ` with ${input.weather.precipitationMmPerHour.toFixed(1)} mm/h rain` : ""}.`);
  if (factors.driverFleet >= 65) reasons.push(!input.routeAssigned ? "No route is assigned yet." : !input.driverAssigned ? "No driver is assigned to the route." : "Driver, vehicle, or route workload is constrained.");
  if (!input.historical || input.historical.samples < 3) reasons.push("Historical delay sample is limited; confidence is reduced.");
  if (stale) reasons.push("One or more intelligence feeds are stale or using fallback data.");
  if (reasons.length === 0) reasons.push("Current route, fulfillment, and condition data leave a comfortable delivery buffer.");
  const cause = dominantCause(factors);
  const recommendation = cause === "fulfillmentDelay" ? "Ask the warehouse to prioritize or release the parcel." : cause === "traffic" ? "Preview a revised route around the affected segment." : cause === "weather" ? "Add a safety buffer and monitor the route before dispatch." : cause === "driverFleet" ? "Assign or rebalance the parcel with an available driver and vehicle." : cause === "historical" ? "Monitor the order and compare it with recent route performance." : "Acknowledge the risk and review the predicted delivery time before the SLA window closes.";
  const sources = Array.from(new Set(["FLO rule engine", input.traffic?.source, input.weather?.source, input.incident?.source, input.historical && input.historical.samples > 0 ? "delivery history" : undefined].filter((source): source is string => Boolean(source))));
  return { score: Math.round(score * 10) / 10, riskLevel: riskLevel(score, input, factors.weather), confidence, factors, reasons, recommendation, predictedDeliveryAt, remainingBufferMin, dominantCause: cause, dataSources: sources, stale };
}
