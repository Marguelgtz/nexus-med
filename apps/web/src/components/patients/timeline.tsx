// Clinical timeline (UI_SPEC §3.3, item 3). Newest first by occurrence
// time; an "Actualizada" line appears only when the note was edited after
// the fact — continuity is never silent. Entries become links to the
// encounter detail with the next slice.

import Link from 'next/link';

import type { EncounterSummary } from '@nexus-med/contracts';

import {
  ENCOUNTER_TYPE_LABELS,
  formatDateTime,
  shouldShowEncounterTypeBadge,
  wasEdited,
} from '../../lib/format';

function TimelineEntry({
  patientId,
  encounter,
}: {
  patientId: string;
  encounter: EncounterSummary;
}) {
  const edited = wasEdited(encounter.createdAt, encounter.updatedAt);
  return (
    <li className="timeline-item">
      <Link
        className="timeline-link"
        href={`/patients/${patientId}/consultas/${encounter.id}`}
      >
        <div className="when">
          {formatDateTime(encounter.occurredAt)}
          {shouldShowEncounterTypeBadge(encounter.type) ? (
            <span className="badge badge-type" style={{ marginLeft: 8 }}>
              {ENCOUNTER_TYPE_LABELS[encounter.type]}
            </span>
          ) : null}
          <span className="reason" style={{ marginLeft: 12, fontWeight: 400 }}>
            {encounter.reason ? (
              <>
                Motivo: {encounter.reason}
              </>
            ) : (
              <em className="faint">Sin motivo</em>
            )}
          </span>
        </div>
        {edited ? (
          <div className="edited">Actualizada {formatDateTime(encounter.updatedAt)}</div>
        ) : null}
      </Link>
    </li>
  );
}

export function Timeline({
  patientId,
  encounters,
}: {
  patientId: string;
  encounters: EncounterSummary[];
}) {
  const count = encounters.length;
  return (
    <div className="card">
      <div className="card-header">
        <h2>Historial</h2>
        <span className="faint">
          {count === 1 ? '1 consulta' : `${count} consultas`}
        </span>
      </div>

      {count === 0 ? (
        <div className="empty-state">
          <div className="empty-title">Este paciente aún no tiene consultas</div>
          <Link href={`/patients/${patientId}/consultas/nueva`} className="btn btn-primary">
            Nueva consulta
          </Link>
        </div>
      ) : (
        <ul className="timeline">
          {encounters.map((e) => (
            <TimelineEntry key={e.id} patientId={patientId} encounter={e} />
          ))}
        </ul>
      )}
    </div>
  );
}
