-- Give each request a concise study name and preserve optional free-text detail.
-- Existing descriptions were the specific study title, so migrate them to name.
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_study_requests" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patientId" TEXT NOT NULL,
    "encounterId" TEXT,
    "category" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ordered',
    "resultNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "study_requests_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "study_requests_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "encounters" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_study_requests" ("category", "createdAt", "description", "encounterId", "id", "name", "patientId", "resultNote", "status", "updatedAt")
SELECT "category", "createdAt", NULL, "encounterId", "id", "description", "patientId", "resultNote", "status", "updatedAt"
FROM "study_requests";
DROP TABLE "study_requests";
ALTER TABLE "new_study_requests" RENAME TO "study_requests";
CREATE INDEX "study_requests_patientId_status_idx" ON "study_requests"("patientId", "status");
CREATE INDEX "study_requests_encounterId_idx" ON "study_requests"("encounterId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
