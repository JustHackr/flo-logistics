import { vehicleCsvSchema } from "./schemas/vehicle";

export interface CsvValidationResult {
  row: number;
  data: Record<string, string>;
  valid: boolean;
  errors: string[];
  parsed?: ReturnType<typeof vehicleCsvSchema.parse>;
}

function parseOptionalDate(value: string | undefined) {
  if (!value || value.trim() === "") return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date;
}

export function validateCsvRow(
  row: Record<string, string>,
  rowIndex: number
): CsvValidationResult {
  const errors: string[] = [];

  const parsedDates = {
    lastMaintenanceDate: parseOptionalDate(row.lastMaintenanceDate),
    nextMaintenanceDate: parseOptionalDate(row.nextMaintenanceDate),
  };

  if (
    row.lastMaintenanceDate &&
    parsedDates.lastMaintenanceDate === undefined
  ) {
    errors.push("Invalid lastMaintenanceDate format");
  }
  if (
    row.nextMaintenanceDate &&
    parsedDates.nextMaintenanceDate === undefined
  ) {
    errors.push("Invalid nextMaintenanceDate format");
  }

  const candidate = {
    name: row.name?.trim() ?? "",
    vehicleType: row.vehicleType?.trim().toLowerCase() ?? "",
    engineType: row.engineType?.trim().toLowerCase() ?? "",
    vehicleAgeYears: row.vehicleAgeYears,
    odometerKm: row.odometerKm,
    kilometersPerFleet: row.kilometersPerFleet,
    vehicleLifetimeYears: row.vehicleLifetimeYears,
    expectedLifetimeKm: row.expectedLifetimeKm,
    maintenanceCostUnit: row.maintenanceCostUnit,
    lastMaintenanceDate: parsedDates.lastMaintenanceDate ?? null,
    nextMaintenanceDate: parsedDates.nextMaintenanceDate ?? null,
    maintenanceIntervalKm: row.maintenanceIntervalKm,
    notes: row.notes?.trim() || null,
  };

  const result = vehicleCsvSchema.safeParse(candidate);
  if (!result.success) {
    result.error.issues.forEach((issue) => {
      errors.push(`${issue.path.join(".")}: ${issue.message}`);
    });
    return { row: rowIndex, data: row, valid: false, errors };
  }

  if (errors.length > 0) {
    return { row: rowIndex, data: row, valid: false, errors };
  }

  return {
    row: rowIndex,
    data: row,
    valid: true,
    errors: [],
    parsed: result.data,
  };
}

export const CSV_TEMPLATE_HEADERS = [
  "name",
  "vehicleType",
  "engineType",
  "vehicleAgeYears",
  "odometerKm",
  "kilometersPerFleet",
  "vehicleLifetimeYears",
  "expectedLifetimeKm",
  "maintenanceCostUnit",
  "lastMaintenanceDate",
  "nextMaintenanceDate",
  "maintenanceIntervalKm",
  "notes",
];

export function generateCsvTemplate(): string {
  return `${CSV_TEMPLATE_HEADERS.join(",")}\n`;
}

export function vehiclesToCsv(
  vehicles: Array<Record<string, string | number | null | undefined>>
): string {
  const header = CSV_TEMPLATE_HEADERS.join(",");
  const rows = vehicles.map((v) =>
    CSV_TEMPLATE_HEADERS.map((key) => {
      const value = v[key];
      if (value === null || value === undefined) return "";
      const str = String(value);
      return str.includes(",") ? `"${str.replace(/"/g, '""')}"` : str;
    }).join(",")
  );
  return [header, ...rows].join("\n");
}
