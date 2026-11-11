'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { PatientSummary } from '@nexus-med/contracts';
import { formatAge } from '../../lib/format';

type SearchablePatient = PatientSummary & { phone?: string | null; email?: string | null };
type Position = { top: number; left: number; width: number; maxHeight: number };

/** Compact, search-first patient selection anchored to the action that opened it. */
export function PatientPicker({ patients, title, anchor, searchContacts = false, onSelect, onClose, onCreate }: {
  patients: SearchablePatient[]; title: string; anchor: HTMLElement;
  searchContacts?: boolean;
  onSelect: (patient: PatientSummary) => void; onClose: () => void; onCreate?: () => void;
}) {
  const [query, setQuery] = useState('');
  const [position, setPosition] = useState<Position | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const searchId = useId();
  const titleId = useId();
  const normalized = query.trim().toLocaleLowerCase();
  const matches = normalized.length >= 2
    ? patients.filter(patient => !patient.isArchived &&
      `${patient.fullName} ${patient.externalIdentifier ?? ''} ${searchContacts ? `${patient.phone ?? ''} ${patient.email ?? ''}` : ''}`
        .toLocaleLowerCase().includes(normalized))
    : [];

  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    const place = () => {
      const bounds = anchor.getBoundingClientRect();
      const width = Math.min(420, window.innerWidth - 24);
      const left = Math.min(Math.max(12, bounds.left), window.innerWidth - width - 12);
      const top = Math.min(bounds.bottom + 8, window.innerHeight - 120);
      setPosition({ top, left, width, maxHeight: Math.max(160, window.innerHeight - top - 12) });
    };
    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node) || (root.current?.contains(target) ?? false) || anchor.contains(target)) return;
      onCloseRef.current();
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      onCloseRef.current();
    };
    place();
    requestAnimationFrame(() => root.current?.querySelector<HTMLInputElement>('input')?.focus());
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    document.addEventListener('pointerdown', closeOnOutsidePointer);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
      document.removeEventListener('pointerdown', closeOnOutsidePointer);
      document.removeEventListener('keydown', closeOnEscape);
      if (anchor.isConnected) anchor.focus();
    };
  }, [anchor]);

  if (!position) return null;
  return createPortal(
    <div ref={root} className="patient-picker" role="dialog" aria-labelledby={titleId}
      style={{ top: position.top, left: position.left, width: position.width, maxHeight: position.maxHeight }}>
      <header className="patient-picker-header">
        <h2 id={titleId}>{title}</h2>
        <button type="button" className="btn btn-ghost btn-icon patient-picker-close" onClick={onClose} aria-label="Cerrar búsqueda" title="Cerrar">×</button>
      </header>
      {onCreate ? <div className="patient-picker-create"><button type="button" className="btn btn-secondary" onClick={onCreate}>Registrar nuevo paciente</button></div> : null}
      <div className="patient-picker-divider" />
      <div className="field patient-picker-search">
        <label htmlFor={searchId}>Buscar paciente</label>
        <input id={searchId} type="search" value={query} onChange={event => setQuery(event.target.value)}
          placeholder={searchContacts ? 'Nombre, identificador, teléfono o correo' : 'Nombre o identificador'} autoComplete="off" />
      </div>
      {normalized.length < 2 ? <p className="field-hint patient-picker-hint">Escribe al menos 2 caracteres para ver coincidencias.</p>
        : matches.length ? <ul className="patient-picker-results" aria-label="Resultados de pacientes">{matches.map(patient => <li key={patient.id}>
          <button type="button" className="patient-picker-option" onClick={() => onSelect(patient)}>
            <strong>{patient.fullName}</strong><span>{patient.externalIdentifier ?? 'Sin identificador'} · {formatAge(patient.dateOfBirth) !== null ? `${formatAge(patient.dateOfBirth)} años` : 'Edad sin registro'}</span>
          </button>
        </li>)}</ul> : <p className="field-hint patient-picker-hint">No hay pacientes que coincidan. Revisa la búsqueda o registra uno nuevo.</p>}
    </div>, document.body,
  );
}
