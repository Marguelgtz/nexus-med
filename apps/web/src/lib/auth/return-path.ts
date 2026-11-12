export function safeInternalReturnPath(value: string | null | undefined): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return '/';
  try {
    const parsed = new URL(value, 'https://nexus-med.invalid');
    if (parsed.origin !== 'https://nexus-med.invalid') return '/';
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return '/';
  }
}

