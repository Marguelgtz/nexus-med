'use client';

// Edit demographics form (UI_SPEC §3.4). Pre-filled from the current
// record; an empty input clears the field (API treats null as clear).
// An update never creates a duplicate (UI_SPEC §1.1 / US-003).

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { type UpdatePatientInput, updatePatientInputSchema } from '@nexus-med/contracts';

import { ApiError, updatePatient } from '../../lib/api/client';
import { ErrorBanner } from '../primitives';
import { useBeforeUnloadGuard } from '../../lib/use-before-unload-guard';

type FieldErrors = Record<string, string[]>;

export function EditPatientForm({
  patientId,
  initial,
}: {
  patientId: string;
  initial: {
    fullName: string;
    dateOfBirth: string | null;
    phone: string | null;
    email: string | null;
    externalIdentifier: string | null;
  };
}) {
  const router = useRouter();
  const [values, setValues] = useState({
    fullName: initial.fullName,
    dateOfBirth: initial.dateOfBirth ?? '',
    phone: initial.phone ?? '',
    email: initial.email ?? '',
    externalIdentifier: initial.externalIdentifier ?? '',
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Dirty while any field differs from the saved values the form loaded with.
  const dirty =
    values.fullName !== initial.fullName ||
    values.dateOfBirth !== (initial.dateOfBirth ?? '') ||
    values.phone !== (initial.phone ?? '') ||
    values.email !== (initial.email ?? '') ||
    values.externalIdentifier !== (initial.externalIdentifier ?? '');
  useBeforeUnloadGuard(dirty);

  const set = (field: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setValues((v) => ({ ...v, [field]: e.target.value }));
    setFieldErrors((fe) => {
      if (!fe[field]) return fe;
      const next = { ...fe };
      delete next[field];
      return next;
    });
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBanner(null);

    // Empty input = explicit clear (null); fullName stays required.
    const candidate: UpdatePatientInput = {
      fullName: values.fullName.trim(),
      dateOfBirth: values.dateOfBirth || null,
      phone: values.phone.trim() || null,
      email: values.email.trim() || null,
      externalIdentifier: values.externalIdentifier.trim() || null,
    };

    const parsed = updatePatientInputSchema.safeParse(candidate);
    if (!parsed.success) {
      const errs: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? 'form');
        (errs[key] ??= []).push(issue.message);
      }
      setFieldErrors(errs);
      return;
    }

    setSaving(true);
    try {
      await updatePatient(patientId, candidate);
      router.push(`/patients/${patientId}`);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fieldErrors).length > 0) {
        setFieldErrors(err.fieldErrors);
      } else {
        setBanner(
          err instanceof Error
            ? 'No se pudieron guardar los cambios. Tus datos siguen en el formulario.'
            : 'No se pudieron guardar los cambios.',
        );
      }
      setSaving(false);
    }
  };

  const errorFor = (field: string) => fieldErrors[field]?.[0] ?? null;

  return (
    <form onSubmit={onSubmit} noValidate>
      <div className="card">
        <div className="field">
          <label htmlFor="fullName">
            Nombre completo <span className="required">*</span>
          </label>
          <input
            id="fullName"
            name="fullName"
            value={values.fullName}
            onChange={set('fullName')}
            aria-invalid={errorFor('fullName') ? 'true' : undefined}
          />
          {errorFor('fullName') ? (
            <div className="field-error">{errorFor('fullName')}</div>
          ) : null}
        </div>

        <div className="field">
          <label htmlFor="dateOfBirth">
            Fecha de nacimiento <span className="faint">(vacío = borrar)</span>
          </label>
          <input
            id="dateOfBirth"
            name="dateOfBirth"
            type="date"
            value={values.dateOfBirth}
            onChange={set('dateOfBirth')}
            aria-invalid={errorFor('dateOfBirth') ? 'true' : undefined}
          />
          {errorFor('dateOfBirth') ? (
            <div className="field-error">{errorFor('dateOfBirth')}</div>
          ) : null}
        </div>

        <div className="field">
          <label htmlFor="phone">
            Teléfono <span className="faint">(vacío = borrar)</span>
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            value={values.phone}
            onChange={set('phone')}
            aria-invalid={errorFor('phone') ? 'true' : undefined}
          />
          {errorFor('phone') ? <div className="field-error">{errorFor('phone')}</div> : null}
        </div>

        <div className="field">
          <label htmlFor="email">
            Correo electrónico <span className="faint">(vacío = borrar)</span>
          </label>
          <input
            id="email"
            name="email"
            type="email"
            value={values.email}
            onChange={set('email')}
            aria-invalid={errorFor('email') ? 'true' : undefined}
          />
          {errorFor('email') ? <div className="field-error">{errorFor('email')}</div> : null}
        </div>

        <div className="field">
          <label htmlFor="externalIdentifier">
            Identificador externo <span className="faint">(vacío = borrar)</span>
          </label>
          <input
            id="externalIdentifier"
            name="externalIdentifier"
            value={values.externalIdentifier}
            onChange={set('externalIdentifier')}
            aria-invalid={errorFor('externalIdentifier') ? 'true' : undefined}
          />
          {errorFor('externalIdentifier') ? (
            <div className="field-error">{errorFor('externalIdentifier')}</div>
          ) : null}
        </div>
      </div>

      {banner ? <ErrorBanner message={banner} /> : null}

      <div className="btn-row">
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar cambios'}
        </button>
        <Link href={`/patients/${patientId}`} className="btn btn-ghost">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
