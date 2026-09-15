-- CreateTable
CREATE TABLE "FulfillmentEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "sourceSystem" TEXT NOT NULL,
    "externalEventId" TEXT,
    "status" TEXT NOT NULL,
    "occurredAt" DATETIME NOT NULL,
    "receivedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,
    "payloadJson" TEXT,
    CONSTRAINT "FulfillmentEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "IntegrationRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "connectorId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'fixture',
    "status" TEXT NOT NULL DEFAULT 'RUNNING',
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "createdCount" INTEGER NOT NULL DEFAULT 0,
    "updatedCount" INTEGER NOT NULL DEFAULT 0,
    "rejectedCount" INTEGER NOT NULL DEFAULT 0,
    "errorsJson" TEXT,
    CONSTRAINT "IntegrationRun_connectorId_fkey" FOREIGN KEY ("connectorId") REFERENCES "DataConnector" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ControlTowerException" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kind" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "dedupeKey" TEXT NOT NULL,
    "sourceSystem" TEXT,
    "reason" TEXT NOT NULL,
    "resolutionNote" TEXT,
    "detectedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledgedAt" DATETIME,
    "resolvedAt" DATETIME,
    "acknowledgedByUserId" TEXT,
    "resolvedByUserId" TEXT,
    "orderId" TEXT,
    "routePlanId" TEXT,
    "vehicleId" TEXT,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ControlTowerException_acknowledgedByUserId_fkey" FOREIGN KEY ("acknowledgedByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ControlTowerException_resolvedByUserId_fkey" FOREIGN KEY ("resolvedByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ControlTowerException_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ControlTowerException_routePlanId_fkey" FOREIGN KEY ("routePlanId") REFERENCES "RoutePlan" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ControlTowerException_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "recipientAddress" TEXT NOT NULL,
    "lat" REAL NOT NULL,
    "lng" REAL NOT NULL,
    "accessRequirement" TEXT NOT NULL DEFAULT 'BOTH',
    "status" TEXT NOT NULL DEFAULT 'RECEIVED',
    "receivedAt" DATETIME,
    "preparingAt" DATETIME,
    "onRouteAt" DATETIME,
    "etaAt" DATETIME,
    "deliveredAt" DATETIME,
    "externalOrderId" TEXT,
    "sourceSystem" TEXT NOT NULL DEFAULT 'manual',
    "promisedAt" DATETIME,
    "serviceLevel" TEXT,
    "priority" TEXT,
    "fulfillmentStatus" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "routePlanId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Order_routePlanId_fkey" FOREIGN KEY ("routePlanId") REFERENCES "RoutePlan" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Order" ("accessRequirement", "createdAt", "deliveredAt", "etaAt", "id", "lat", "lng", "onRouteAt", "preparingAt", "receivedAt", "recipientAddress", "routePlanId", "status", "updatedAt") SELECT "accessRequirement", "createdAt", "deliveredAt", "etaAt", "id", "lat", "lng", "onRouteAt", "preparingAt", "receivedAt", "recipientAddress", "routePlanId", "status", "updatedAt" FROM "Order";
DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";
CREATE UNIQUE INDEX "Order_sourceSystem_externalOrderId_key" ON "Order"("sourceSystem", "externalOrderId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "FulfillmentEvent_orderId_occurredAt_idx" ON "FulfillmentEvent"("orderId", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "FulfillmentEvent_sourceSystem_externalEventId_key" ON "FulfillmentEvent"("sourceSystem", "externalEventId");

-- CreateIndex
CREATE INDEX "IntegrationRun_connectorId_startedAt_idx" ON "IntegrationRun"("connectorId", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ControlTowerException_dedupeKey_key" ON "ControlTowerException"("dedupeKey");

-- CreateIndex
CREATE INDEX "ControlTowerException_status_severity_idx" ON "ControlTowerException"("status", "severity");

-- CreateIndex
CREATE INDEX "ControlTowerException_orderId_idx" ON "ControlTowerException"("orderId");

-- CreateIndex
CREATE INDEX "ControlTowerException_routePlanId_idx" ON "ControlTowerException"("routePlanId");
