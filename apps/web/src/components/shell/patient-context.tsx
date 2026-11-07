import Link from 'next/link';

import { Badge } from '../primitives';

// Patient context strip (UI_SPEC §2): every patient-specific screen
// identifies the active patient and offers the back link.
export function PatientContext({
  fullName,
  externalIdentifier,
  isArchived,
  backHref,
}: {
  fullName: string;
  externalIdentifier: string | null;
  isArchived: boolean;
  backHref: string;
}) {
  return (
    <div className="context-strip">
      <Link href={backHref} className="back">
        ← Pacientes
      </Link>
      <span className="name">{fullName}</span>
      {externalIdentifier ? <span className="mono">{externalIdentifier}</span> : null}
      {isArchived ? <Badge tone="archived">Archivado</Badge> : null}
    </div>
  );
}
