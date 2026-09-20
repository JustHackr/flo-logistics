-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AiProviderConfig" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "mode" TEXT NOT NULL DEFAULT 'sovereign',
    "apiKey" TEXT NOT NULL DEFAULT '',
    "baseUrl" TEXT NOT NULL DEFAULT '',
    "model" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_AiProviderConfig" ("id", "mode", "apiKey", "baseUrl", "model", "createdAt", "updatedAt")
SELECT "id", 'openai_compatible', "apiKey", "baseUrl", "model", "createdAt", "updatedAt" FROM "AiProviderConfig";
DROP TABLE "AiProviderConfig";
ALTER TABLE "new_AiProviderConfig" RENAME TO "AiProviderConfig";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
