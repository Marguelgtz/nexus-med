// Appointment/study badges (UI_SPEC §7.1): the only color coding in the
// app is status; the type appears as a neutral label so the calendar
// stays scannable.

import {
  APPOINTMENT_STATUS_LABELS,
  APPOINTMENT_TYPE_LABELS,
  STUDY_CATEGORY_LABELS,
  STUDY_STATUS_LABELS,
} from '../../lib/format';

export function AppointmentTypeBadge({ type }: { type: string }) {
  return <span className="badge badge-type">{APPOINTMENT_TYPE_LABELS[type] ?? type}</span>;
}

const STATUS_CLASS: Record<string, string> = {
  scheduled: 'badge-status-scheduled',
  completed: 'badge-status-completed',
  cancelled: 'badge-status-cancelled',
};

export function AppointmentStatusBadge({ status }: { status: string }) {
  return (
    <span className={`badge ${STATUS_CLASS[status] ?? ''}`}>
      {APPOINTMENT_STATUS_LABELS[status] ?? status}
    </span>
  );
}

// Study statuses use their own classes: `Completada` shares the appointment
// style, `Ordenada` is the info badge, `Revisada` is success-outlined.
const STUDY_STATUS_CLASS: Record<string, string> = {
  ordered: 'badge-status-ordered',
  completed: 'badge-status-completed',
  reviewed: 'badge-status-reviewed',
};

export function StudyStatusBadge({ status }: { status: string }) {
  return (
    <span className={`badge ${STUDY_STATUS_CLASS[status] ?? ''}`}>
      {STUDY_STATUS_LABELS[status] ?? status}
    </span>
  );
}

export function StudyCategoryBadge({ category }: { category: string }) {
  return <span className="badge badge-type">{STUDY_CATEGORY_LABELS[category] ?? category}</span>;
}
