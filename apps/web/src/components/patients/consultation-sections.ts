/** Shared clinical labels/order; stages are presentation only, not required checkpoints. */
export const CONSULTATION_STAGES = ['Motivo y antecedentes', 'Exploración y valoración', 'Plan y revisión'] as const;
export const CONSULTATION_SECTIONS = [
  { key: 'reason', label: 'Motivo de consulta', rows: 2, stage: 0 },
  { key: 'historyOfPresentIllness', label: 'Enfermedad actual', rows: 3, stage: 0 },
  { key: 'relevantHistory', label: 'Antecedentes relevantes', rows: 2, stage: 0 },
  { key: 'physicalExamination', label: 'Exploración física', rows: 4, stage: 1 },
  { key: 'assessment', label: 'Valoración', rows: 3, stage: 1 },
  { key: 'plan', label: 'Plan', rows: 3, stage: 2 },
  { key: 'followUp', label: 'Seguimiento', rows: 2, stage: 2 },
] as const;
export type ConsultationValues = Record<(typeof CONSULTATION_SECTIONS)[number]['key'], string>;
