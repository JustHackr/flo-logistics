-- Persist every verification decision so warehouse operators can audit the scan,
-- the source, and the checks that led to the outcome.
CREATE TABLE "ParcelVerificationScan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "format" TEXT NOT NULL DEFAULT 'BARCODE',
    "outcome" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "checksJson" TEXT NOT NULL,
    "fixtureId" TEXT,
    "orderId" TEXT,
    "routePlanId" TEXT,
    "actorUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ParcelVerificationScan_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ParcelVerificationScan_routePlanId_fkey" FOREIGN KEY ("routePlanId") REFERENCES "RoutePlan" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ParcelVerificationScan_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "ParcelVerificationScan_code_createdAt_idx" ON "ParcelVerificationScan"("code", "createdAt");
CREATE INDEX "ParcelVerificationScan_outcome_createdAt_idx" ON "ParcelVerificationScan"("outcome", "createdAt");
CREATE INDEX "ParcelVerificationScan_orderId_idx" ON "ParcelVerificationScan"("orderId");
