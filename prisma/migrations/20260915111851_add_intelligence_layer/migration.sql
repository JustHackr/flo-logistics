-- CreateTable
CREATE TABLE "IntelligenceRegion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Jakarta',
    "minLat" REAL NOT NULL,
    "minLng" REAL NOT NULL,
    "maxLat" REAL NOT NULL,
    "maxLng" REAL NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "IntelligenceConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "regionId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "refreshIntervalSec" INTEGER NOT NULL DEFAULT 300,
    "providerPriorityJson" TEXT NOT NULL DEFAULT '["google","open_meteo","tomtom"]',
    "thresholdsJson" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "IntelligenceConfig_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "IntelligenceRegion" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "IntelligenceIngestionRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "regionId" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "providersJson" TEXT NOT NULL,
    "snapshotCount" INTEGER NOT NULL DEFAULT 0,
    "incidentCount" INTEGER NOT NULL DEFAULT 0,
    "errorJson" TEXT,
    CONSTRAINT "IntelligenceIngestionRun_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "IntelligenceRegion" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ConditionSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "regionId" TEXT NOT NULL,
    "observedAt" DATETIME NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "source" TEXT NOT NULL,
    "trafficLevel" TEXT,
    "congestionRatio" REAL,
    "precipitationMmPerHour" REAL,
    "visibilityMeters" REAL,
    "windKmh" REAL,
    "incidentCount" INTEGER,
    "stale" BOOLEAN NOT NULL DEFAULT false,
    "payloadJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ConditionSnapshot_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "IntelligenceRegion" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TrafficIncident" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "regionId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "observedAt" DATETIME NOT NULL,
    "expiresAt" DATETIME,
    "category" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "lat" REAL NOT NULL,
    "lng" REAL NOT NULL,
    "description" TEXT,
    "roadClosed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TrafficIncident_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "IntelligenceRegion" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RouteConditionAssessment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "routePlanId" TEXT NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "trafficPenaltyFactor" REAL NOT NULL DEFAULT 1,
    "weatherPenaltyFactor" REAL NOT NULL DEFAULT 1,
    "incidentPenaltyFactor" REAL NOT NULL DEFAULT 1,
    "reasonsJson" TEXT NOT NULL,
    "snapshotIdsJson" TEXT NOT NULL,
    "assessedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RouteConditionAssessment_routePlanId_fkey" FOREIGN KEY ("routePlanId") REFERENCES "RoutePlan" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RouteRevision" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "routePlanId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "originalDurationMin" REAL NOT NULL,
    "revisedDurationMin" REAL NOT NULL,
    "originalDistanceKm" REAL NOT NULL,
    "revisedDistanceKm" REAL NOT NULL,
    "affectedStops" INTEGER NOT NULL DEFAULT 0,
    "reasonsJson" TEXT NOT NULL,
    "previewJson" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "approvedByUserId" TEXT,
    "rejectedByUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" DATETIME,
    "rejectedAt" DATETIME,
    CONSTRAINT "RouteRevision_routePlanId_fkey" FOREIGN KEY ("routePlanId") REFERENCES "RoutePlan" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "IntelligenceRegion_active_idx" ON "IntelligenceRegion"("active");

-- CreateIndex
CREATE UNIQUE INDEX "IntelligenceConfig_regionId_key" ON "IntelligenceConfig"("regionId");

-- CreateIndex
CREATE INDEX "IntelligenceIngestionRun_regionId_startedAt_idx" ON "IntelligenceIngestionRun"("regionId", "startedAt");

-- CreateIndex
CREATE INDEX "ConditionSnapshot_regionId_observedAt_idx" ON "ConditionSnapshot"("regionId", "observedAt");

-- CreateIndex
CREATE INDEX "ConditionSnapshot_expiresAt_stale_idx" ON "ConditionSnapshot"("expiresAt", "stale");

-- CreateIndex
CREATE UNIQUE INDEX "ConditionSnapshot_regionId_source_observedAt_key" ON "ConditionSnapshot"("regionId", "source", "observedAt");

-- CreateIndex
CREATE INDEX "TrafficIncident_regionId_observedAt_idx" ON "TrafficIncident"("regionId", "observedAt");

-- CreateIndex
CREATE INDEX "TrafficIncident_lat_lng_idx" ON "TrafficIncident"("lat", "lng");

-- CreateIndex
CREATE UNIQUE INDEX "TrafficIncident_source_externalId_key" ON "TrafficIncident"("source", "externalId");

-- CreateIndex
CREATE INDEX "RouteConditionAssessment_routePlanId_assessedAt_idx" ON "RouteConditionAssessment"("routePlanId", "assessedAt");

-- CreateIndex
CREATE INDEX "RouteRevision_routePlanId_status_idx" ON "RouteRevision"("routePlanId", "status");
