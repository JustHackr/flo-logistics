import { z } from "zod";

export const vehicleTypes = ["car", "motorcycle"] as const;
export const engineTypes = ["gasoline", "diesel", "ev"] as const;
export const dataSources = ["manual", "csv", "connector"] as const;

export const vehicleSchema = z.object({
  name: z.string().min(1, "Name is required"),
  vehicleType: z.enum(vehicleTypes),
  engineType: z.enum(engineTypes),
  vehicleAgeYears: z.coerce.number().min(0, "Age must be 0 or greater"),
  odometerKm: z.coerce.number().min(0, "Odometer must be 0 or greater"),
  kilometersPerFleet: z.coerce.number().min(0, "Kilometers per fleet must be 0 or greater"),
  vehicleLifetimeYears: z.coerce.number().positive("Lifetime years must be positive"),
  expectedLifetimeKm: z.coerce.number().positive("Expected lifetime km must be positive"),
  maintenanceCostUnit: z.coerce.number().min(0, "Maintenance cost must be 0 or greater"),
  lastMaintenanceDate: z.coerce.date().optional().nullable(),
  nextMaintenanceDate: z.coerce.date().optional().nullable(),
  maintenanceIntervalKm: z.coerce.number().positive("Maintenance interval must be positive"),
  notes: z.string().optional().nullable(),
  dataSource: z.enum(dataSources).default("manual"),
  connectorId: z.string().optional().nullable(),
});

export type VehicleInput = z.infer<typeof vehicleSchema>;

export const vehicleCsvSchema = vehicleSchema.omit({ dataSource: true, connectorId: true });

export type VehicleCsvInput = z.infer<typeof vehicleCsvSchema>;
