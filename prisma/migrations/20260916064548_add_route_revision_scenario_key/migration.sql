-- AlterTable
ALTER TABLE "RouteRevision" ADD COLUMN "scenarioKey" TEXT;

-- CreateIndex
CREATE INDEX "RouteRevision_scenarioKey_createdAt_idx" ON "RouteRevision"("scenarioKey", "createdAt");
