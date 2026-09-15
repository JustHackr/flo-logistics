/*
  Warnings:

  - Added the required column `dataType` to the `ConditionSnapshot` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ConditionSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "regionId" TEXT NOT NULL,
    "dataType" TEXT NOT NULL,
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
INSERT INTO "new_ConditionSnapshot" ("congestionRatio", "createdAt", "expiresAt", "id", "incidentCount", "observedAt", "payloadJson", "precipitationMmPerHour", "regionId", "source", "stale", "trafficLevel", "visibilityMeters", "windKmh") SELECT "congestionRatio", "createdAt", "expiresAt", "id", "incidentCount", "observedAt", "payloadJson", "precipitationMmPerHour", "regionId", "source", "stale", "trafficLevel", "visibilityMeters", "windKmh" FROM "ConditionSnapshot";
DROP TABLE "ConditionSnapshot";
ALTER TABLE "new_ConditionSnapshot" RENAME TO "ConditionSnapshot";
CREATE INDEX "ConditionSnapshot_regionId_observedAt_idx" ON "ConditionSnapshot"("regionId", "observedAt");
CREATE INDEX "ConditionSnapshot_expiresAt_stale_idx" ON "ConditionSnapshot"("expiresAt", "stale");
CREATE UNIQUE INDEX "ConditionSnapshot_regionId_source_dataType_observedAt_key" ON "ConditionSnapshot"("regionId", "source", "dataType", "observedAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
