-- CreateTable
CREATE TABLE "patients" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fullName" TEXT NOT NULL,
    "dateOfBirth" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "externalIdentifier" TEXT,
    "medicalConditions" TEXT,
    "previousSurgeries" TEXT,
    "allergies" TEXT,
    "currentMedications" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "encounters" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patientId" TEXT NOT NULL,
    "occurredAt" DATETIME NOT NULL,
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

-- CreateIndex
CREATE INDEX "patients_fullName_idx" ON "patients"("fullName");

-- CreateIndex
CREATE INDEX "encounters_patientId_occurredAt_idx" ON "encounters"("patientId", "occurredAt" DESC);
