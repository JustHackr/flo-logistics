import { z } from "zod";

export const connectorTypes = [
  "iot",
  "rest_api",
  "webhook",
  "telematics",
  "csv_scheduled",
  "oms",
  "wms",
] as const;

export const connectorStatuses = ["disabled", "planned", "active"] as const;

export const connectorConfigSchema = z.object({
  endpointUrl: z.string().url().optional().or(z.literal("")),
  apiKey: z.string().optional(),
  pollingIntervalMinutes: z.coerce.number().positive().optional(),
  webhookSecret: z.string().optional(),
});

export const connectorSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(connectorTypes),
  status: z.enum(connectorStatuses).default("disabled"),
  config: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
});

export type ConnectorInput = z.infer<typeof connectorSchema>;
