export type PatientDirectoryStatus = 'active' | 'archived' | 'all';

const LOCAL_ORIGIN = 'http://nexus-med.local';

export function buildPatientDirectoryHref(query: string, status: PatientDirectoryStatus) {
  const params = new URLSearchParams();
  const normalizedQuery = query.trim();
  if (normalizedQuery) params.set('q', normalizedQuery);
  if (status !== 'active') params.set('status', status);
  const search = params.toString();
  return search ? `/patients?${search}` : '/patients';
}

export function safePatientDirectoryHref(value: string | string[] | undefined) {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (!candidate || candidate.startsWith('//') || candidate.includes('\\')) return '/patients';

  try {
    const parsed = new URL(candidate, LOCAL_ORIGIN);
    if (parsed.origin !== LOCAL_ORIGIN || parsed.pathname !== '/patients') return '/patients';
    const status = parsed.searchParams.get('status');
    const directoryStatus: PatientDirectoryStatus = status === 'archived' || status === 'all' ? status : 'active';
    return buildPatientDirectoryHref(parsed.searchParams.get('q') ?? '', directoryStatus);
  } catch {
    return '/patients';
  }
}

export function buildPatientExpedienteHref(patientId: string, directoryHref: string) {
  const returnTo = safePatientDirectoryHref(directoryHref);
  const params = new URLSearchParams({ returnTo });
  return `/patients/${encodeURIComponent(patientId)}?${params.toString()}`;
}
