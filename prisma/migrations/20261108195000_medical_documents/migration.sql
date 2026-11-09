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

CREATE INDEX "medical_documents_patientId_createdAt_idx" ON "medical_documents"("patientId", "createdAt" DESC);
CREATE INDEX "medical_documents_encounterId_idx" ON "medical_documents"("encounterId");
CREATE INDEX "prescription_lines_documentId_position_idx" ON "prescription_lines"("documentId", "position");
