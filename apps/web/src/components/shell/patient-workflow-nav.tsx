'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

/** Patient-aware navigation is shown only after a patient route is selected. */
export function PatientWorkflowNav() {
  const pathname = usePathname();
  const [, area, patientId] = pathname.split('/');
  const patientHref = `/patients/${patientId}`;
  const router = useRouter();
  // Preserve bookmarks from the former all-in-one record, including study links.
  useEffect(() => {
    if (area !== 'patients' || !patientId || patientId === 'new' || pathname !== patientHref) return;
    const redirectLegacyAnchor = () => {
      const hash = window.location.hash;
      const destination = hash === '#patient-history' ? '/consultas'
        : hash === '#patient-studies' ? '/estudios'
        : hash === '#patient-documents' ? '/documentos'

        : hash.startsWith('#study-') ? `/estudios${hash}` : null;
      if (destination) router.replace(`${patientHref}${destination}`);
    };
    redirectLegacyAnchor();
    window.addEventListener('hashchange', redirectLegacyAnchor);
    return () => window.removeEventListener('hashchange', redirectLegacyAnchor);
  }, [pathname, patientHref, patientId, area, router]);
  if (area !== 'patients' || !patientId || patientId === 'new') return null;
  const onConsultation = pathname.startsWith(`${patientHref}/consultas`);
  const onAppointment = pathname.startsWith(`${patientHref}/citas`);
  const onDocument = pathname === `${patientHref}/documentos` || pathname.startsWith(`${patientHref}/recetas`) || pathname.startsWith(`${patientHref}/informes`);
  const onNewConsultation = pathname === `${patientHref}/consultas/nueva`;
  const links = [
    { href: patientHref, label: 'Resumen', active: pathname === patientHref || pathname === `${patientHref}/antecedentes` || pathname === `${patientHref}/editar` },
    { href: `${patientHref}/consultas`, label: 'Consultas', active: onConsultation },
    { href: `${patientHref}/citas`, label: 'Citas', active: onAppointment },
    { href: `${patientHref}/estudios`, label: 'Estudios', active: pathname === `${patientHref}/estudios` },
    { href: `${patientHref}/documentos`, label: 'Recetas e informes', active: onDocument },
  ];

  return (
    <nav className="patient-workflow-nav" aria-label="Flujos del paciente">
      {pathname !== patientHref && pathname !== `${patientHref}/consultas` && !onNewConsultation ? (
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
