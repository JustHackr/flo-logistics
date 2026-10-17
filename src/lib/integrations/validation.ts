import { z } from "zod";
import { isWithinJakartaBounds } from "@/lib/routing/jakarta";
import {
  FULFILLMENT_STATUS_VALUES,
  type OmsOrderInput,
  type ParsedIntegrationRows,
  type WmsFulfillmentInput,
  type IntegrationRowError,
} from "./types";

const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const omsRowSchema = z.object({
  externalOrderId: z.string().trim().min(1),
  recipientAddress: z.string().trim().min(1),
  lat: z.coerce.number(),
  lng: z.coerce.number(),
  accessRequirement: z.enum(["CAR_ONLY", "MOTORCYCLE_ONLY", "BOTH"]).default("BOTH"),
  promisedAt: z.preprocess(emptyToUndefined, z.coerce.date()),
  serviceLevel: z.string().trim().min(1).default("NEXT_DAY"),
  priority: z.string().trim().min(1).default("NORMAL"),
});

const wmsRowSchema = z.object({
  externalOrderId: z.string().trim().min(1),
  externalEventId: z.string().trim().min(1),
  status: z.enum(FULFILLMENT_STATUS_VALUES),
  occurredAt: z.preprocess(emptyToUndefined, z.coerce.date()),
  warehouseCode: z.string().trim().min(1).default("BLI-JKT-01"),
  reason: z.preprocess(emptyToUndefined, z.string().trim().optional()),
});

export function parseOmsRows(rows: unknown[]): ParsedIntegrationRows<OmsOrderInput> {
  const valid: OmsOrderInput[] = [];
  const errors: IntegrationRowError[] = [];

  rows.forEach((input, index) => {
    const result = omsRowSchema.safeParse(input);
    if (!result.success) {
      errors.push({ row: index + 2, error: result.error.issues[0]?.message ?? "Invalid row", input: (input ?? {}) as Record<string, unknown> });
      return;
    }
    if (!isWithinJakartaBounds(result.data.lat, result.data.lng)) {
      errors.push({ row: index + 2, error: "Outside Jakarta bounds", input: input as Record<string, unknown> });
      return;
    }
    valid.push(result.data);
  });

  return { valid, errors };
}

export function parseWmsRows(rows: unknown[]): ParsedIntegrationRows<WmsFulfillmentInput> {
  const valid: WmsFulfillmentInput[] = [];
  const errors: IntegrationRowError[] = [];

  rows.forEach((input, index) => {
    const result = wmsRowSchema.safeParse(input);
    if (!result.success) {
      errors.push({ row: index + 2, error: result.error.issues[0]?.message ?? "Invalid row", input: (input ?? {}) as Record<string, unknown> });
      return;
    }
    valid.push(result.data);
  });

  return { valid, errors };
}
