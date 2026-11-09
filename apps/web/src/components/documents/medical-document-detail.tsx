'use client';

import { useState } from 'react';

import type { EncounterSummary, MedicalDocument } from '@nexus-med/contracts';

import { MedicalDocumentForm } from './document-form';
import { Badge } from '../primitives';
import { formatAge, formatDate, formatDateTime, wasEdited } from '../../lib/format';

function PrintedDocument({ document }: { document: MedicalDocument }) {
  const heading = document.title || (document.kind === 'prescription' ? 'RECETA' : 'INFORME MÉDICO');
  const age = formatAge(document.patient.dateOfBirth);

  return (
    <article className="medical-document-paper" id="medical-document-paper">
      <header className="medical-document-header">
        <h1>{heading}</h1>
        <p>Paciente: {document.patient.fullName}</p>
        {document.patient.dateOfBirth ? (
          <p>Nacimiento: {formatDate(document.patient.dateOfBirth)}{age ? ` (${age} años)` : ''}</p>
        ) : null}
        <p>Fecha: {formatDateTime(document.createdAt)}</p>
      </header>

      {document.kind === 'prescription' ? (
        <div className="medical-document-content">
          {document.lines.map((line, index) => {
            const details = [line.dose, line.route, line.frequency, line.duration].filter(Boolean).join(' ');
            return (
              <section className="prescription-line-block" key={line.id}>
                <p>{index + 1}. {line.medication}{details ? ` — ${details}` : ''}</p>
                {line.instructions ? <p className="prescription-line-instructions">{line.instructions}</p> : null}
              </section>
            );
          })}
          {document.body ? (
            <section className="prescription-general-instructions">
              <h2>Indicaciones generales</h2>
              <p>{document.body}</p>
            </section>
          ) : null}
        </div>
      ) : (
        <div className="medical-document-content report-body">{document.body}</div>
      )}

      <footer className="medical-document-demo-mark">MODO DEMOSTRACIÓN — DATOS FICTICIOS</footer>
    </article>
  );
}

export function MedicalDocumentDetail({
  initialDocument,
  encounters,
}: {
  initialDocument: MedicalDocument;
  encounters: EncounterSummary[];
}) {
  const [document, setDocument] = useState(initialDocument);
  const [editing, setEditing] = useState(false);
  const edited = wasEdited(document.createdAt, document.updatedAt);

  return (
    <div className="medical-document-view">
      <div className="page-head document-screen-controls">
        <h1>{document.kind === 'prescription' ? 'Receta' : 'Informe médico'}</h1>
        <div className="actions">
          {edited ? <Badge tone="edited">Editada</Badge> : null}
          {!editing ? (
            <>
              <button type="button" className="btn btn-primary" onClick={() => window.print()}>Imprimir</button>
              <button type="button" className="btn btn-secondary" onClick={() => setEditing(true)}>Editar</button>
            </>
          ) : null}
        </div>
      </div>

      {editing ? (
        <MedicalDocumentForm
          key={`${document.id}-${document.updatedAt}`}
          patientId={document.patientId}
          kind={document.kind}
          encounters={encounters}
          initial={document}
          onSaved={(updated) => { setDocument(updated); setEditing(false); }}
          onCancel={() => setEditing(false)}
        />
      ) : <PrintedDocument document={document} />}

      {!editing ? (
        <p className="document-screen-note">
          La impresión se abre en el diálogo del navegador (también puede guardarse como PDF). Copia local; no constituye receta electrónica certificada.
        </p>
      ) : null}
    </div>
  );
}
