-- CreateTable
CREATE TABLE "FuelPriceSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "region" TEXT NOT NULL,
    "effectiveLabel" TEXT,
    "sourceUrl" TEXT NOT NULL,
    "fetchMethod" TEXT NOT NULL DEFAULT 'pertamina_fallback',
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "FuelPriceItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "snapshotId" TEXT NOT NULL,
    "productCode" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "pricePerLiter" REAL NOT NULL,
    "subsidy" BOOLEAN NOT NULL DEFAULT false,
    "engineTypes" TEXT NOT NULL,
    "vehicleTypes" TEXT NOT NULL,
    CONSTRAINT "FuelPriceItem_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "FuelPriceSnapshot" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "FuelPriceSnapshot_fetchedAt_idx" ON "FuelPriceSnapshot"("fetchedAt");

-- CreateIndex
CREATE INDEX "FuelPriceItem_snapshotId_idx" ON "FuelPriceItem"("snapshotId");

-- CreateIndex
CREATE UNIQUE INDEX "FuelPriceItem_snapshotId_productCode_key" ON "FuelPriceItem"("snapshotId", "productCode");
