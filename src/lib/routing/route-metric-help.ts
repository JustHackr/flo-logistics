import { CO2_KG_PER_KM } from "@/lib/routing/emissions";
import {
  EV_KWH_PER_KM,
  FUEL_CONSUMPTION_KM_PER_LITER,
} from "@/lib/routing/fuel-cost";
import { DELIVERY_STOP_SERVICE_MIN } from "@/lib/routing/traffic";
import type { ActiveRouteSummary } from "@/lib/routing-overview";
import type { EngineType, VehicleType } from "@/lib/types";
import { formatCurrency } from "@/lib/format";

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function formatEngineLabel(engineType: string) {
  return engineType.toUpperCase();
}

export function buildRouteDistanceHelp(route: ActiveRouteSummary) {
  const stopDistanceSum = route.stops.reduce((sum, stop) => sum + stop.distanceKm, 0);
  const returnKm = round1(route.totals.totalDistanceKm - stopDistanceSum);
  const legLines = route.stops
    .map((stop) => `Leg ${stop.sequence}: ${stop.distanceKm} km`)
    .join(" + ");

  return [
    "Optimized round-trip distance (warehouse → sorted stops → warehouse).",
    legLines
      ? `${legLines}${returnKm > 0 ? ` + return leg: ${returnKm} km` : ""} = ${route.totals.totalDistanceKm} km.`
      : `Total stored distance: ${route.totals.totalDistanceKm} km.`,
    "Each leg uses road-network distance (Google Maps or OSRM) with Jakarta traffic calibration at route planning time.",
  ].join(" ");
}

export function buildRouteDurationHelp(route: ActiveRouteSummary) {
  const drivingFromStops = route.stops.reduce(
    (sum, stop) => sum + stop.durationMin,
    0
  );
  const serviceMin = route.stops.length * DELIVERY_STOP_SERVICE_MIN;
  const returnDriveMin = round1(
    route.totals.totalDurationMin - serviceMin - drivingFromStops
  );

  return [
    "Total trip time = driving time + per-stop service time.",
    `Driving: ${round1(drivingFromStops)} min (stop legs) + ${returnDriveMin} min (return to warehouse) = ${round1(drivingFromStops + returnDriveMin)} min.`,
    `Service: ${route.stops.length} stops × ${DELIVERY_STOP_SERVICE_MIN} min = ${serviceMin} min (parking, handoff, re-entry).`,
    `Total: ${round1(drivingFromStops + returnDriveMin)} + ${serviceMin} = ${route.totals.totalDurationMin} min (${Math.floor(route.totals.totalDurationMin / 60)} h ${Math.round(route.totals.totalDurationMin % 60)} min).`,
  ].join(" ");
}

export function buildRouteEmissionsHelp(route: ActiveRouteSummary) {
  const engineType = route.driver.vehicle.engineType as EngineType;
  const factor = CO2_KG_PER_KM[engineType] ?? CO2_KG_PER_KM.gasoline;
  const rawKg = route.totals.totalDistanceKm * factor;

  return [
    `CO₂e estimate for ${formatEngineLabel(engineType)} vehicle.`,
    `Formula: distance × emission factor = ${route.totals.totalDistanceKm} km × ${factor} kg/km = ${round1(rawKg)} kg CO₂e (rounded to ${route.totals.estimatedEmissionsKg} kg).`,
    "Factors: EV 0.05, gasoline 0.15, diesel 0.22 kg CO₂e per km (well-to-wheel proxy).",
  ].join(" ");
}

export function buildRouteFuelCostHelp(route: ActiveRouteSummary) {
  const vehicleType = route.driver.vehicle.vehicleType as VehicleType;
  const engineType = route.driver.vehicle.engineType as EngineType;
  const { totals } = route;
  const lines: string[] = [
    `Optimized trip fuel cost for ${vehicleType} / ${formatEngineLabel(engineType)} using ${totals.fuelProductName}.`,
  ];

  if (engineType === "ev") {
    const kwhPerKm = EV_KWH_PER_KM[vehicleType];
    const kwhUsed = round1(totals.totalDistanceKm * kwhPerKm);
    const pricePerKwh =
      totals.fuelLitersUsed > 0
        ? Math.round(totals.fuelCostIdr / totals.fuelLitersUsed)
        : null;
    lines.push(
      `Formula: distance × kWh/km × PLN rate = ${totals.totalDistanceKm} km × ${kwhPerKm} kWh/km${pricePerKwh != null ? ` × Rp ${pricePerKwh.toLocaleString("id-ID")}/kWh` : ""} ≈ ${formatCurrency(totals.fuelCostIdr)}.`
    );
  } else {
    const kmPerLiter =
      FUEL_CONSUMPTION_KM_PER_LITER[vehicleType][engineType] ?? 12;
    const liters = totals.fuelLitersUsed;
    const pricePerLiter =
      liters > 0 ? Math.round(totals.fuelCostIdr / liters) : null;
    lines.push(
      `Formula: (distance ÷ km/L) × fuel price = (${totals.totalDistanceKm} km ÷ ${kmPerLiter} km/L) × ${pricePerLiter != null ? `Rp ${pricePerLiter.toLocaleString("id-ID")}/L` : "Pertamina price"} ≈ ${formatCurrency(totals.fuelCostIdr)} (${liters} L).`
    );
  }

  lines.push(
    `Baseline (naive round-trip per stop × 1.35 road factor): ${formatCurrency(totals.baselineFuelCostIdr)}.`,
    `Savings: ${formatCurrency(totals.baselineFuelCostIdr)} − ${formatCurrency(totals.fuelCostIdr)} = ${formatCurrency(totals.fuelCostSavingsIdr)} (${totals.fuelCostSavingsPercent}% vs unoptimized routing).`
  );

  return lines.join(" ");
}
