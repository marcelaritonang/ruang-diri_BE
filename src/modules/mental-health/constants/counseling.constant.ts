export type IStatusAppointment =
  | 'scheduled'
  | 'completed'
  | 'cancelled'
  | 'rescheduled';

export const statusAppointment = {
  SCHEDULED: 'scheduled',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  RESCHEDULED: 'rescheduled',
} as const;

export const arrStatusAppointment = [
  statusAppointment.SCHEDULED,
  statusAppointment.COMPLETED,
  statusAppointment.CANCELLED,
  statusAppointment.RESCHEDULED,
] as const;
