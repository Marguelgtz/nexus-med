// Clinical timeline (UI_SPEC §3.3, item 3). Newest first by occurrence
// time; an "Actualizada" line appears only when the note was edited after
// the fact — continuity is never silent. Entries become links to the
// encounter detail with the next slice.

import Link from 'next/link';

import type { EncounterSummary } from '@nexus-med/contracts';

import {
  ENCOUNTER_TYPE_LABELS,
  formatDateTime,
  formatShortDate,
  formatTime,
  formatShortDateTime,
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
        <div className="timeline-entry-content">
          <div className="timeline-entry-meta">
            <time className="timeline-date" dateTime={encounter.occurredAt} title={formatDateTime(encounter.occurredAt)}>
              {formatShortDate(encounter.occurredAt)}
            </time>
            <time className="timeline-time" dateTime={encounter.occurredAt}>
              {formatTime(encounter.occurredAt)}
            </time>
            <span className="badge badge-type">{ENCOUNTER_TYPE_LABELS[encounter.type]}</span>
          </div>
          <span className="timeline-reason">
            {encounter.reason ? encounter.reason : <em className="faint">Sin motivo registrado</em>}
          </span>
        </div>
        {edited ? (
          <div className="edited">Actualizada {formatShortDateTime(encounter.updatedAt)}</div>
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
  const recent = encounters.slice(0, 5);
  const older = encounters.slice(5);
  return (
    <section className="card" id="patient-history">
      <div className="card-header">
        <h2>Historial de consultas</h2>
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
          {recent.map((e) => (
            <TimelineEntry key={e.id} patientId={patientId} encounter={e} />
          ))}
        </ul>
      )}
      {older.length > 0 ? (
        <details className="older-timeline">
          <summary>Ver {older.length} consultas anteriores</summary>
          <ul className="timeline">
            {older.map((encounter) => (
              <TimelineEntry key={encounter.id} patientId={patientId} encounter={encounter} />
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}
