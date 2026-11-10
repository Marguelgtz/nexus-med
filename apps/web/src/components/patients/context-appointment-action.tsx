'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import type { Appointment } from '@nexus-med/contracts';

import { AppointmentForm } from '../appointments/appointment-form';
import { formatDateTime } from '../../lib/format';

export function ContextAppointmentAction({ patientId }: { patientId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [created, setCreated] = useState<Appointment | null>(null);

  function handleCreated(appointment: Appointment) {
    setCreated(appointment);
    setOpen(false);
    router.refresh();
  }

  return (
    <section className="card context-appointment-action" aria-labelledby="context-appointment-title">
      <div className="card-header">
        <h2 id="context-appointment-title">Citas</h2>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => {
            if (open && !window.confirm('¿Cerrar el formulario de cita y descartar lo escrito?')) return;
            setOpen((value) => !value);
          }}
          aria-expanded={open}
          aria-controls="context-appointment-form"
        >
          {open ? 'Cerrar formulario' : 'Nueva cita'}
        </button>
      </div>
      {created ? (
        <p className="notice" role="status">
          Cita creada para {formatDateTime(created.startAt)}.{' '}
          <Link href={`/patients/${patientId}/citas/${created.id}`}>Ver cita</Link>
        </p>
      ) : null}
      <div id="context-appointment-form" hidden={!open}>
        {open ? (
          <AppointmentForm patientId={patientId} onCreated={handleCreated} />
        ) : null}
      </div>
    </section>
  );
}
