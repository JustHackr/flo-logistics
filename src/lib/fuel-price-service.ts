import { prisma } from "@/lib/prisma";
import {
  fetchPertaminaFuelPrices,
  type FuelPriceEntry,
  type ParsedFuelPriceSnapshot,
} from "@/lib/routing/fuel-prices";

function serializeList(values: string[]) {
  return values.join(",");
}

function deserializeList(value: string) {
  return value.split(",").filter(Boolean);
}

function mapItemToEntry(item: {
  productCode: string;
  productName: string;
  pricePerLiter: number;
  subsidy: boolean;
  engineTypes: string;
  vehicleTypes: string;
}): FuelPriceEntry {
  return {
    productCode: item.productCode as FuelPriceEntry["productCode"],
    productName: item.productName,
    pricePerLiter: item.pricePerLiter,
    subsidy: item.subsidy,
    engineTypes: deserializeList(item.engineTypes) as FuelPriceEntry["engineTypes"],
    vehicleTypes: deserializeList(item.vehicleTypes) as FuelPriceEntry["vehicleTypes"],
  };
}

export type FuelPriceSnapshotView = {
  id: string;
  region: string;
  effectiveLabel: string | null;
  sourceUrl: string;
  fetchMethod: string;
  fetchedAt: string;
  items: FuelPriceEntry[];
};

export async function saveFuelPriceSnapshot(
  snapshot: ParsedFuelPriceSnapshot
): Promise<FuelPriceSnapshotView> {
  const created = await prisma.fuelPriceSnapshot.create({
    data: {
      region: snapshot.region,
      effectiveLabel: snapshot.effectiveLabel,
      sourceUrl: snapshot.sourceUrl,
      fetchMethod: snapshot.fetchMethod,
      fetchedAt: snapshot.fetchedAt,
      items: {
        create: snapshot.items.map((item) => ({
          productCode: item.productCode,
          productName: item.productName,
          pricePerLiter: item.pricePerLiter,
          subsidy: item.subsidy,
          engineTypes: serializeList(item.engineTypes),
          vehicleTypes: serializeList(item.vehicleTypes),
        })),
      },
    },
    include: { items: true },
  });

  return {
    id: created.id,
    region: created.region,
    effectiveLabel: created.effectiveLabel,
    sourceUrl: created.sourceUrl,
    fetchMethod: created.fetchMethod,
    fetchedAt: created.fetchedAt.toISOString(),
    items: created.items.map(mapItemToEntry),
  };
}

export async function getLatestFuelPriceSnapshot(): Promise<FuelPriceSnapshotView | null> {
  const latest = await prisma.fuelPriceSnapshot.findFirst({
    orderBy: { fetchedAt: "desc" },
    include: { items: true },
  });

  if (!latest) return null;

  return {
    id: latest.id,
    region: latest.region,
    effectiveLabel: latest.effectiveLabel,
    sourceUrl: latest.sourceUrl,
    fetchMethod: latest.fetchMethod,
    fetchedAt: latest.fetchedAt.toISOString(),
    items: latest.items.map(mapItemToEntry),
  };
}

export async function refreshFuelPricesFromPertamina() {
  const parsed = await fetchPertaminaFuelPrices();
  return saveFuelPriceSnapshot(parsed);
}

export async function ensureFuelPriceSnapshot() {
  const latest = await getLatestFuelPriceSnapshot();
  if (latest) return latest;
  return refreshFuelPricesFromPertamina();
}

export async function listFuelPriceSnapshots(limit = 10) {
  const rows = await prisma.fuelPriceSnapshot.findMany({
    orderBy: { fetchedAt: "desc" },
    take: limit,
    include: { items: true },
  });

  return rows.map((row) => ({
    id: row.id,
    region: row.region,
    effectiveLabel: row.effectiveLabel,
    sourceUrl: row.sourceUrl,
    fetchMethod: row.fetchMethod,
    fetchedAt: row.fetchedAt.toISOString(),
    items: row.items.map(mapItemToEntry),
  }));
}
