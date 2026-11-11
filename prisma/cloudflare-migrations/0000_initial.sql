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

-- CreateTable
CREATE TABLE "appointments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patientId" TEXT NOT NULL,
    "startAt" DATETIME NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "arrivedAt" DATETIME,
    "attentionStartedAt" DATETIME,
    "actualDurationMinutes" INTEGER,
    "completedAt" DATETIME,
    "linkedEncounterId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "appointments_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "appointments_linkedEncounterId_fkey" FOREIGN KEY ("linkedEncounterId") REFERENCES "encounters" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "study_requests" (
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

-- CreateTable
CREATE TABLE "medical_documents" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patientId" TEXT NOT NULL,
    "encounterId" TEXT,
    "kind" TEXT NOT NULL,
    "title" TEXT,
    "body" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "medical_documents_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "medical_documents_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "encounters" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "prescription_lines" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "documentId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "medication" TEXT NOT NULL,
    "dose" TEXT,
    "route" TEXT,
    "frequency" TEXT,
    "duration" TEXT,
    "instructions" TEXT,
    CONSTRAINT "prescription_lines_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "medical_documents" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "study_receipts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patientId" TEXT NOT NULL,
    "encounterId" TEXT,
    "requestId" TEXT,
    "title" TEXT NOT NULL,
    "studyDate" TEXT,
    "receiptNote" TEXT,
    "receivedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" DATETIME,
    "reviewNote" TEXT,
    CONSTRAINT "study_receipts_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "study_receipts_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "encounters" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "study_receipts_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "study_requests" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "study_receipt_files" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "receiptId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    CONSTRAINT "study_receipt_files_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "study_receipts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "patients_fullName_idx" ON "patients"("fullName");

-- CreateIndex
CREATE INDEX "encounters_patientId_occurredAt_idx" ON "encounters"("patientId", "occurredAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "appointments_linkedEncounterId_key" ON "appointments"("linkedEncounterId");

-- CreateIndex
CREATE INDEX "appointments_startAt_idx" ON "appointments"("startAt");

-- CreateIndex
CREATE INDEX "appointments_patientId_startAt_idx" ON "appointments"("patientId", "startAt");

-- CreateIndex
CREATE INDEX "study_requests_patientId_status_idx" ON "study_requests"("patientId", "status");

-- CreateIndex
CREATE INDEX "study_requests_encounterId_idx" ON "study_requests"("encounterId");

-- CreateIndex
CREATE INDEX "medical_documents_patientId_createdAt_idx" ON "medical_documents"("patientId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "medical_documents_encounterId_idx" ON "medical_documents"("encounterId");

-- CreateIndex
CREATE INDEX "prescription_lines_documentId_position_idx" ON "prescription_lines"("documentId", "position");

-- CreateIndex
CREATE INDEX "study_receipts_patientId_receivedAt_idx" ON "study_receipts"("patientId", "receivedAt");

-- CreateIndex
CREATE INDEX "study_receipts_reviewedAt_receivedAt_idx" ON "study_receipts"("reviewedAt", "receivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "study_receipt_files_storageKey_key" ON "study_receipt_files"("storageKey");

-- CreateIndex
CREATE INDEX "study_receipt_files_receiptId_idx" ON "study_receipt_files"("receiptId");
