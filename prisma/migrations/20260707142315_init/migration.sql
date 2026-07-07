-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "vehicleType" TEXT NOT NULL,
    "engineType" TEXT NOT NULL,
    "vehicleAgeYears" REAL NOT NULL,
    "odometerKm" REAL NOT NULL,
    "kilometersPerFleet" REAL NOT NULL,
    "vehicleLifetimeYears" REAL NOT NULL,
    "expectedLifetimeKm" REAL NOT NULL,
    "maintenanceCostUnit" REAL NOT NULL,
    "lastMaintenanceDate" DATETIME,
    "nextMaintenanceDate" DATETIME,
    "maintenanceIntervalKm" REAL NOT NULL,
    "notes" TEXT,
    "dataSource" TEXT NOT NULL DEFAULT 'manual',
    "connectorId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Vehicle_connectorId_fkey" FOREIGN KEY ("connectorId") REFERENCES "DataConnector" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DataConnector" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'disabled',
    "config" TEXT,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
