-- CreateTable
CREATE TABLE "CustodyParcel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "externalParcelId" TEXT NOT NULL,
    "orderId" TEXT,
    "returnCaseId" TEXT,
    "barcode" TEXT,
    "qrPayload" TEXT,
    "sku" TEXT,
    "serialNumber" TEXT,
    "originHub" TEXT,
    "destinationHub" TEXT,
    "currentState" TEXT NOT NULL DEFAULT 'CREATED',
    "currentLocation" TEXT,
    "currentCustodianId" TEXT,
    "confidenceScore" REAL NOT NULL DEFAULT 0,
    "riskLevel" TEXT NOT NULL DEFAULT 'CRITICAL',
    "dataSource" TEXT NOT NULL DEFAULT 'SYNTHETIC',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CustodyParcel_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CustodyParcel_returnCaseId_fkey" FOREIGN KEY ("returnCaseId") REFERENCES "ReturnCase" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CustodyParcel_currentCustodianId_fkey" FOREIGN KEY ("currentCustodianId") REFERENCES "CustodyActor" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CustodyActor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "actorType" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "hubCode" TEXT,
    "vehicleCode" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CustodyEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "parcelId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "externalEventId" TEXT NOT NULL,
    "sourceSystem" TEXT NOT NULL,
    "source" TEXT,
    "dataSource" TEXT NOT NULL DEFAULT 'SYNTHETIC',
    "fromActorId" TEXT,
    "toActorId" TEXT,
    "actorUserId" TEXT,
    "hubCode" TEXT,
    "lat" REAL,
    "lng" REAL,
    "scanMethod" TEXT,
    "correlationId" TEXT,
    "validationStatus" TEXT NOT NULL DEFAULT 'MANUAL_REVIEW',
    "validationJson" TEXT,
    "confidenceDelta" INTEGER NOT NULL DEFAULT 0,
    "payloadJson" TEXT,
    "observedAt" DATETIME NOT NULL,
    "receivedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CustodyEvent_parcelId_fkey" FOREIGN KEY ("parcelId") REFERENCES "CustodyParcel" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CustodyEvent_fromActorId_fkey" FOREIGN KEY ("fromActorId") REFERENCES "CustodyActor" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CustodyEvent_toActorId_fkey" FOREIGN KEY ("toActorId") REFERENCES "CustodyActor" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CustodyEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CustodyEvidence" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "parcelId" TEXT NOT NULL,
    "eventId" TEXT,
    "evidenceType" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "metadataJson" TEXT,
    "capturedAt" DATETIME,
    "createdByUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CustodyEvidence_parcelId_fkey" FOREIGN KEY ("parcelId") REFERENCES "CustodyParcel" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CustodyEvidence_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "CustodyEvent" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CustodyEvidence_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CustodyAnomaly" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "parcelId" TEXT NOT NULL,
    "eventId" TEXT,
    "kind" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "dedupeKey" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "sourceEventIdsJson" TEXT NOT NULL DEFAULT '[]',
    "candidateCustodianIdsJson" TEXT NOT NULL DEFAULT '[]',
    "recommendedAction" TEXT NOT NULL,
    "dataSource" TEXT NOT NULL DEFAULT 'SYNTHETIC',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledgedAt" DATETIME,
    "resolvedAt" DATETIME,
    "resolvedByUserId" TEXT,
    CONSTRAINT "CustodyAnomaly_parcelId_fkey" FOREIGN KEY ("parcelId") REFERENCES "CustodyParcel" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CustodyAnomaly_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "CustodyEvent" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CustodyInvestigation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "parcelId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "finding" TEXT,
    "confidence" INTEGER,
    "assignedToUserId" TEXT,
    "notesJson" TEXT NOT NULL DEFAULT '[]',
    "resolutionNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "resolvedAt" DATETIME,
    CONSTRAINT "CustodyInvestigation_parcelId_fkey" FOREIGN KEY ("parcelId") REFERENCES "CustodyParcel" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CustodyInvestigation_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_CustodyActorToCustodyAnomaly" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_CustodyActorToCustodyAnomaly_A_fkey" FOREIGN KEY ("A") REFERENCES "CustodyActor" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_CustodyActorToCustodyAnomaly_B_fkey" FOREIGN KEY ("B") REFERENCES "CustodyAnomaly" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ControlTowerException" (
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
    "slaRiskPredictionId" TEXT,
    "returnCaseId" TEXT,
    "custodyParcelId" TEXT,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ControlTowerException_acknowledgedByUserId_fkey" FOREIGN KEY ("acknowledgedByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ControlTowerException_resolvedByUserId_fkey" FOREIGN KEY ("resolvedByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ControlTowerException_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ControlTowerException_routePlanId_fkey" FOREIGN KEY ("routePlanId") REFERENCES "RoutePlan" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ControlTowerException_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ControlTowerException_slaRiskPredictionId_fkey" FOREIGN KEY ("slaRiskPredictionId") REFERENCES "SlaRiskPrediction" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ControlTowerException_returnCaseId_fkey" FOREIGN KEY ("returnCaseId") REFERENCES "ReturnCase" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ControlTowerException_custodyParcelId_fkey" FOREIGN KEY ("custodyParcelId") REFERENCES "CustodyParcel" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ControlTowerException" ("acknowledgedAt", "acknowledgedByUserId", "dedupeKey", "detectedAt", "id", "kind", "orderId", "reason", "resolutionNote", "resolvedAt", "resolvedByUserId", "returnCaseId", "routePlanId", "severity", "slaRiskPredictionId", "sourceSystem", "status", "updatedAt", "vehicleId") SELECT "acknowledgedAt", "acknowledgedByUserId", "dedupeKey", "detectedAt", "id", "kind", "orderId", "reason", "resolutionNote", "resolvedAt", "resolvedByUserId", "returnCaseId", "routePlanId", "severity", "slaRiskPredictionId", "sourceSystem", "status", "updatedAt", "vehicleId" FROM "ControlTowerException";
DROP TABLE "ControlTowerException";
ALTER TABLE "new_ControlTowerException" RENAME TO "ControlTowerException";
CREATE UNIQUE INDEX "ControlTowerException_dedupeKey_key" ON "ControlTowerException"("dedupeKey");
CREATE INDEX "ControlTowerException_status_severity_idx" ON "ControlTowerException"("status", "severity");
CREATE INDEX "ControlTowerException_orderId_idx" ON "ControlTowerException"("orderId");
CREATE INDEX "ControlTowerException_routePlanId_idx" ON "ControlTowerException"("routePlanId");
CREATE INDEX "ControlTowerException_custodyParcelId_idx" ON "ControlTowerException"("custodyParcelId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "CustodyParcel_externalParcelId_key" ON "CustodyParcel"("externalParcelId");

-- CreateIndex
CREATE INDEX "CustodyParcel_orderId_idx" ON "CustodyParcel"("orderId");

-- CreateIndex
CREATE INDEX "CustodyParcel_returnCaseId_idx" ON "CustodyParcel"("returnCaseId");

-- CreateIndex
CREATE INDEX "CustodyParcel_currentCustodianId_idx" ON "CustodyParcel"("currentCustodianId");

-- CreateIndex
CREATE INDEX "CustodyParcel_riskLevel_updatedAt_idx" ON "CustodyParcel"("riskLevel", "updatedAt");

-- CreateIndex
CREATE INDEX "CustodyActor_actorType_active_idx" ON "CustodyActor"("actorType", "active");

-- CreateIndex
CREATE INDEX "CustodyActor_hubCode_idx" ON "CustodyActor"("hubCode");

-- CreateIndex
CREATE UNIQUE INDEX "CustodyActor_actorType_externalId_key" ON "CustodyActor"("actorType", "externalId");

-- CreateIndex
CREATE INDEX "CustodyEvent_parcelId_observedAt_idx" ON "CustodyEvent"("parcelId", "observedAt");

-- CreateIndex
CREATE INDEX "CustodyEvent_validationStatus_observedAt_idx" ON "CustodyEvent"("validationStatus", "observedAt");

-- CreateIndex
CREATE INDEX "CustodyEvent_hubCode_observedAt_idx" ON "CustodyEvent"("hubCode", "observedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CustodyEvent_sourceSystem_externalEventId_key" ON "CustodyEvent"("sourceSystem", "externalEventId");

-- CreateIndex
CREATE INDEX "CustodyEvidence_parcelId_createdAt_idx" ON "CustodyEvidence"("parcelId", "createdAt");

-- CreateIndex
CREATE INDEX "CustodyEvidence_eventId_idx" ON "CustodyEvidence"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "CustodyAnomaly_dedupeKey_key" ON "CustodyAnomaly"("dedupeKey");

-- CreateIndex
CREATE INDEX "CustodyAnomaly_parcelId_status_idx" ON "CustodyAnomaly"("parcelId", "status");

-- CreateIndex
CREATE INDEX "CustodyAnomaly_kind_severity_idx" ON "CustodyAnomaly"("kind", "severity");

-- CreateIndex
CREATE INDEX "CustodyInvestigation_parcelId_status_idx" ON "CustodyInvestigation"("parcelId", "status");

-- CreateIndex
CREATE INDEX "CustodyInvestigation_assignedToUserId_status_idx" ON "CustodyInvestigation"("assignedToUserId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "_CustodyActorToCustodyAnomaly_AB_unique" ON "_CustodyActorToCustodyAnomaly"("A", "B");

-- CreateIndex
CREATE INDEX "_CustodyActorToCustodyAnomaly_B_index" ON "_CustodyActorToCustodyAnomaly"("B");
