import { distanceKm, type LatLng } from "@/lib/routing/geo";
import {
  getFuelPriceForVehicle,
  type FuelPriceEntry,
} from "@/lib/routing/fuel-prices";
import type { EngineType, VehicleType } from "@/lib/types";

/** Urban Jakarta logistics fleet averages (km per liter). */
export const FUEL_CONSUMPTION_KM_PER_LITER: Record<
  VehicleType,
  Record<EngineType, number | null>
> = {
  motorcycle: {
    gasoline: 35,
    diesel: 30,
    ev: null,
  },
  car: {
    gasoline: 11,
    diesel: 10,
    ev: null,
  },
};

/** EV energy use (kWh/km) when fuel product is electricity. */
export const EV_KWH_PER_KM: Record<VehicleType, number> = {
  car: 0.18,
  motorcycle: 0.05,
};

const ROAD_FACTOR = 1.35;

export type TripFuelCostResult = {
  distanceKm: number;
  litersUsed: number;
  fuelCostIdr: number;
  productCode: string;
  productName: string;
  pricePerUnit: number;
  consumptionKmPerLiter: number | null;
  unitLabel: "liter" | "kWh";
};

export type TripSavingsResult = {
  optimized: TripFuelCostResult;
  baselineDistanceKm: number;
  baseline: TripFuelCostResult;
  fuelCostSavingsIdr: number;
  fuelCostSavingsPercent: number;
  distanceSavedKm: number;
  emissionsKg: number;
};

function roundCurrency(value: number) {
  return Math.round(value);
}

export function getConsumptionKmPerLiter(
  vehicleType: VehicleType,
  engineType: EngineType
) {
  return FUEL_CONSUMPTION_KM_PER_LITER[vehicleType][engineType];
}

export function calculateTripFuelCost(input: {
  distanceKm: number;
  vehicleType: VehicleType;
  engineType: EngineType;
  fuelPrices: FuelPriceEntry[];
}): TripFuelCostResult {
  const { distanceKm, vehicleType, engineType, fuelPrices } = input;
  const priceInfo = getFuelPriceForVehicle(
    fuelPrices,
    vehicleType,
    engineType
  );

  if (engineType === "ev") {
    const kwhPerKm = EV_KWH_PER_KM[vehicleType];
    const kwhUsed = Math.round(distanceKm * kwhPerKm * 100) / 100;
    const fuelCostIdr = roundCurrency(kwhUsed * priceInfo.pricePerLiter);
    return {
      distanceKm,
      litersUsed: kwhUsed,
      fuelCostIdr,
      productCode: priceInfo.productCode,
      productName: priceInfo.productName,
      pricePerUnit: priceInfo.pricePerLiter,
      consumptionKmPerLiter: null,
      unitLabel: "kWh",
    };
  }

  const kmPerLiter = getConsumptionKmPerLiter(vehicleType, engineType) ?? 12;
  const litersUsed = Math.round((distanceKm / kmPerLiter) * 100) / 100;
  const fuelCostIdr = roundCurrency(litersUsed * priceInfo.pricePerLiter);

  return {
    distanceKm,
    litersUsed,
    fuelCostIdr,
    productCode: priceInfo.productCode,
    productName: priceInfo.productName,
    pricePerUnit: priceInfo.pricePerLiter,
    consumptionKmPerLiter: kmPerLiter,
    unitLabel: "liter",
  };
}

export function estimateNaiveBaselineDistanceKm(
  warehouse: LatLng,
  stops: LatLng[]
) {
  if (stops.length === 0) return 0;
  const roundTrips = stops.map(
    (stop) => 2 * distanceKm(warehouse, stop) * ROAD_FACTOR
  );
  return Math.round(roundTrips.reduce((sum, km) => sum + km, 0) * 10) / 10;
}

export function calculateTripFuelSavings(input: {
  optimizedDistanceKm: number;
  warehouse: LatLng;
  stopCoordinates: LatLng[];
  vehicleType: VehicleType;
  engineType: EngineType;
  fuelPrices: FuelPriceEntry[];
  emissionsKg: number;
}): TripSavingsResult {
  const baselineDistanceKm = estimateNaiveBaselineDistanceKm(
    input.warehouse,
    input.stopCoordinates
  );

  const optimized = calculateTripFuelCost({
    distanceKm: input.optimizedDistanceKm,
    vehicleType: input.vehicleType,
    engineType: input.engineType,
    fuelPrices: input.fuelPrices,
  });

  const baseline = calculateTripFuelCost({
    distanceKm: baselineDistanceKm,
    vehicleType: input.vehicleType,
    engineType: input.engineType,
    fuelPrices: input.fuelPrices,
  });

  const fuelCostSavingsIdr = Math.max(
    0,
    baseline.fuelCostIdr - optimized.fuelCostIdr
  );
  const fuelCostSavingsPercent =
    baseline.fuelCostIdr > 0
      ? Math.round((fuelCostSavingsIdr / baseline.fuelCostIdr) * 100)
      : 0;
  const distanceSavedKm = Math.max(
    0,
    Math.round((baselineDistanceKm - input.optimizedDistanceKm) * 10) / 10
  );

  return {
    optimized,
    baselineDistanceKm,
    baseline,
    fuelCostSavingsIdr,
    fuelCostSavingsPercent,
    distanceSavedKm,
    emissionsKg: input.emissionsKg,
  };
}

export function aggregateFuelCosts(costs: number[]) {
  return costs.reduce((sum, value) => sum + value, 0);
}
