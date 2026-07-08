import {
  getFuelPriceForVehicle,
  resolveFuelProductForVehicle,
} from "@/lib/routing/fuel-prices";
import type { EngineType, VehicleType } from "@/lib/types";

export type FuelDisplayTier = "zero" | "subsidized" | "standard";

export type VehicleFuelDisplay = {
  productCode: string;
  productName: string;
  shortLabel: string;
  tier: FuelDisplayTier;
};

const PRODUCT_LABELS: Record<string, string> = {
  pertalite: "Pertalite",
  pertamax: "Pertamax",
  biosolar: "Biosolar",
  electricity: "PLN EV",
};

function getTier(productCode: string): FuelDisplayTier {
  if (productCode === "electricity") return "zero";
  if (productCode === "pertalite") return "subsidized";
  return "standard";
}

export function getVehicleFuelDisplay(
  vehicleType: VehicleType,
  engineType: EngineType
): VehicleFuelDisplay {
  const productCode = resolveFuelProductForVehicle(vehicleType, engineType);
  const priceInfo = getFuelPriceForVehicle([], vehicleType, engineType);
  const productName = priceInfo.productName || PRODUCT_LABELS[productCode] || productCode;

  return {
    productCode,
    productName,
    shortLabel: PRODUCT_LABELS[productCode] ?? productName,
    tier: getTier(productCode),
  };
}

export type FleetFuelMix = {
  total: number;
  zeroEmissionCount: number;
  zeroEmissionPercent: number;
  byProduct: Array<{ label: string; count: number; tier: FuelDisplayTier }>;
};

export function aggregateFleetFuelMix(
  vehicles: Array<{ vehicleType: VehicleType; engineType: EngineType }>
): FleetFuelMix {
  const counts = new Map<string, { label: string; count: number; tier: FuelDisplayTier }>();

  for (const vehicle of vehicles) {
    const fuel = getVehicleFuelDisplay(vehicle.vehicleType, vehicle.engineType);
    const existing = counts.get(fuel.productCode);
    if (existing) {
      existing.count += 1;
    } else {
      counts.set(fuel.productCode, {
        label: fuel.shortLabel,
        count: 1,
        tier: fuel.tier,
      });
    }
  }

  const byProduct = [...counts.values()].sort((a, b) => b.count - a.count);
  const zeroEmissionCount = vehicles.filter((v) => v.engineType === "ev").length;
  const total = vehicles.length;

  return {
    total,
    zeroEmissionCount,
    zeroEmissionPercent: total > 0 ? Math.round((zeroEmissionCount / total) * 100) : 0,
    byProduct,
  };
}
