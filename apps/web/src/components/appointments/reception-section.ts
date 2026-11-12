export type ReceptionSection = 'agenda' | 'citas' | 'pacientes' | 'estudios';

export function resolveReceptionSection(
  administrative: boolean,
  requested: string | undefined,
): ReceptionSection {
  if (administrative) {
    if (requested === 'pacientes' || requested === 'estudios') return requested;
    return 'agenda';
  }

  return requested === 'citas' ? 'citas' : 'agenda';
}
