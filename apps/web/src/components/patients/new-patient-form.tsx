'use client';

// New patient form (UI_SPEC §3.2). Client validation via the shared
// contract schema first; the API remains authoritative. Recoverable errors
// preserve all entered values.

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import {
  type CreatePatientInput,
  createPatientInputSchema,
} from '@nexus-med/contracts';

import { ApiError, createPatient } from '../../lib/api/client';
import { ErrorBanner, InfoNotice } from '../primitives';

type FieldErrors = Record<string, string[]>;

function todayIso(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export function NewPatientForm({
  prefillName,
  existingPatients,
}: {
  prefillName?: string;
  existingPatients: { id: string; fullName: string }[];
}) {
  const router = useRouter();
  const [values, setValues] = useState({
    fullName: prefillName ?? '',
    dateOfBirth: '',
    phone: '',
    email: '',
    externalIdentifier: '',
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const duplicate = useMemo(() => {
    const name = values.fullName.trim().toLowerCase();
    if (!name) return null;
    return existingPatients.find((p) => p.fullName.trim().toLowerCase() === name) ?? null;
  }, [values.fullName, existingPatients]);

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

    const candidate: CreatePatientInput = {
      fullName: values.fullName.trim(),
      ...(values.dateOfBirth ? { dateOfBirth: values.dateOfBirth } : {}),
      ...(values.phone.trim() ? { phone: values.phone.trim() } : {}),
      ...(values.email.trim() ? { email: values.email.trim() } : {}),
      ...(values.externalIdentifier.trim()
        ? { externalIdentifier: values.externalIdentifier.trim() }
        : {}),
    };

    const parsed = createPatientInputSchema.safeParse(candidate);
    if (!parsed.success) {
      const errs: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? 'form');
        (errs[key] ??= []).push(issue.message);
      }
      setFieldErrors(errs);
      return;
    }

    if (candidate.dateOfBirth && candidate.dateOfBirth > todayIso()) {
      setFieldErrors({ dateOfBirth: ['La fecha de nacimiento no puede ser futura'] });
      return;
    }

    setSaving(true);
    try {
      const created = await createPatient(candidate);
      router.push(`/patients/${created.id}`);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fieldErrors).length > 0) {
        setFieldErrors(err.fieldErrors);
      } else {
        setBanner(
          err instanceof Error
            ? 'No se pudo guardar el paciente. Tus datos siguen en el formulario.'
            : 'No se pudo guardar el paciente.',
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
            aria-describedby={errorFor('fullName') ? 'fullName-error' : undefined}
            placeholder="Apellido Paterno, Apellido Materno, Nombre"
            autoFocus
          />
          {errorFor('fullName') ? (
            <div className="field-error" id="fullName-error">
              {errorFor('fullName')}
            </div>
          ) : null}
        </div>

        <div className="field">
          <label htmlFor="dateOfBirth">Fecha de nacimiento</label>
          <input
            id="dateOfBirth"
            name="dateOfBirth"
            type="date"
            value={values.dateOfBirth}
            onChange={set('dateOfBirth')}
            aria-invalid={errorFor('dateOfBirth') ? 'true' : undefined}
            aria-describedby={errorFor('dateOfBirth') ? 'dateOfBirth-error' : undefined}
          />
          {errorFor('dateOfBirth') ? (
            <div className="field-error" id="dateOfBirth-error">
              {errorFor('dateOfBirth')}
            </div>
          ) : null}
        </div>

        <div className="field">
          <label htmlFor="phone">Teléfono</label>
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
          <label htmlFor="email">Correo electrónico</label>
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
          <label htmlFor="externalIdentifier">Identificador externo</label>
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

      {duplicate !== null ? (
        <InfoNotice>
          Existe un paciente con este nombre:{' '}
          <Link href={`/patients/${duplicate.id}`}>{duplicate.fullName}</Link>
        </InfoNotice>
      ) : null}

      {banner ? <ErrorBanner message={banner} /> : null}

      <div className="btn-row">
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar paciente'}
        </button>
        <Link href="/patients" className="btn btn-ghost">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
