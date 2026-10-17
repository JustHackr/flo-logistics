-- CreateTable
CREATE TABLE "DemoScenarioRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scenarioKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'IDLE',
    "step" INTEGER NOT NULL DEFAULT 0,
    "synthetic" BOOLEAN NOT NULL DEFAULT true,
    "baselineRoutePlanId" TEXT,
    "baselineJson" TEXT,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "RouteConditionObservation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "routePlanId" TEXT NOT NULL,
    "routeStopId" TEXT,
    "snapshotId" TEXT NOT NULL,
    "regionId" TEXT NOT NULL,
    "distanceToRouteKm" REAL NOT NULL,
    "affected" BOOLEAN NOT NULL DEFAULT false,
    "relevanceScore" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RouteConditionObservation_routePlanId_fkey" FOREIGN KEY ("routePlanId") REFERENCES "RoutePlan" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RouteConditionObservation_routeStopId_fkey" FOREIGN KEY ("routeStopId") REFERENCES "RouteStop" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RouteConditionObservation_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "ConditionSnapshot" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RouteConditionObservation_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "IntelligenceRegion" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReconciliationIssue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "issueType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "orderId" TEXT,
    "integrationRunId" TEXT,
    "externalOrderId" TEXT NOT NULL,
    "omsStatus" TEXT,
    "wmsStatus" TEXT,
    "detailsJson" TEXT NOT NULL,
    "firstDetectedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastDetectedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolutionNote" TEXT,
    "resolvedByUserId" TEXT,
    "resolvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ReconciliationIssue_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReconciliationIssue_integrationRunId_fkey" FOREIGN KEY ("integrationRunId") REFERENCES "IntegrationRun" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditEvent" (
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
    CONSTRAINT "AuditEvent_trafficIncidentId_fkey" FOREIGN KEY ("trafficIncidentId") REFERENCES "TrafficIncident" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "DemoScenarioRun_updatedAt_idx" ON "DemoScenarioRun"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "DemoScenarioRun_scenarioKey_status_key" ON "DemoScenarioRun"("scenarioKey", "status");

-- CreateIndex
CREATE INDEX "RouteConditionObservation_routePlanId_affected_idx" ON "RouteConditionObservation"("routePlanId", "affected");

-- CreateIndex
CREATE INDEX "RouteConditionObservation_regionId_createdAt_idx" ON "RouteConditionObservation"("regionId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "RouteConditionObservation_routePlanId_snapshotId_routeStopId_key" ON "RouteConditionObservation"("routePlanId", "snapshotId", "routeStopId");

-- CreateIndex
CREATE INDEX "ReconciliationIssue_status_issueType_idx" ON "ReconciliationIssue"("status", "issueType");

-- CreateIndex
CREATE INDEX "ReconciliationIssue_externalOrderId_idx" ON "ReconciliationIssue"("externalOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "ReconciliationIssue_issueType_externalOrderId_status_key" ON "ReconciliationIssue"("issueType", "externalOrderId", "status");

-- CreateIndex
CREATE INDEX "AuditEvent_entityType_entityId_createdAt_idx" ON "AuditEvent"("entityType", "entityId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditEvent_eventType_createdAt_idx" ON "AuditEvent"("eventType", "createdAt");

-- CreateIndex
CREATE INDEX "AuditEvent_actorUserId_createdAt_idx" ON "AuditEvent"("actorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditEvent_regionId_createdAt_idx" ON "AuditEvent"("regionId", "createdAt");
