import { z } from "zod";

export const orderStatusValues = [
  "RECEIVED",
  "PREPARING",
  "ON_ROUTE",
  "ETA",
  "DELIVERED",
] as const;

export const stopAccessValues = [
  "CAR_ONLY",
  "MOTORCYCLE_ONLY",
  "BOTH",
] as const;

export const orderSchema = z.object({
  recipientAddress: z.string().min(1, "Address is required"),
  lat: z.coerce.number(),
  lng: z.coerce.number(),
  accessRequirement: z.enum(stopAccessValues),
});

export type OrderInput = z.infer<typeof orderSchema>;

export const orderStatusUpdateSchema = z.object({
  status: z.enum(orderStatusValues),
  timestamp: z.coerce.date().optional(),
});

export type OrderStatusUpdateInput = z.infer<
  typeof orderStatusUpdateSchema
>;

