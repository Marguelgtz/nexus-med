-- NM-PILOT-001: additive migration; no table rebuild or historical rewrites.
-- Clinic relations on existing tables are enforced with triggers (SQLite and
-- D1 cannot ADD a NOT NULL REFERENCES column with a non-null default).
CREATE TABLE clinics (
 id TEXT NOT NULL PRIMARY KEY, name TEXT NOT NULL,
 timezone TEXT NOT NULL DEFAULT 'America/Mexico_City', isActive BOOLEAN NOT NULL DEFAULT true,
 createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updatedAt DATETIME NOT NULL
);
INSERT INTO clinics (id,name,updatedAt) VALUES ('legacy-clinic','Consultorio existente',CURRENT_TIMESTAMP);
CREATE TABLE clinic_memberships (
 id TEXT NOT NULL PRIMARY KEY, clinicId TEXT NOT NULL REFERENCES clinics(id) ON DELETE RESTRICT ON UPDATE CASCADE,
 userId TEXT NOT NULL REFERENCES auth_users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
 role TEXT NOT NULL CHECK (role IN ('doctor','secretary','administrator')),
 isAdmin BOOLEAN NOT NULL DEFAULT false, status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','revoked')),
 createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updatedAt DATETIME NOT NULL
);
CREATE UNIQUE INDEX clinic_memberships_clinicId_userId_key ON clinic_memberships(clinicId,userId);
CREATE INDEX clinic_memberships_userId_status_idx ON clinic_memberships(userId,status);
CREATE INDEX clinic_memberships_clinicId_role_status_idx ON clinic_memberships(clinicId,role,status);
-- Preserve all pre-mission identities. Existing doctors administered this practice.
-- No clinical authorship is inferred from identity role or count.
INSERT INTO clinic_memberships (id,clinicId,userId,role,isAdmin,status,createdAt,updatedAt)
 SELECT 'legacy-'||id,'legacy-clinic',id,role,role='doctor',CASE WHEN disabledAt IS NULL THEN 'active' ELSE 'revoked' END,createdAt,updatedAt
 FROM auth_users WHERE role IN ('doctor','secretary');
ALTER TABLE auth_sessions ADD COLUMN activeClinicId TEXT;
ALTER TABLE patients ADD COLUMN clinicId TEXT NOT NULL DEFAULT 'legacy-clinic';
CREATE INDEX patients_clinicId_idx ON patients(clinicId);
CREATE TRIGGER patients_clinic_insert BEFORE INSERT ON patients WHEN NOT EXISTS (SELECT 1 FROM clinics WHERE id=NEW.clinicId) BEGIN SELECT RAISE(ABORT,'clinic ownership required'); END;
CREATE TRIGGER patients_clinic_update BEFORE UPDATE ON patients WHEN NOT EXISTS (SELECT 1 FROM clinics WHERE id=NEW.clinicId) BEGIN SELECT RAISE(ABORT,'clinic ownership required'); END;
CREATE TRIGGER patients_clinic_immutable BEFORE UPDATE OF clinicId ON patients WHEN NEW.clinicId<>OLD.clinicId BEGIN SELECT RAISE(ABORT,'clinic ownership immutable'); END;
ALTER TABLE encounters ADD COLUMN clinicId TEXT NOT NULL DEFAULT 'legacy-clinic';
CREATE INDEX encounters_clinicId_idx ON encounters(clinicId);
CREATE TRIGGER encounters_clinic_insert BEFORE INSERT ON encounters WHEN NOT EXISTS (SELECT 1 FROM clinics WHERE id=NEW.clinicId) BEGIN SELECT RAISE(ABORT,'clinic ownership required'); END;
CREATE TRIGGER encounters_clinic_update BEFORE UPDATE ON encounters WHEN NOT EXISTS (SELECT 1 FROM clinics WHERE id=NEW.clinicId) BEGIN SELECT RAISE(ABORT,'clinic ownership required'); END;
CREATE TRIGGER encounters_clinic_immutable BEFORE UPDATE OF clinicId ON encounters WHEN NEW.clinicId<>OLD.clinicId BEGIN SELECT RAISE(ABORT,'clinic ownership immutable'); END;
ALTER TABLE appointments ADD COLUMN clinicId TEXT NOT NULL DEFAULT 'legacy-clinic';
CREATE INDEX appointments_clinicId_idx ON appointments(clinicId);
CREATE TRIGGER appointments_clinic_insert BEFORE INSERT ON appointments WHEN NOT EXISTS (SELECT 1 FROM clinics WHERE id=NEW.clinicId) BEGIN SELECT RAISE(ABORT,'clinic ownership required'); END;
CREATE TRIGGER appointments_clinic_update BEFORE UPDATE ON appointments WHEN NOT EXISTS (SELECT 1 FROM clinics WHERE id=NEW.clinicId) BEGIN SELECT RAISE(ABORT,'clinic ownership required'); END;
CREATE TRIGGER appointments_clinic_immutable BEFORE UPDATE OF clinicId ON appointments WHEN NEW.clinicId<>OLD.clinicId BEGIN SELECT RAISE(ABORT,'clinic ownership immutable'); END;
ALTER TABLE study_requests ADD COLUMN clinicId TEXT NOT NULL DEFAULT 'legacy-clinic';
CREATE INDEX study_requests_clinicId_idx ON study_requests(clinicId);
CREATE TRIGGER study_requests_clinic_insert BEFORE INSERT ON study_requests WHEN NOT EXISTS (SELECT 1 FROM clinics WHERE id=NEW.clinicId) BEGIN SELECT RAISE(ABORT,'clinic ownership required'); END;
CREATE TRIGGER study_requests_clinic_update BEFORE UPDATE ON study_requests WHEN NOT EXISTS (SELECT 1 FROM clinics WHERE id=NEW.clinicId) BEGIN SELECT RAISE(ABORT,'clinic ownership required'); END;
CREATE TRIGGER study_requests_clinic_immutable BEFORE UPDATE OF clinicId ON study_requests WHEN NEW.clinicId<>OLD.clinicId BEGIN SELECT RAISE(ABORT,'clinic ownership immutable'); END;
ALTER TABLE medical_documents ADD COLUMN clinicId TEXT NOT NULL DEFAULT 'legacy-clinic';
CREATE INDEX medical_documents_clinicId_idx ON medical_documents(clinicId);
CREATE TRIGGER medical_documents_clinic_insert BEFORE INSERT ON medical_documents WHEN NOT EXISTS (SELECT 1 FROM clinics WHERE id=NEW.clinicId) BEGIN SELECT RAISE(ABORT,'clinic ownership required'); END;
CREATE TRIGGER medical_documents_clinic_update BEFORE UPDATE ON medical_documents WHEN NOT EXISTS (SELECT 1 FROM clinics WHERE id=NEW.clinicId) BEGIN SELECT RAISE(ABORT,'clinic ownership required'); END;
CREATE TRIGGER medical_documents_clinic_immutable BEFORE UPDATE OF clinicId ON medical_documents WHEN NEW.clinicId<>OLD.clinicId BEGIN SELECT RAISE(ABORT,'clinic ownership immutable'); END;
ALTER TABLE study_receipts ADD COLUMN clinicId TEXT NOT NULL DEFAULT 'legacy-clinic';
CREATE INDEX study_receipts_clinicId_idx ON study_receipts(clinicId);
CREATE TRIGGER study_receipts_clinic_insert BEFORE INSERT ON study_receipts WHEN NOT EXISTS (SELECT 1 FROM clinics WHERE id=NEW.clinicId) BEGIN SELECT RAISE(ABORT,'clinic ownership required'); END;
CREATE TRIGGER study_receipts_clinic_update BEFORE UPDATE ON study_receipts WHEN NOT EXISTS (SELECT 1 FROM clinics WHERE id=NEW.clinicId) BEGIN SELECT RAISE(ABORT,'clinic ownership required'); END;
CREATE TRIGGER study_receipts_clinic_immutable BEFORE UPDATE OF clinicId ON study_receipts WHEN NEW.clinicId<>OLD.clinicId BEGIN SELECT RAISE(ABORT,'clinic ownership immutable'); END;
ALTER TABLE auth_invitations ADD COLUMN clinicId TEXT NOT NULL DEFAULT 'legacy-clinic';
CREATE INDEX auth_invitations_clinicId_idx ON auth_invitations(clinicId);
CREATE TRIGGER auth_invitations_clinic_insert BEFORE INSERT ON auth_invitations WHEN NOT EXISTS (SELECT 1 FROM clinics WHERE id=NEW.clinicId) BEGIN SELECT RAISE(ABORT,'clinic ownership required'); END;
CREATE TRIGGER auth_invitations_clinic_update BEFORE UPDATE ON auth_invitations WHEN NOT EXISTS (SELECT 1 FROM clinics WHERE id=NEW.clinicId) BEGIN SELECT RAISE(ABORT,'clinic ownership required'); END;
CREATE TRIGGER auth_invitations_clinic_immutable BEFORE UPDATE OF clinicId ON auth_invitations WHEN NEW.clinicId<>OLD.clinicId BEGIN SELECT RAISE(ABORT,'clinic ownership immutable'); END;
CREATE TRIGGER clinics_restrict_delete BEFORE DELETE ON clinics WHEN EXISTS(SELECT 1 FROM patients WHERE clinicId=OLD.id) OR EXISTS(SELECT 1 FROM encounters WHERE clinicId=OLD.id) OR EXISTS(SELECT 1 FROM appointments WHERE clinicId=OLD.id) OR EXISTS(SELECT 1 FROM study_requests WHERE clinicId=OLD.id) OR EXISTS(SELECT 1 FROM medical_documents WHERE clinicId=OLD.id) OR EXISTS(SELECT 1 FROM study_receipts WHERE clinicId=OLD.id) OR EXISTS(SELECT 1 FROM auth_invitations WHERE clinicId=OLD.id) BEGIN SELECT RAISE(ABORT,'clinic has records'); END;
CREATE TRIGGER clinics_id_immutable BEFORE UPDATE OF id ON clinics WHEN NEW.id<>OLD.id BEGIN SELECT RAISE(ABORT,'clinic id immutable'); END;
ALTER TABLE patients ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE encounters ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE appointments ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE medical_documents ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE encounters ADD COLUMN authorId TEXT REFERENCES auth_users(id) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE encounters ADD COLUMN lastEditedById TEXT REFERENCES auth_users(id) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE medical_documents ADD COLUMN authorId TEXT REFERENCES auth_users(id) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE medical_documents ADD COLUMN lastEditedById TEXT REFERENCES auth_users(id) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE appointments ADD COLUMN doctorId TEXT REFERENCES auth_users(id) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE study_requests ADD COLUMN orderedById TEXT REFERENCES auth_users(id) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE study_requests ADD COLUMN reviewedById TEXT REFERENCES auth_users(id) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE study_receipts ADD COLUMN receivedById TEXT REFERENCES auth_users(id) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE study_receipts ADD COLUMN reviewedById TEXT REFERENCES auth_users(id) ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE TRIGGER encounters_associations_insert BEFORE INSERT ON encounters WHEN NOT EXISTS (SELECT 1 FROM patients p WHERE p.id=NEW.patientId AND p.clinicId=NEW.clinicId) BEGIN SELECT RAISE(ABORT,'invalid clinic patient association'); END;
CREATE TRIGGER encounters_associations_update BEFORE UPDATE ON encounters WHEN NOT EXISTS (SELECT 1 FROM patients p WHERE p.id=NEW.patientId AND p.clinicId=NEW.clinicId) BEGIN SELECT RAISE(ABORT,'invalid clinic patient association'); END;
CREATE TRIGGER appointments_associations_insert BEFORE INSERT ON appointments WHEN NOT EXISTS (SELECT 1 FROM patients p WHERE p.id=NEW.patientId AND p.clinicId=NEW.clinicId) OR (NEW.linkedEncounterId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM encounters e WHERE e.id=NEW.linkedEncounterId AND e.patientId=NEW.patientId AND e.clinicId=NEW.clinicId AND (NEW.doctorId IS NULL OR e.authorId IS NULL OR NEW.doctorId=e.authorId))) BEGIN SELECT RAISE(ABORT,'invalid clinic patient association'); END;
CREATE TRIGGER appointments_associations_update BEFORE UPDATE ON appointments WHEN NOT EXISTS (SELECT 1 FROM patients p WHERE p.id=NEW.patientId AND p.clinicId=NEW.clinicId) OR (NEW.linkedEncounterId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM encounters e WHERE e.id=NEW.linkedEncounterId AND e.patientId=NEW.patientId AND e.clinicId=NEW.clinicId AND (NEW.doctorId IS NULL OR e.authorId IS NULL OR NEW.doctorId=e.authorId))) BEGIN SELECT RAISE(ABORT,'invalid clinic patient association'); END;
CREATE TRIGGER study_requests_associations_insert BEFORE INSERT ON study_requests WHEN NOT EXISTS (SELECT 1 FROM patients p WHERE p.id=NEW.patientId AND p.clinicId=NEW.clinicId) OR (NEW.encounterId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM encounters e WHERE e.id=NEW.encounterId AND e.patientId=NEW.patientId AND e.clinicId=NEW.clinicId)) BEGIN SELECT RAISE(ABORT,'invalid clinic patient association'); END;
CREATE TRIGGER study_requests_associations_update BEFORE UPDATE ON study_requests WHEN NOT EXISTS (SELECT 1 FROM patients p WHERE p.id=NEW.patientId AND p.clinicId=NEW.clinicId) OR (NEW.encounterId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM encounters e WHERE e.id=NEW.encounterId AND e.patientId=NEW.patientId AND e.clinicId=NEW.clinicId)) BEGIN SELECT RAISE(ABORT,'invalid clinic patient association'); END;
CREATE TRIGGER medical_documents_associations_insert BEFORE INSERT ON medical_documents WHEN NOT EXISTS (SELECT 1 FROM patients p WHERE p.id=NEW.patientId AND p.clinicId=NEW.clinicId) OR (NEW.encounterId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM encounters e WHERE e.id=NEW.encounterId AND e.patientId=NEW.patientId AND e.clinicId=NEW.clinicId)) BEGIN SELECT RAISE(ABORT,'invalid clinic patient association'); END;
CREATE TRIGGER medical_documents_associations_update BEFORE UPDATE ON medical_documents WHEN NOT EXISTS (SELECT 1 FROM patients p WHERE p.id=NEW.patientId AND p.clinicId=NEW.clinicId) OR (NEW.encounterId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM encounters e WHERE e.id=NEW.encounterId AND e.patientId=NEW.patientId AND e.clinicId=NEW.clinicId)) BEGIN SELECT RAISE(ABORT,'invalid clinic patient association'); END;
CREATE TRIGGER study_receipts_associations_insert BEFORE INSERT ON study_receipts WHEN NOT EXISTS (SELECT 1 FROM patients p WHERE p.id=NEW.patientId AND p.clinicId=NEW.clinicId) OR (NEW.encounterId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM encounters e WHERE e.id=NEW.encounterId AND e.patientId=NEW.patientId AND e.clinicId=NEW.clinicId)) OR (NEW.requestId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM study_requests r WHERE r.id=NEW.requestId AND r.patientId=NEW.patientId AND r.clinicId=NEW.clinicId AND (NEW.encounterId IS NULL OR r.encounterId IS NULL OR NEW.encounterId=r.encounterId))) BEGIN SELECT RAISE(ABORT,'invalid clinic patient association'); END;
CREATE TRIGGER study_receipts_associations_update BEFORE UPDATE ON study_receipts WHEN NOT EXISTS (SELECT 1 FROM patients p WHERE p.id=NEW.patientId AND p.clinicId=NEW.clinicId) OR (NEW.encounterId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM encounters e WHERE e.id=NEW.encounterId AND e.patientId=NEW.patientId AND e.clinicId=NEW.clinicId)) OR (NEW.requestId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM study_requests r WHERE r.id=NEW.requestId AND r.patientId=NEW.patientId AND r.clinicId=NEW.clinicId AND (NEW.encounterId IS NULL OR r.encounterId IS NULL OR NEW.encounterId=r.encounterId))) BEGIN SELECT RAISE(ABORT,'invalid clinic patient association'); END;
CREATE TRIGGER encounters_author_immutable BEFORE UPDATE OF authorId ON encounters WHEN NEW.authorId IS NOT OLD.authorId BEGIN SELECT RAISE(ABORT,'clinical author immutable'); END;
CREATE TRIGGER medical_documents_author_immutable BEFORE UPDATE OF authorId ON medical_documents WHEN NEW.authorId IS NOT OLD.authorId BEGIN SELECT RAISE(ABORT,'clinical author immutable'); END;
CREATE INDEX appointments_clinicId_doctorId_startAt_idx ON appointments(clinicId,doctorId,startAt);

CREATE TABLE atomic_write_guards (id TEXT NOT NULL PRIMARY KEY, valid INTEGER NOT NULL CHECK(valid=1));

-- Additional ownership and attribution guards for direct/batch writes.
CREATE TRIGGER encounters_patient_immutable BEFORE UPDATE OF patientId ON encounters WHEN NEW.patientId<>OLD.patientId BEGIN SELECT RAISE(ABORT,'patient ownership immutable'); END;
CREATE TRIGGER appointments_patient_immutable BEFORE UPDATE OF patientId ON appointments WHEN NEW.patientId<>OLD.patientId BEGIN SELECT RAISE(ABORT,'patient ownership immutable'); END;
CREATE TRIGGER study_requests_patient_immutable BEFORE UPDATE OF patientId ON study_requests WHEN NEW.patientId<>OLD.patientId BEGIN SELECT RAISE(ABORT,'patient ownership immutable'); END;
CREATE TRIGGER medical_documents_patient_immutable BEFORE UPDATE OF patientId ON medical_documents WHEN NEW.patientId<>OLD.patientId BEGIN SELECT RAISE(ABORT,'patient ownership immutable'); END;
CREATE TRIGGER study_receipts_patient_immutable BEFORE UPDATE OF patientId ON study_receipts WHEN NEW.patientId<>OLD.patientId BEGIN SELECT RAISE(ABORT,'patient ownership immutable'); END;
CREATE TRIGGER encounters_authorId_insert BEFORE INSERT ON encounters WHEN NEW.authorId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM clinic_memberships m JOIN auth_users u ON u.id=m.userId WHERE m.clinicId=NEW.clinicId AND m.userId=NEW.authorId AND m.status='active' AND u.disabledAt IS NULL AND u.emailVerified=1 AND m.role='doctor') BEGIN SELECT RAISE(ABORT,'invalid clinic actor'); END;
CREATE TRIGGER encounters_authorId_update BEFORE UPDATE ON encounters WHEN (NEW.authorId IS NOT OLD.authorId) AND (NEW.authorId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM clinic_memberships m JOIN auth_users u ON u.id=m.userId WHERE m.clinicId=NEW.clinicId AND m.userId=NEW.authorId AND m.status='active' AND u.disabledAt IS NULL AND u.emailVerified=1 AND m.role='doctor')) BEGIN SELECT RAISE(ABORT,'invalid clinic actor'); END;
CREATE TRIGGER encounters_lastEditedById_insert BEFORE INSERT ON encounters WHEN NEW.lastEditedById IS NOT NULL AND NOT EXISTS (SELECT 1 FROM clinic_memberships m JOIN auth_users u ON u.id=m.userId WHERE m.clinicId=NEW.clinicId AND m.userId=NEW.lastEditedById AND m.status='active' AND u.disabledAt IS NULL AND u.emailVerified=1 AND m.role='doctor') BEGIN SELECT RAISE(ABORT,'invalid clinic actor'); END;
CREATE TRIGGER encounters_lastEditedById_update BEFORE UPDATE ON encounters WHEN (NEW.lastEditedById IS NOT OLD.lastEditedById) AND (NEW.lastEditedById IS NOT NULL AND NOT EXISTS (SELECT 1 FROM clinic_memberships m JOIN auth_users u ON u.id=m.userId WHERE m.clinicId=NEW.clinicId AND m.userId=NEW.lastEditedById AND m.status='active' AND u.disabledAt IS NULL AND u.emailVerified=1 AND m.role='doctor')) BEGIN SELECT RAISE(ABORT,'invalid clinic actor'); END;
CREATE TRIGGER medical_documents_authorId_insert BEFORE INSERT ON medical_documents WHEN NEW.authorId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM clinic_memberships m JOIN auth_users u ON u.id=m.userId WHERE m.clinicId=NEW.clinicId AND m.userId=NEW.authorId AND m.status='active' AND u.disabledAt IS NULL AND u.emailVerified=1 AND m.role='doctor') BEGIN SELECT RAISE(ABORT,'invalid clinic actor'); END;
CREATE TRIGGER medical_documents_authorId_update BEFORE UPDATE ON medical_documents WHEN (NEW.authorId IS NOT OLD.authorId) AND (NEW.authorId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM clinic_memberships m JOIN auth_users u ON u.id=m.userId WHERE m.clinicId=NEW.clinicId AND m.userId=NEW.authorId AND m.status='active' AND u.disabledAt IS NULL AND u.emailVerified=1 AND m.role='doctor')) BEGIN SELECT RAISE(ABORT,'invalid clinic actor'); END;
CREATE TRIGGER medical_documents_lastEditedById_insert BEFORE INSERT ON medical_documents WHEN NEW.lastEditedById IS NOT NULL AND NOT EXISTS (SELECT 1 FROM clinic_memberships m JOIN auth_users u ON u.id=m.userId WHERE m.clinicId=NEW.clinicId AND m.userId=NEW.lastEditedById AND m.status='active' AND u.disabledAt IS NULL AND u.emailVerified=1 AND m.role='doctor') BEGIN SELECT RAISE(ABORT,'invalid clinic actor'); END;
CREATE TRIGGER medical_documents_lastEditedById_update BEFORE UPDATE ON medical_documents WHEN (NEW.lastEditedById IS NOT OLD.lastEditedById) AND (NEW.lastEditedById IS NOT NULL AND NOT EXISTS (SELECT 1 FROM clinic_memberships m JOIN auth_users u ON u.id=m.userId WHERE m.clinicId=NEW.clinicId AND m.userId=NEW.lastEditedById AND m.status='active' AND u.disabledAt IS NULL AND u.emailVerified=1 AND m.role='doctor')) BEGIN SELECT RAISE(ABORT,'invalid clinic actor'); END;
CREATE TRIGGER appointments_doctorId_insert BEFORE INSERT ON appointments WHEN NEW.doctorId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM clinic_memberships m JOIN auth_users u ON u.id=m.userId WHERE m.clinicId=NEW.clinicId AND m.userId=NEW.doctorId AND m.status='active' AND u.disabledAt IS NULL AND u.emailVerified=1 AND m.role='doctor') BEGIN SELECT RAISE(ABORT,'invalid clinic actor'); END;
CREATE TRIGGER appointments_doctorId_update BEFORE UPDATE ON appointments WHEN (NEW.doctorId IS NOT OLD.doctorId) AND (NEW.doctorId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM clinic_memberships m JOIN auth_users u ON u.id=m.userId WHERE m.clinicId=NEW.clinicId AND m.userId=NEW.doctorId AND m.status='active' AND u.disabledAt IS NULL AND u.emailVerified=1 AND m.role='doctor')) BEGIN SELECT RAISE(ABORT,'invalid clinic actor'); END;
CREATE TRIGGER study_requests_orderedById_insert BEFORE INSERT ON study_requests WHEN NEW.orderedById IS NOT NULL AND NOT EXISTS (SELECT 1 FROM clinic_memberships m JOIN auth_users u ON u.id=m.userId WHERE m.clinicId=NEW.clinicId AND m.userId=NEW.orderedById AND m.status='active' AND u.disabledAt IS NULL AND u.emailVerified=1 AND m.role='doctor') BEGIN SELECT RAISE(ABORT,'invalid clinic actor'); END;
CREATE TRIGGER study_requests_orderedById_update BEFORE UPDATE ON study_requests WHEN (NEW.orderedById IS NOT OLD.orderedById) AND (NEW.orderedById IS NOT NULL AND NOT EXISTS (SELECT 1 FROM clinic_memberships m JOIN auth_users u ON u.id=m.userId WHERE m.clinicId=NEW.clinicId AND m.userId=NEW.orderedById AND m.status='active' AND u.disabledAt IS NULL AND u.emailVerified=1 AND m.role='doctor')) BEGIN SELECT RAISE(ABORT,'invalid clinic actor'); END;
CREATE TRIGGER study_requests_reviewedById_insert BEFORE INSERT ON study_requests WHEN NEW.reviewedById IS NOT NULL AND NOT EXISTS (SELECT 1 FROM clinic_memberships m JOIN auth_users u ON u.id=m.userId WHERE m.clinicId=NEW.clinicId AND m.userId=NEW.reviewedById AND m.status='active' AND u.disabledAt IS NULL AND u.emailVerified=1 AND m.role='doctor') BEGIN SELECT RAISE(ABORT,'invalid clinic actor'); END;
CREATE TRIGGER study_requests_reviewedById_update BEFORE UPDATE ON study_requests WHEN (NEW.reviewedById IS NOT OLD.reviewedById) AND (NEW.reviewedById IS NOT NULL AND NOT EXISTS (SELECT 1 FROM clinic_memberships m JOIN auth_users u ON u.id=m.userId WHERE m.clinicId=NEW.clinicId AND m.userId=NEW.reviewedById AND m.status='active' AND u.disabledAt IS NULL AND u.emailVerified=1 AND m.role='doctor')) BEGIN SELECT RAISE(ABORT,'invalid clinic actor'); END;
CREATE TRIGGER study_receipts_reviewedById_insert BEFORE INSERT ON study_receipts WHEN NEW.reviewedById IS NOT NULL AND NOT EXISTS (SELECT 1 FROM clinic_memberships m JOIN auth_users u ON u.id=m.userId WHERE m.clinicId=NEW.clinicId AND m.userId=NEW.reviewedById AND m.status='active' AND u.disabledAt IS NULL AND u.emailVerified=1 AND m.role='doctor') BEGIN SELECT RAISE(ABORT,'invalid clinic actor'); END;
CREATE TRIGGER study_receipts_reviewedById_update BEFORE UPDATE ON study_receipts WHEN (NEW.reviewedById IS NOT OLD.reviewedById) AND (NEW.reviewedById IS NOT NULL AND NOT EXISTS (SELECT 1 FROM clinic_memberships m JOIN auth_users u ON u.id=m.userId WHERE m.clinicId=NEW.clinicId AND m.userId=NEW.reviewedById AND m.status='active' AND u.disabledAt IS NULL AND u.emailVerified=1 AND m.role='doctor')) BEGIN SELECT RAISE(ABORT,'invalid clinic actor'); END;
CREATE TRIGGER study_receipts_receivedById_insert BEFORE INSERT ON study_receipts WHEN NEW.receivedById IS NOT NULL AND NOT EXISTS (SELECT 1 FROM clinic_memberships m JOIN auth_users u ON u.id=m.userId WHERE m.clinicId=NEW.clinicId AND m.userId=NEW.receivedById AND m.status='active' AND u.disabledAt IS NULL AND u.emailVerified=1) BEGIN SELECT RAISE(ABORT,'invalid clinic actor'); END;
CREATE TRIGGER study_receipts_receivedById_update BEFORE UPDATE ON study_receipts WHEN (NEW.receivedById IS NOT OLD.receivedById) AND (NEW.receivedById IS NOT NULL AND NOT EXISTS (SELECT 1 FROM clinic_memberships m JOIN auth_users u ON u.id=m.userId WHERE m.clinicId=NEW.clinicId AND m.userId=NEW.receivedById AND m.status='active' AND u.disabledAt IS NULL AND u.emailVerified=1)) BEGIN SELECT RAISE(ABORT,'invalid clinic actor'); END;
