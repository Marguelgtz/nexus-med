CREATE TABLE "study_receipts" (
 "id" TEXT NOT NULL PRIMARY KEY, "patientId" TEXT NOT NULL, "encounterId" TEXT, "requestId" TEXT,
 "title" TEXT NOT NULL, "studyDate" TEXT, "receiptNote" TEXT, "receivedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "reviewedAt" DATETIME, "reviewNote" TEXT,
 FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 FOREIGN KEY ("encounterId") REFERENCES "encounters"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 FOREIGN KEY ("requestId") REFERENCES "study_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "study_receipts_patientId_receivedAt_idx" ON "study_receipts"("patientId", "receivedAt");
CREATE INDEX "study_receipts_reviewedAt_receivedAt_idx" ON "study_receipts"("reviewedAt", "receivedAt");
CREATE TABLE "study_receipt_files" (
 "id" TEXT NOT NULL PRIMARY KEY, "receiptId" TEXT NOT NULL, "storageKey" TEXT NOT NULL,
 "name" TEXT NOT NULL, "mimeType" TEXT NOT NULL, "size" INTEGER NOT NULL,
 FOREIGN KEY ("receiptId") REFERENCES "study_receipts"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "study_receipt_files_storageKey_key" ON "study_receipt_files"("storageKey");
CREATE INDEX "study_receipt_files_receiptId_idx" ON "study_receipt_files"("receiptId");
