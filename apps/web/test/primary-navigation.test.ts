import { describe, expect, it } from 'vitest';
import { getPrimaryNavigationLinks } from '../src/components/shell/primary-navigation';

describe('primary navigation by active workspace', () => {
  it('routes secretary patients to the administrative search section', () => {
    const links = getPrimaryNavigationLinks({ secretary: true, pathname: '/secretaria', section: 'pacientes' });

    expect(links.map(({ label }) => label)).toEqual(['Citas', 'Pacientes', 'Estudios']);
    expect(links.find(({ label }) => label === 'Pacientes')).toMatchObject({
      href: '/secretaria?seccion=pacientes',
      active: true,
    });
    expect(links.some(({ href }) => href === '/patients')).toBe(false);
  });

  it('uses the agenda as the default secretary section and retains its date', () => {
    const links = getPrimaryNavigationLinks({ secretary: true, pathname: '/secretaria', date: '2026-11-12' });

    expect(links[0]).toMatchObject({ href: '/secretaria?seccion=agenda&fecha=2026-11-12', active: true });
  });

  it('shows Citas as active on the physician focused agenda', () => {
    const links = getPrimaryNavigationLinks({ secretary: false, pathname: '/recepcion', section: 'citas', date: '2026-11-12' });

    expect(links.find(({ label }) => label === 'Recepción')?.active).toBe(false);
    expect(links.find(({ label }) => label === 'Citas')).toMatchObject({
      href: '/recepcion?seccion=citas&fecha=2026-11-12',
      active: true,
    });
    expect(links.find(({ label }) => label === 'Pacientes')?.active).toBe(false);
  });
});
