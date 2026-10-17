-- CreateTable
CREATE TABLE "ReturnCase" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "externalReturnId" TEXT NOT NULL,
    "orderId" TEXT,
    "parcelId" TEXT,
    "customerReference" TEXT,
    "reason" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'REQUESTED',
    "expectedHub" TEXT NOT NULL,
    "sourceSystem" TEXT NOT NULL DEFAULT 'fixture',
    "dataSource" TEXT NOT NULL DEFAULT 'SYNTHETIC',
    "riskLevel" TEXT NOT NULL DEFAULT 'LOW',
    "riskScore" REAL NOT NULL DEFAULT 0,
    "currentSku" TEXT,
    "expectedSku" TEXT,
    "expectedSerial" TEXT,
    "currentSerial" TEXT,
    "expectedWeightKg" REAL,
    "observedWeightKg" REAL,
    "openedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT,
    CONSTRAINT "ReturnCase_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ReturnCase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReturnParcel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "returnCaseId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "qrPayload" TEXT,
    "barcodePayload" TEXT,
    "sku" TEXT,
    "serialNumber" TEXT,
    "expectedHub" TEXT NOT NULL,
    "currentHub" TEXT,
    "weightKg" REAL,
    "dimensionsJson" TEXT,
    "custodyStatus" TEXT NOT NULL DEFAULT 'EXPECTED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ReturnParcel_returnCaseId_fkey" FOREIGN KEY ("returnCaseId") REFERENCES "ReturnCase" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReturnEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "returnCaseId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "fromState" TEXT,
    "toState" TEXT,
    "externalEventId" TEXT,
    "sourceSystem" TEXT NOT NULL DEFAULT 'flo',
    "dataSource" TEXT NOT NULL DEFAULT 'LIVE',
    "location" TEXT,
    "payloadJson" TEXT,
    "actorUserId" TEXT,
    "occurredAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReturnEvent_returnCaseId_fkey" FOREIGN KEY ("returnCaseId") REFERENCES "ReturnCase" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReturnEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReturnScan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "returnCaseId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "format" TEXT NOT NULL DEFAULT 'QR_CODE',
    "stage" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "hubCode" TEXT,
    "expectedHub" TEXT,
    "source" TEXT NOT NULL DEFAULT 'SYNTHETIC',
    "reason" TEXT,
    "metadataJson" TEXT,
    "actorUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReturnScan_returnCaseId_fkey" FOREIGN KEY ("returnCaseId") REFERENCES "ReturnCase" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReturnScan_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReturnInspection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "returnCaseId" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "checklistJson" TEXT NOT NULL,
    "cvResultJson" TEXT,
    "notes" TEXT,
    "evidenceCount" INTEGER NOT NULL DEFAULT 0,
    "source" TEXT NOT NULL DEFAULT 'MANUAL_AND_FIXTURE',
    "actorUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReturnInspection_returnCaseId_fkey" FOREIGN KEY ("returnCaseId") REFERENCES "ReturnCase" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReturnInspection_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InspectionEvidence" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "inspectionId" TEXT NOT NULL,
    "evidenceType" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "score" REAL,
    "metadataJson" TEXT,
    "storageRef" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InspectionEvidence_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "ReturnInspection" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReturnFraudAssessment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "returnCaseId" TEXT NOT NULL,
    "score" REAL NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "confidence" TEXT NOT NULL,
    "reasonsJson" TEXT NOT NULL,
    "signalsJson" TEXT NOT NULL,
    "recommendation" TEXT NOT NULL,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
    "sourceEventIdsJson" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorUserId" TEXT,
    CONSTRAINT "ReturnFraudAssessment_returnCaseId_fkey" FOREIGN KEY ("returnCaseId") REFERENCES "ReturnCase" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReturnFraudAssessment_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RefundDecision" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "returnCaseId" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "rationale" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PREVIEW',
    "source" TEXT NOT NULL DEFAULT 'RULE_ENGINE',
    "actorUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" DATETIME,
    CONSTRAINT "RefundDecision_returnCaseId_fkey" FOREIGN KEY ("returnCaseId") REFERENCES "ReturnCase" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RefundDecision_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DispositionDecision" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "returnCaseId" TEXT NOT NULL,
    "disposition" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PREVIEW',
    "rationale" TEXT NOT NULL,
    "recoveryValue" REAL NOT NULL DEFAULT 0,
    "totalCost" REAL NOT NULL DEFAULT 0,
    "netRecovery" REAL NOT NULL DEFAULT 0,
    "source" TEXT NOT NULL DEFAULT 'RULE_ENGINE',
    "actorUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" DATETIME,
    CONSTRAINT "DispositionDecision_returnCaseId_fkey" FOREIGN KEY ("returnCaseId") REFERENCES "ReturnCase" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DispositionDecision_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReturnCostEstimate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "returnCaseId" TEXT NOT NULL,
    "pickupCost" REAL NOT NULL DEFAULT 0,
    "transportCost" REAL NOT NULL DEFAULT 0,
    "hubLaborCost" REAL NOT NULL DEFAULT 0,
    "inspectionCost" REAL NOT NULL DEFAULT 0,
    "repackCost" REAL NOT NULL DEFAULT 0,
    "repairCost" REAL NOT NULL DEFAULT 0,
    "recycleCost" REAL NOT NULL DEFAULT 0,
    "refundCost" REAL NOT NULL DEFAULT 0,
    "totalCost" REAL NOT NULL DEFAULT 0,
    "recoveryValue" REAL NOT NULL DEFAULT 0,
    "netRecovery" REAL NOT NULL DEFAULT 0,
    "isEstimate" BOOLEAN NOT NULL DEFAULT true,
    "assumptionsJson" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReturnCostEstimate_returnCaseId_fkey" FOREIGN KEY ("returnCaseId") REFERENCES "ReturnCase" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReturnCarbonEstimate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "returnCaseId" TEXT NOT NULL,
    "reverseRouteKg" REAL NOT NULL DEFAULT 0,
    "handlingKg" REAL NOT NULL DEFAULT 0,
    "repairKg" REAL NOT NULL DEFAULT 0,
    "recycleKg" REAL NOT NULL DEFAULT 0,
    "totalKg" REAL NOT NULL DEFAULT 0,
    "isEstimate" BOOLEAN NOT NULL DEFAULT true,
    "assumptionsJson" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReturnCarbonEstimate_returnCaseId_fkey" FOREIGN KEY ("returnCaseId") REFERENCES "ReturnCase" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReturnException" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "returnCaseId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "reason" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "evidenceJson" TEXT,
    "recommendation" TEXT,
    "acknowledgedAt" DATETIME,
    "resolvedAt" DATETIME,
    "resolvedByUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ReturnException_returnCaseId_fkey" FOREIGN KEY ("returnCaseId") REFERENCES "ReturnCase" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReturnPolicy" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "refundWindowDays" INTEGER NOT NULL DEFAULT 30,
    "autoRestock" BOOLEAN NOT NULL DEFAULT false,
    "requireHighRiskApproval" BOOLEAN NOT NULL DEFAULT true,
    "thresholdsJson" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "returnCaseId" TEXT,
    CONSTRAINT "ReturnPolicy_returnCaseId_fkey" FOREIGN KEY ("returnCaseId") REFERENCES "ReturnCase" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AuditEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventType" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "reason" TEXT,
    "actorUserId" TEXT,
    "actorRole" TEXT,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "beforeJson" TEXT,
    "afterJson" TEXT,
    "metadataJson" TEXT,
    "sourceSystem" TEXT,
    "provider" TEXT,
    "regionId" TEXT,
    "routePlanId" TEXT,
    "routeRevisionId" TEXT,
    "exceptionId" TEXT,
    "snapshotId" TEXT,
    "ingestionRunId" TEXT,
    "integrationRunId" TEXT,
    "connectorId" TEXT,
    "conditionAssessmentId" TEXT,
    "trafficIncidentId" TEXT,
    "slaRiskPredictionId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditEvent_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "IntelligenceRegion" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AuditEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AuditEvent_routePlanId_fkey" FOREIGN KEY ("routePlanId") REFERENCES "RoutePlan" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AuditEvent_routeRevisionId_fkey" FOREIGN KEY ("routeRevisionId") REFERENCES "RouteRevision" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AuditEvent_exceptionId_fkey" FOREIGN KEY ("exceptionId") REFERENCES "ControlTowerException" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AuditEvent_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "ConditionSnapshot" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AuditEvent_ingestionRunId_fkey" FOREIGN KEY ("ingestionRunId") REFERENCES "IntelligenceIngestionRun" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AuditEvent_integrationRunId_fkey" FOREIGN KEY ("integrationRunId") REFERENCES "IntegrationRun" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AuditEvent_connectorId_fkey" FOREIGN KEY ("connectorId") REFERENCES "DataConnector" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AuditEvent_conditionAssessmentId_fkey" FOREIGN KEY ("conditionAssessmentId") REFERENCES "RouteConditionAssessment" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AuditEvent_trafficIncidentId_fkey" FOREIGN KEY ("trafficIncidentId") REFERENCES "TrafficIncident" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AuditEvent_slaRiskPredictionId_fkey" FOREIGN KEY ("slaRiskPredictionId") REFERENCES "SlaRiskPrediction" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_AuditEvent" ("action", "actorRole", "actorUserId", "afterJson", "beforeJson", "conditionAssessmentId", "connectorId", "createdAt", "entityId", "entityType", "eventType", "exceptionId", "id", "ingestionRunId", "integrationRunId", "metadataJson", "provider", "reason", "regionId", "routePlanId", "routeRevisionId", "slaRiskPredictionId", "snapshotId", "sourceSystem", "summary", "trafficIncidentId") SELECT "action", "actorRole", "actorUserId", "afterJson", "beforeJson", "conditionAssessmentId", "connectorId", "createdAt", "entityId", "entityType", "eventType", "exceptionId", "id", "ingestionRunId", "integrationRunId", "metadataJson", "provider", "reason", "regionId", "routePlanId", "routeRevisionId", "slaRiskPredictionId", "snapshotId", "sourceSystem", "summary", "trafficIncidentId" FROM "AuditEvent";
DROP TABLE "AuditEvent";
ALTER TABLE "new_AuditEvent" RENAME TO "AuditEvent";
CREATE INDEX "AuditEvent_entityType_entityId_createdAt_idx" ON "AuditEvent"("entityType", "entityId", "createdAt");
CREATE INDEX "AuditEvent_eventType_createdAt_idx" ON "AuditEvent"("eventType", "createdAt");
CREATE INDEX "AuditEvent_actorUserId_createdAt_idx" ON "AuditEvent"("actorUserId", "createdAt");
CREATE INDEX "AuditEvent_regionId_createdAt_idx" ON "AuditEvent"("regionId", "createdAt");
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
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ControlTowerException_acknowledgedByUserId_fkey" FOREIGN KEY ("acknowledgedByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ControlTowerException_resolvedByUserId_fkey" FOREIGN KEY ("resolvedByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ControlTowerException_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ControlTowerException_routePlanId_fkey" FOREIGN KEY ("routePlanId") REFERENCES "RoutePlan" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ControlTowerException_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ControlTowerException_slaRiskPredictionId_fkey" FOREIGN KEY ("slaRiskPredictionId") REFERENCES "SlaRiskPrediction" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ControlTowerException_returnCaseId_fkey" FOREIGN KEY ("returnCaseId") REFERENCES "ReturnCase" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ControlTowerException" ("acknowledgedAt", "acknowledgedByUserId", "dedupeKey", "detectedAt", "id", "kind", "orderId", "reason", "resolutionNote", "resolvedAt", "resolvedByUserId", "routePlanId", "severity", "slaRiskPredictionId", "sourceSystem", "status", "updatedAt", "vehicleId") SELECT "acknowledgedAt", "acknowledgedByUserId", "dedupeKey", "detectedAt", "id", "kind", "orderId", "reason", "resolutionNote", "resolvedAt", "resolvedByUserId", "routePlanId", "severity", "slaRiskPredictionId", "sourceSystem", "status", "updatedAt", "vehicleId" FROM "ControlTowerException";
DROP TABLE "ControlTowerException";
ALTER TABLE "new_ControlTowerException" RENAME TO "ControlTowerException";
CREATE UNIQUE INDEX "ControlTowerException_dedupeKey_key" ON "ControlTowerException"("dedupeKey");
CREATE INDEX "ControlTowerException_status_severity_idx" ON "ControlTowerException"("status", "severity");
CREATE INDEX "ControlTowerException_orderId_idx" ON "ControlTowerException"("orderId");
CREATE INDEX "ControlTowerException_routePlanId_idx" ON "ControlTowerException"("routePlanId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "ReturnCase_externalReturnId_key" ON "ReturnCase"("externalReturnId");

-- CreateIndex
CREATE INDEX "ReturnCase_state_updatedAt_idx" ON "ReturnCase"("state", "updatedAt");

-- CreateIndex
CREATE INDEX "ReturnCase_orderId_idx" ON "ReturnCase"("orderId");

-- CreateIndex
CREATE INDEX "ReturnCase_parcelId_idx" ON "ReturnCase"("parcelId");

-- CreateIndex
CREATE INDEX "ReturnCase_expectedHub_state_idx" ON "ReturnCase"("expectedHub", "state");

-- CreateIndex
CREATE INDEX "ReturnCase_riskLevel_updatedAt_idx" ON "ReturnCase"("riskLevel", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ReturnParcel_returnCaseId_key" ON "ReturnParcel"("returnCaseId");

-- CreateIndex
CREATE INDEX "ReturnParcel_expectedHub_currentHub_idx" ON "ReturnParcel"("expectedHub", "currentHub");

-- CreateIndex
CREATE UNIQUE INDEX "ReturnParcel_code_key" ON "ReturnParcel"("code");

-- CreateIndex
CREATE INDEX "ReturnEvent_returnCaseId_occurredAt_idx" ON "ReturnEvent"("returnCaseId", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "ReturnEvent_sourceSystem_externalEventId_key" ON "ReturnEvent"("sourceSystem", "externalEventId");

-- CreateIndex
CREATE INDEX "ReturnScan_returnCaseId_createdAt_idx" ON "ReturnScan"("returnCaseId", "createdAt");

-- CreateIndex
CREATE INDEX "ReturnScan_code_outcome_idx" ON "ReturnScan"("code", "outcome");

-- CreateIndex
CREATE INDEX "ReturnInspection_returnCaseId_createdAt_idx" ON "ReturnInspection"("returnCaseId", "createdAt");

-- CreateIndex
CREATE INDEX "ReturnFraudAssessment_returnCaseId_createdAt_idx" ON "ReturnFraudAssessment"("returnCaseId", "createdAt");

-- CreateIndex
CREATE INDEX "ReturnFraudAssessment_riskLevel_createdAt_idx" ON "ReturnFraudAssessment"("riskLevel", "createdAt");

-- CreateIndex
CREATE INDEX "RefundDecision_returnCaseId_createdAt_idx" ON "RefundDecision"("returnCaseId", "createdAt");

-- CreateIndex
CREATE INDEX "DispositionDecision_returnCaseId_createdAt_idx" ON "DispositionDecision"("returnCaseId", "createdAt");

-- CreateIndex
CREATE INDEX "ReturnCostEstimate_returnCaseId_createdAt_idx" ON "ReturnCostEstimate"("returnCaseId", "createdAt");

-- CreateIndex
CREATE INDEX "ReturnCarbonEstimate_returnCaseId_createdAt_idx" ON "ReturnCarbonEstimate"("returnCaseId", "createdAt");

-- CreateIndex
CREATE INDEX "ReturnException_status_severity_idx" ON "ReturnException"("status", "severity");

-- CreateIndex
CREATE INDEX "ReturnException_returnCaseId_createdAt_idx" ON "ReturnException"("returnCaseId", "createdAt");

-- CreateIndex
CREATE INDEX "ReturnPolicy_active_idx" ON "ReturnPolicy"("active");
