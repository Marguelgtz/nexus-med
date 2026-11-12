import type { IconName } from '../icon';

export type PrimaryNavigationLink = {
  href: string;
  label: string;
  icon: IconName;
  active: boolean;
};

function withQuery(pathname: string, values: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value) params.set(key, value);
  }
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function getPrimaryNavigationLinks({
  secretary,
  pathname,
  section,
  date,
}: {
  secretary: boolean;
  pathname: string;
  section?: string | null;
  date?: string | null;
}): PrimaryNavigationLink[] {
  if (secretary) {
    const selectedSection = section === 'pacientes' || section === 'estudios' ? section : 'agenda';
    return [
      {
        href: withQuery('/secretaria', { seccion: 'agenda', fecha: date ?? undefined }),
        label: 'Citas',
        icon: 'activity',
        active: selectedSection === 'agenda',
      },
      {
        href: '/secretaria?seccion=pacientes',
        label: 'Pacientes',
        icon: 'users',
        active: selectedSection === 'pacientes',
      },
      {
        href: '/secretaria?seccion=estudios',
        label: 'Estudios',
        icon: 'document',
        active: selectedSection === 'estudios',
      },
    ];
  }

  const isReception = pathname === '/recepcion';
  return [
    {
      href: withQuery('/recepcion', { fecha: date ?? undefined }),
      label: 'Recepción',
      icon: 'activity',
      active: isReception && section !== 'citas',
    },
    {
      href: withQuery('/recepcion', { seccion: 'citas', fecha: date ?? undefined }),
      label: 'Citas',
      icon: 'calendar',
      active: isReception && section === 'citas',
    },
    {
      href: '/estudios',
      label: 'Estudios',
      icon: 'document',
      active: pathname === '/estudios',
    },
    {
      href: '/patients',
      label: 'Pacientes',
      icon: 'users',
      active: pathname === '/patients' || pathname.startsWith('/patients/'),
    },
    {
      href: '/calendar',
      label: 'Calendario',
      icon: 'calendar',
      active: pathname === '/calendar' || pathname.startsWith('/calendar/'),
    },
  ];
}
