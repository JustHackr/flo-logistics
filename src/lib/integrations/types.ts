export const FULFILLMENT_STATUS_VALUES = [
  "NOT_STARTED",
  "PICKING",
  "PACKED",
  "READY_FOR_DISPATCH",
  "LOADED",
  "EXCEPTION",
] as const;

export type FulfillmentStatus = (typeof FULFILLMENT_STATUS_VALUES)[number];

export type IntegrationRowError = {
  row: number;
  error: string;
  input: Record<string, unknown>;
};

export type OmsOrderInput = {
  externalOrderId: string;
  recipientAddress: string;
  lat: number;
  lng: number;
  accessRequirement: "CAR_ONLY" | "MOTORCYCLE_ONLY" | "BOTH";
  promisedAt: Date;
  serviceLevel: string;
  priority: string;
};

export type WmsFulfillmentInput = {
  externalOrderId: string;
  externalEventId: string;
  status: FulfillmentStatus;
  occurredAt: Date;
  warehouseCode: string;
  reason?: string;
};

export type ParsedIntegrationRows<T> = {
  valid: T[];
  errors: IntegrationRowError[];
};

export type IntegrationFixture = "oms-orders" | "wms-events";
