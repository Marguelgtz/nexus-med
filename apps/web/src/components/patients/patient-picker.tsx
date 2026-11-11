'use client';
import { useState } from 'react';
import type { PatientSummary } from '@nexus-med/contracts';
import { Modal } from '../modal';
import { formatAge } from '../../lib/format';
export function PatientPicker({ patients, title, onSelect, onClose, onCreate }: {
  patients: PatientSummary[]; title: string; onSelect: (patient: PatientSummary) => void; onClose: () => void; onCreate?: () => void;
}) {
  const [query, setQuery] = useState('');
  const normalized = query.trim().toLocaleLowerCase();
  const matches = patients.filter(p => !p.isArchived && `${p.fullName} ${p.externalIdentifier ?? ''}`.toLocaleLowerCase().includes(normalized));
  return <Modal title={title} description="Busca al paciente antes de continuar." onClose={onClose}>
    <div className="field"><label htmlFor="choose-patient">Nombre o identificador</label><input id="choose-patient" type="search" value={query} onChange={e => setQuery(e.target.value)} /></div>
    <ul className="patient-picker-results">{matches.map(p => <li key={p.id}><button className="patient-picker-option" onClick={() => onSelect(p)}>
      <strong>{p.fullName}</strong><span>{p.externalIdentifier ?? 'Sin identificador'} · {formatAge(p.dateOfBirth) !== null ? `${formatAge(p.dateOfBirth)} años` : 'Edad sin registro'}</span>
    </button></li>)}</ul>
    {!matches.length ? <p className="muted">No hay pacientes que coincidan.</p> : null}
    {onCreate ? <div className="btn-row"><button className="btn btn-secondary" onClick={onCreate}>Registrar nuevo paciente</button></div> : null}
  </Modal>;
}
