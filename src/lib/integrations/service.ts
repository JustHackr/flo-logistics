import { prisma } from "@/lib/prisma";
import { getIntegrationFixture } from "./fixtures";
import { parseOmsRows, parseWmsRows } from "./validation";
import type {
  IntegrationFixture,
  IntegrationRowError,
  OmsOrderInput,
  WmsFulfillmentInput,
} from "./types";

type ConnectorForSync = {
  id: string;
  type: string;
  name: string;
};

export type SyncResult = {
  runId: string;
  kind: "OMS_ORDERS" | "WMS_FULFILLMENT";
  status: "SUCCEEDED" | "PARTIAL" | "FAILED";
  created: number;
  updated: number;
  rejected: number;
  errors: IntegrationRowError[];
};

function sourceSystemFor(connector: ConnectorForSync) {
  return connector.type === "oms" ? "blibli_oms" : "blibli_wms";
}

export function parseSyncRows(
  kind: "OMS_ORDERS" | "WMS_FULFILLMENT",
  rows: unknown[],
) {
  return kind === "OMS_ORDERS" ? parseOmsRows(rows) : parseWmsRows(rows);
}

export async function runIntegrationSync(input: {
  connector: ConnectorForSync;
  fixture?: IntegrationFixture;
  rows: unknown[];
  mode: "fixture" | "file" | "json";
}): Promise<SyncResult> {
  const kind = input.connector.type === "oms" ? "OMS_ORDERS" : "WMS_FULFILLMENT";
  const sourceSystem = sourceSystemFor(input.connector);
  const fixtureMatchesKind =
    input.fixture === undefined ||
    (kind === "OMS_ORDERS" && input.fixture === "oms-orders") ||
    (kind === "WMS_FULFILLMENT" && input.fixture === "wms-events");

  if (!fixtureMatchesKind) {
    throw new Error("Fixture does not match connector type");
  }

  const rows = input.fixture ? getIntegrationFixture(input.fixture) : input.rows;
  const parsed = parseSyncRows(kind, rows);
  const run = await prisma.integrationRun.create({
    data: {
      connectorId: input.connector.id,
      kind,
      mode: input.mode,
      status: "RUNNING",
      rejectedCount: parsed.errors.length,
      errorsJson: parsed.errors.length > 0 ? JSON.stringify(parsed.errors) : null,
    },
  });

  let created = 0;
  let updated = 0;
  const errors = [...parsed.errors];

  try {
    if (kind === "OMS_ORDERS") {
      const result = await applyOmsRows(sourceSystem, run.id, parsed.valid as OmsOrderInput[]);
      created = result.created;
      updated = result.updated;
    } else {
      const result = await applyWmsRows(sourceSystem, run.id, parsed.valid as WmsFulfillmentInput[]);
      created = result.created;
      updated = result.updated;
      errors.push(...result.errors);
    }

    const status = errors.length === 0 ? "SUCCEEDED" : created + updated > 0 ? "PARTIAL" : "FAILED";
    await prisma.integrationRun.update({
      where: { id: run.id },
      data: {
        status,
        completedAt: new Date(),
        createdCount: created,
        updatedCount: updated,
        rejectedCount: errors.length,
        errorsJson: errors.length > 0 ? JSON.stringify(errors) : null,
      },
    });
    await prisma.dataConnector.update({
      where: { id: input.connector.id },
      data: { status: "active" },
    });

    return { runId: run.id, kind, status, created, updated, rejected: errors.length, errors };
  } catch (error) {
    await prisma.integrationRun.update({
      where: { id: run.id },
      data: {
        status: "FAILED",
        completedAt: new Date(),
        createdCount: created,
        updatedCount: updated,
        rejectedCount: errors.length,
        errorsJson: JSON.stringify([
          ...errors,
          { row: 0, error: error instanceof Error ? error.message : "Sync failed", input: {} },
        ]),
      },
    });
    throw error;
  }
}

async function applyOmsRows(sourceSystem: string, runId: string, rows: OmsOrderInput[]) {
  let created = 0;
  let updated = 0;
  await prisma.$transaction(async (tx) => {
    for (const row of rows) {
      const existing = await tx.order.findUnique({
        where: { sourceSystem_externalOrderId: { sourceSystem, externalOrderId: row.externalOrderId } },
        select: { id: true },
      });
      await tx.order.upsert({
        where: { sourceSystem_externalOrderId: { sourceSystem, externalOrderId: row.externalOrderId } },
        create: {
          externalOrderId: row.externalOrderId,
          sourceSystem,
          recipientAddress: row.recipientAddress,
          lat: row.lat,
          lng: row.lng,
          accessRequirement: row.accessRequirement,
          promisedAt: row.promisedAt,
          serviceLevel: row.serviceLevel,
          priority: row.priority,
          status: "RECEIVED",
          receivedAt: new Date(),
        },
        update: {
          recipientAddress: row.recipientAddress,
          lat: row.lat,
          lng: row.lng,
          accessRequirement: row.accessRequirement,
          promisedAt: row.promisedAt,
          serviceLevel: row.serviceLevel,
          priority: row.priority,
        },
      });
      if (existing) updated += 1;
      else created += 1;
    }
    void runId;
  });
  return { created, updated };
}

async function applyWmsRows(sourceSystem: string, runId: string, rows: WmsFulfillmentInput[]) {
  let created = 0;
  let updated = 0;
  const errors: IntegrationRowError[] = [];

  await prisma.$transaction(async (tx) => {
    for (const [index, row] of rows.entries()) {
      const order = await tx.order.findUnique({
        where: { sourceSystem_externalOrderId: { sourceSystem: "blibli_oms", externalOrderId: row.externalOrderId } },
        select: { id: true },
      });
      if (!order) {
        errors.push({ row: index + 2, error: `Unknown OMS order ${row.externalOrderId}`, input: row });
        continue;
      }

      const existingEvent = await tx.fulfillmentEvent.findUnique({
        where: { sourceSystem_externalEventId: { sourceSystem, externalEventId: row.externalEventId } },
        select: { id: true },
      });
      if (existingEvent) {
        updated += 1;
        continue;
      }

      await tx.fulfillmentEvent.create({
        data: {
          orderId: order.id,
          sourceSystem,
          externalEventId: row.externalEventId,
          status: row.status,
          occurredAt: row.occurredAt,
          reason: row.reason,
          payloadJson: JSON.stringify(row),
        },
      });
      await tx.order.update({
        where: { id: order.id },
        data: { fulfillmentStatus: row.status },
      });
      created += 1;
    }
    void runId;
  });

  return { created, updated, errors };
}
