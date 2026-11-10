-- Replace the visible placeholder labels on untouched synthetic fixture rows.
-- The WHERE clause preserves any fixture record whose name or identifier was
-- edited locally; user-created patient rows are never addressed.
UPDATE "patients"
SET "fullName" = 'Juan Pérez', "externalIdentifier" = 'NM-001'
WHERE "id" = 'demo-patient-001'
  AND "fullName" = 'DEMO — Paciente 001'
  AND "externalIdentifier" = 'DEMO-001';

UPDATE "patients"
SET "fullName" = 'Mariana López', "externalIdentifier" = 'NM-002'
WHERE "id" = 'demo-patient-002'
  AND "fullName" = 'DEMO — Paciente 002'
  AND "externalIdentifier" = 'DEMO-002';

UPDATE "patients"
SET "fullName" = 'José Martínez', "externalIdentifier" = 'NM-003'
WHERE "id" = 'demo-patient-003'
  AND "fullName" = 'DEMO — Paciente 003'
  AND "externalIdentifier" = 'DEMO-003';

UPDATE "patients"
SET "fullName" = 'Elena Rodríguez', "externalIdentifier" = 'NM-004'
WHERE "id" = 'demo-patient-004'
  AND "fullName" = 'DEMO — Paciente 004'
  AND "externalIdentifier" = 'DEMO-004';

UPDATE "patients"
SET "fullName" = 'Carlos Hernández', "externalIdentifier" = 'NM-005'
WHERE "id" = 'demo-patient-005'
  AND "fullName" = 'DEMO — Paciente 005'
  AND "externalIdentifier" = 'DEMO-005';

UPDATE "patients"
SET "fullName" = 'Sofía Torres', "externalIdentifier" = 'NM-006'
WHERE "id" = 'demo-patient-006'
  AND "fullName" = 'DEMO — Paciente 006'
  AND "externalIdentifier" = 'DEMO-006';

UPDATE "patients"
SET "fullName" = 'Lucía Gómez', "externalIdentifier" = 'NM-007'
WHERE "id" = 'demo-patient-007'
  AND "fullName" = 'DEMO — Paciente 007'
  AND "externalIdentifier" = 'DEMO-007';
