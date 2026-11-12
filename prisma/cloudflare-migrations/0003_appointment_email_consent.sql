-- Appointment contact consent defaults off for every existing patient.
ALTER TABLE "patients" ADD COLUMN "appointmentEmailConsent" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "patients" ADD COLUMN "appointmentEmailConsentUpdatedAt" DATETIME;

-- Appointment references let the dispatcher suppress stale queued notices.
ALTER TABLE "email_outbox" ADD COLUMN "appointmentId" TEXT REFERENCES "appointments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "email_outbox" ADD COLUMN "appointmentVersion" TEXT;
ALTER TABLE "email_outbox" ADD COLUMN "appointmentEvent" TEXT;

CREATE INDEX "email_outbox_appointmentId_createdAt_idx" ON "email_outbox"("appointmentId", "createdAt");
