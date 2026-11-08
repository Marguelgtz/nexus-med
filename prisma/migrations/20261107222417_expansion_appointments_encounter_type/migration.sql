-- CreateTable
CREATE TABLE "appointments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patientId" TEXT NOT NULL,
    "startAt" DATETIME NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "actualDurationMinutes" INTEGER,
    "completedAt" DATETIME,
    "linkedEncounterId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "appointments_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "appointments_linkedEncounterId_fkey" FOREIGN KEY ("linkedEncounterId") REFERENCES "encounters" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_encounters" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patientId" TEXT NOT NULL,
    "occurredAt" DATETIME NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'consulta',
    "reason" TEXT,
    "historyOfPresentIllness" TEXT,
    "relevantHistory" TEXT,
    "physicalExamination" TEXT,
    "assessment" TEXT,
    "plan" TEXT,
    "followUp" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "encounters_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_encounters" ("assessment", "createdAt", "followUp", "historyOfPresentIllness", "id", "occurredAt", "patientId", "physicalExamination", "plan", "reason", "relevantHistory", "updatedAt") SELECT "assessment", "createdAt", "followUp", "historyOfPresentIllness", "id", "occurredAt", "patientId", "physicalExamination", "plan", "reason", "relevantHistory", "updatedAt" FROM "encounters";
DROP TABLE "encounters";
ALTER TABLE "new_encounters" RENAME TO "encounters";
CREATE INDEX "encounters_patientId_occurredAt_idx" ON "encounters"("patientId", "occurredAt" DESC);
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "appointments_linkedEncounterId_key" ON "appointments"("linkedEncounterId");

-- CreateIndex
CREATE INDEX "appointments_startAt_idx" ON "appointments"("startAt");

-- CreateIndex
CREATE INDEX "appointments_patientId_startAt_idx" ON "appointments"("patientId", "startAt");
