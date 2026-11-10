'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/** Patient-aware navigation is shown only after a patient route is selected. */
export function PatientWorkflowNav() {
  const pathname = usePathname();
  const [, area, patientId] = pathname.split('/');
  if (area !== 'patients' || !patientId || patientId === 'new') return null;

  const patientHref = `/patients/${patientId}`;
  const onConsultation = pathname.startsWith(`${patientHref}/consultas`);
  const onAppointment = pathname.startsWith(`${patientHref}/citas`);
  const onDocument = pathname.startsWith(`${patientHref}/recetas`) || pathname.startsWith(`${patientHref}/informes`);
  const onNewConsultation = pathname === `${patientHref}/consultas/nueva`;
  const links = [
    { href: patientHref, label: 'Resumen', active: pathname === patientHref },
    { href: `${patientHref}#patient-history`, label: 'Consultas', active: onConsultation },
    { href: `${patientHref}/citas`, label: 'Citas', active: onAppointment },
    { href: `${patientHref}#patient-studies`, label: 'Estudios', active: false },
    { href: `${patientHref}#patient-documents`, label: 'Recetas e informes', active: onDocument },
    { href: `${patientHref}/contexto-clinico`, label: 'Contexto clínico', active: pathname === `${patientHref}/contexto-clinico` },
  ];

  return (
    <nav className="patient-workflow-nav" aria-label="Flujos del paciente">
      {pathname !== patientHref && !onNewConsultation ? (
        <Link href={`${patientHref}/consultas/nueva`} className="btn btn-primary patient-nav-start">
          Nueva consulta
        </Link>
      ) : null}
      <div className="patient-nav-links">
        {links.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            aria-current={item.active ? 'page' : undefined}
            className={item.active ? 'active' : undefined}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
