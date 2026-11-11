import type { Appointment } from '@nexus-med/contracts';

/** Selected-date agenda and all-date reception deliberately have different scopes. */
export function summarizeReception(appointments: Appointment[], queue: Appointment[], asOf: string) {
  const active = appointments.filter(item => item.status !== 'cancelled');
  const completed = active.filter(item => item.status === 'completed').length;
  const openQueue = queue.filter(item => item.status === 'scheduled' && item.arrivedAt);
  return {
    total: active.length,
    completed,
    cancelled: appointments.length - active.length,
    plannedMinutes: active.reduce((minutes, item) => minutes + item.durationMinutes, 0),
    waiting: openQueue.filter(item => !item.attentionStartedAt).length,
    attending: openQueue.filter(item => item.attentionStartedAt).length,
    next: active.filter(item => item.status === 'scheduled' && !item.arrivedAt && Date.parse(item.startAt) >= Date.parse(asOf))
      .sort((left, right) => Date.parse(left.startAt) - Date.parse(right.startAt))[0] ?? null,
  };
}
