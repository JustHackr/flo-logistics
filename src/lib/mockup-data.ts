import { CSV_TEMPLATE_HEADERS } from "@/lib/csv";
import {
  getDemoLocation,
  JAKARTA_DEMO_LOCATIONS,
} from "@/lib/routing/jakarta-demo-locations";

export const ORDER_CSV_HEADERS = [
  "recipientAddress",
  "lat",
  "lng",
  "accessRequirement",
] as const;

export type AccessRequirement = "CAR_ONLY" | "MOTORCYCLE_ONLY" | "BOTH";

const MOTORCYCLE_MODELS = {
  gasoline: [
    "Honda Beat",
    "Honda Vario 125",
    "Honda Scoopy",
    "Honda PCX 160",
    "Yamaha NMAX 155",
    "Yamaha Aerox 155",
    "Suzuki Satria F150",
  ],
  ev: ["Polytron Fox R", "Polytron Fox E", "Polytron Fox X"],
} as const;

const VAN_MODELS = {
  gasoline: [
    "Daihatsu Gran Max",
    "Suzuki Carry",
    "Toyota HiAce Commuter",
  ],
  diesel: [
    "Suzuki Carry Diesel",
    "Mitsubishi L300",
    "Isuzu Traga",
    "Toyota HiAce Commuter",
  ],
  ev: ["DFSK Gelora E", "Wuling Formo Max EV"],
} as const;

function randomPlateSuffix() {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const nums = randomInt(1000, 9999);
  const suffix =
    letters[randomInt(0, 25)] +
    letters[randomInt(0, 25)] +
    letters[randomInt(0, 25)];
  return `B ${nums} ${suffix}`;
}

function vehicleDisplayName(
  vehicleType: "van" | "motorcycle",
  engineType: string
) {
  const models =
    vehicleType === "motorcycle"
      ? MOTORCYCLE_MODELS[engineType as keyof typeof MOTORCYCLE_MODELS] ??
        MOTORCYCLE_MODELS.gasoline
      : VAN_MODELS[engineType as keyof typeof VAN_MODELS] ?? VAN_MODELS.gasoline;
  const model = randomItem(models);
  return `${randomPlateSuffix()} – ${model}`;
}

const ACCESS_REQUIREMENTS: AccessRequirement[] = [
  "CAR_ONLY",
  "MOTORCYCLE_ONLY",
  "BOTH",
];

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomItem<T>(items: readonly T[]): T {
  return items[randomInt(0, items.length - 1)];
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function escapeCsvValue(value: string | number | null | undefined) {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function rowsToCsv(
  headers: readonly string[],
  rows: Array<Record<string, string | number | null | undefined>>
) {
  const headerLine = headers.join(",");
  const dataLines = rows.map((row) =>
    headers.map((key) => escapeCsvValue(row[key])).join(",")
  );
  return [headerLine, ...dataLines].join("\n");
}

export function generateMockVehicles(count: number) {
  const rows = Array.from({ length: count }, (_, index) => {
    const vehicleType = randomItem(["van", "motorcycle"] as const);
    const engineType =
      vehicleType === "motorcycle"
        ? randomItem(["gasoline", "gasoline", "gasoline", "ev"] as const)
        : randomItem(["gasoline", "diesel", "ev"] as const);
    const vehicleAgeYears = randomInt(1, 12);
    const odometerKm = randomInt(12000, 280000);
    const kilometersPerFleet = Math.max(
      8000,
      Math.round(odometerKm / Math.max(vehicleAgeYears, 1))
    );
    const vehicleLifetimeYears =
      vehicleType === "motorcycle" ? randomInt(8, 10) : randomInt(10, 15);
    const expectedLifetimeKm =
      vehicleType === "motorcycle"
        ? randomInt(100000, 120000)
        : randomInt(250000, 400000);
    const maintenanceIntervalKm =
      vehicleType === "motorcycle" ? 5000 : engineType === "ev" ? 15000 : 10000;
    const maintenanceCostUnit =
      vehicleType === "motorcycle"
        ? randomInt(110, 180) * 1000
        : engineType === "ev"
          ? randomInt(180, 250) * 1000
          : randomInt(280, 720) * 1000;

    const lastMaintenanceDate = new Date();
    lastMaintenanceDate.setDate(
      lastMaintenanceDate.getDate() - randomInt(14, 120)
    );
    const nextMaintenanceDate = new Date();
    nextMaintenanceDate.setDate(
      nextMaintenanceDate.getDate() + randomInt(5, 90)
    );

    return {
      name: vehicleDisplayName(vehicleType, engineType),
      vehicleType,
      engineType,
      vehicleAgeYears,
      odometerKm,
      kilometersPerFleet,
      vehicleLifetimeYears,
      expectedLifetimeKm,
      maintenanceCostUnit,
      lastMaintenanceDate: formatDate(lastMaintenanceDate),
      nextMaintenanceDate: formatDate(nextMaintenanceDate),
      maintenanceIntervalKm,
      notes:
        index % 4 === 0 ? "Data mock armada untuk uji konektor" : "",
    };
  });

  return rowsToCsv(CSV_TEMPLATE_HEADERS, rows);
}

export function generateMockOrders(count: number) {
  const usedIndices = new Set<number>();
  const rows = Array.from({ length: count }, (_, index) => {
    let locationIndex = index % JAKARTA_DEMO_LOCATIONS.length;
    while (
      usedIndices.has(locationIndex) &&
      usedIndices.size < JAKARTA_DEMO_LOCATIONS.length
    ) {
      locationIndex = (locationIndex + 1) % JAKARTA_DEMO_LOCATIONS.length;
    }
    usedIndices.add(locationIndex);

    const location = getDemoLocation(locationIndex);
    const accessRequirement =
      location.accessRequirement === "CAR_ONLY" ||
      location.accessRequirement === "MOTORCYCLE_ONLY"
        ? location.accessRequirement
        : randomItem(ACCESS_REQUIREMENTS);

    return {
      recipientAddress: location.address,
      lat: location.lat,
      lng: location.lng,
      accessRequirement,
    };
  });

  return rowsToCsv(ORDER_CSV_HEADERS, rows);
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
