import Link from 'next/link';

import { Badge } from '../primitives';

// Patient identity strip (UI_SPEC §2): patient-specific pages always keep
// the active patient visible and provide a clear route back.
export function PatientContext({
  fullName,
  externalIdentifier,
  isArchived,
  backHref,
  backLabel = 'Pacientes',
}: {
  fullName: string;
  externalIdentifier: string | null;
  isArchived: boolean;
  backHref: string;
  backLabel?: string;
}) {
  return (
    <div className="context-strip">
      <Link href={backHref} className="back">
        ← {backLabel}
      </Link>
      <span className="name">{fullName}</span>
      {externalIdentifier ? <span className="mono">{externalIdentifier}</span> : null}
      {isArchived ? <Badge tone="archived">Archivado</Badge> : null}
    </div>
  );
}
