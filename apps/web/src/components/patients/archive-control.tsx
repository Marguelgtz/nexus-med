'use client';

// Archive control (UI_SPEC §3.3): ghost-danger button that toggles an
// inline confirmation panel below the header (never a modal). Success
// navigates to /patients?status=archived so the patient is seen in its
// new place. Archiving is non-destructive and server-guaranteed.

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { ApiError, archivePatient } from '../../lib/api/client';
import { ErrorBanner } from '../primitives';

export function ArchiveControl({ patientId, fullName }: { patientId: string; fullName: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onArchive = async () => {
    setBusy(true);
    setError(null);
    try {
      await archivePatient(patientId);
      router.replace('/patients?status=archived');
      router.refresh();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'No se pudo archivar el paciente. Inténtalo de nuevo.',
      );
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className="btn btn-ghost-danger"
        onClick={() => {
          setConfirming(true);
          setError(null);
        }}
      >
        Archivar paciente
      </button>

      {confirming ? (
        <div className="inline-confirm" role="alertdialog" aria-label={`¿Archivar a ${fullName}?`}>
          <div className="confirm-head">¿Archivar a {fullName}?</div>
          <div className="confirm-body">
            <p>
              El paciente dejará de aparecer en el listado activo. Sus consultas y antecedentes se
              conservan. Esta acción no puede deshacerse en esta versión.
            </p>
            {error ? <ErrorBanner message={error} /> : null}
            <div className="btn-row" style={{ marginTop: 0 }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setConfirming(false);
                  setBusy(false);
                }}
                disabled={busy}
              >
                Cancelar
              </button>
              <button type="button" className="btn btn-danger" onClick={onArchive} disabled={busy}>
                {busy ? 'Archivando…' : 'Archivar'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
