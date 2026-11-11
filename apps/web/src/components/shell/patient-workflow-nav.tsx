'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Icon, type IconName } from '../icon';

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
      const destination = hash === '#patient-history' ? '/citas-y-consultas'
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
  const activityHref = `${patientHref}/citas-y-consultas`;
  const onActivity = pathname === activityHref || pathname.startsWith(`${patientHref}/citas/`) || pathname.startsWith(`${patientHref}/consultas`);
  const onDocument = pathname === `${patientHref}/documentos` || pathname.startsWith(`${patientHref}/recetas`) || pathname.startsWith(`${patientHref}/informes`);
  const onNewConsultation = pathname === `${patientHref}/consultas/nueva`;
  const links = [
    { href: patientHref, label: 'Resumen', active: pathname === patientHref || pathname === `${patientHref}/antecedentes` || pathname === `${patientHref}/editar` },
    { href: activityHref, label: 'Citas y consultas', active: onActivity },
    { href: `${patientHref}/estudios`, label: 'Estudios', active: pathname === `${patientHref}/estudios` },
    { href: `${patientHref}/documentos`, label: 'Recetas e informes', active: onDocument },
  ];
  const renderLinks = () => links.map((item) => (
    <Link
      key={item.label}
      href={item.href}
      aria-current={item.active ? 'page' : undefined}
      className={item.active ? 'active' : undefined}
    >
      <Icon name={({ Resumen: 'grid', 'Citas y consultas': 'activity', Estudios: 'document', 'Recetas e informes': 'document' } as Record<string, IconName>)[ item.label] ?? 'grid'} />{item.label}
    </Link>
  ));
  const activeSection = links.find((item) => item.active)?.label ?? 'Paciente';

  return (
    <nav className="patient-workflow-nav" aria-label="Flujos del paciente">
      {pathname !== patientHref && pathname !== activityHref && !onNewConsultation ? (
        <Link href={`${patientHref}/consultas/nueva`} className="btn btn-primary patient-nav-start">
          Nueva consulta
        </Link>
      ) : null}
      <div className="patient-nav-links patient-nav-links-wide">{renderLinks()}</div>
      <details className="patient-nav-disclosure">
        <summary>
          <span>Secciones</span>
          <span className="patient-nav-current">{activeSection}</span>
          <span aria-hidden="true">⌄</span>
        </summary>
        <div className="patient-nav-links">{renderLinks()}</div>
      </details>
    </nav>
  );
}
