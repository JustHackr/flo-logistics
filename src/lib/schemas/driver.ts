import { z } from "zod";

export const driverSchema = z.object({
  name: z.string().min(1, "Driver name is required"),
  phone: z.string().optional().nullable(),
  employeeId: z.string().optional().nullable(),
  licenseNumber: z.string().optional().nullable(),
  vehicleId: z.string().min(1, "vehicleId is required"),
  status: z.string().optional().nullable(),
});

export type DriverInput = z.infer<typeof driverSchema>;
