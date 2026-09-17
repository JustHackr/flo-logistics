CREATE TABLE "SlaRiskPrediction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "routePlanId" TEXT,
    "routeStopId" TEXT,
    "score" REAL NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "confidence" TEXT NOT NULL,
    "promisedAt" DATETIME NOT NULL,
    "predictedDeliveryAt" DATETIME,
    "remainingBufferMin" REAL,
    "factorsJson" TEXT NOT NULL,
    "reasonsJson" TEXT NOT NULL,
    "recommendation" TEXT NOT NULL,
    "sourceSnapshotIdsJson" TEXT NOT NULL,
    "dataSourcesJson" TEXT NOT NULL DEFAULT '[]',
    "generatedAt" DATETIME NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "stale" BOOLEAN NOT NULL DEFAULT false,
    "previousScore" REAL,
    "previousRiskLevel" TEXT,
    "scoreChange" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SlaRiskPrediction_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SlaRiskPrediction_routePlanId_fkey" FOREIGN KEY ("routePlanId") REFERENCES "RoutePlan" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "SlaRiskPrediction_routeStopId_fkey" FOREIGN KEY ("routeStopId") REFERENCES "RouteStop" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "SlaRiskPrediction_orderId_generatedAt_idx" ON "SlaRiskPrediction"("orderId", "generatedAt");
CREATE INDEX "SlaRiskPrediction_riskLevel_generatedAt_idx" ON "SlaRiskPrediction"("riskLevel", "generatedAt");
CREATE INDEX "SlaRiskPrediction_routePlanId_idx" ON "SlaRiskPrediction"("routePlanId");
CREATE INDEX "SlaRiskPrediction_expiresAt_stale_idx" ON "SlaRiskPrediction"("expiresAt", "stale");

ALTER TABLE "ControlTowerException" ADD COLUMN "slaRiskPredictionId" TEXT;
CREATE INDEX "ControlTowerException_slaRiskPredictionId_idx" ON "ControlTowerException"("slaRiskPredictionId");

ALTER TABLE "AuditEvent" ADD COLUMN "slaRiskPredictionId" TEXT;
CREATE INDEX "AuditEvent_slaRiskPredictionId_idx" ON "AuditEvent"("slaRiskPredictionId");
