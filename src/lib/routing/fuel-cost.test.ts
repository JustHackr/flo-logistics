import { describe, expect, it } from "vitest";
import { PERTAMINA_DKI_JAKARTA_FALLBACK } from "./fuel-prices";
import {
  calculateTripFuelCost,
  calculateTripFuelSavings,
  estimateNaiveBaselineDistanceKm,
} from "./fuel-cost";

const prices = PERTAMINA_DKI_JAKARTA_FALLBACK.items;

describe("calculateTripFuelCost", () => {
  it("computes gasoline van trip cost using Pertamax", () => {
    const result = calculateTripFuelCost({
      distanceKm: 22,
      vehicleType: "van",
      engineType: "gasoline",
      fuelPrices: prices,
    });
    expect(result.productCode).toBe("pertamax");
    expect(result.litersUsed).toBeCloseTo(2, 0);
    expect(result.fuelCostIdr).toBeGreaterThan(30_000);
  });

  it("computes motorcycle trip cost using Pertalite", () => {
    const result = calculateTripFuelCost({
      distanceKm: 20,
      vehicleType: "motorcycle",
      engineType: "gasoline",
      fuelPrices: prices,
    });
    expect(result.productCode).toBe("pertalite");
    expect(result.fuelCostIdr).toBeGreaterThan(0);
  });

  it("returns zero-ish EV cost with kWh units", () => {
    const result = calculateTripFuelCost({
      distanceKm: 30,
      vehicleType: "van",
      engineType: "ev",
      fuelPrices: prices,
    });
    expect(result.unitLabel).toBe("kWh");
    expect(result.fuelCostIdr).toBeGreaterThan(0);
  });
});

describe("calculateTripFuelSavings", () => {
  it("shows savings for consolidated route vs naive round trips", () => {
    const warehouse = { lat: -6.2436, lng: 106.799 };
    const stops = [
      { lat: -6.21, lng: 106.82 },
      { lat: -6.25, lng: 106.78 },
    ];
    const baselineDistance = estimateNaiveBaselineDistanceKm(warehouse, stops);

    const savings = calculateTripFuelSavings({
      optimizedDistanceKm: baselineDistance * 0.55,
      warehouse,
      stopCoordinates: stops,
      vehicleType: "van",
      engineType: "diesel",
      fuelPrices: prices,
      emissionsKg: 4.8,
    });

    expect(savings.fuelCostSavingsIdr).toBeGreaterThan(0);
    expect(savings.fuelCostSavingsPercent).toBeGreaterThan(0);
    expect(savings.distanceSavedKm).toBeGreaterThan(0);
  });
});
