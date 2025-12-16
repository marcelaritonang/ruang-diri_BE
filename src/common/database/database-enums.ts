import { pgEnum } from 'drizzle-orm/pg-core';

import { counselingMethods } from '@/modules/psychologists/constants/psychologist.constant';
import { arrStatusAppointment } from '@/modules/mental-health/constants/counseling.constant';

export const agendaTypes = [
  'counseling',
  'class',
  'seminar',
  'others',
] as const;

export const screeningTypeEnum = pgEnum('screening_type', [
  'stable',
  'at_risk',
  'monitored',
]);

export const actorTypeEnum = pgEnum('actor_type', ['student', 'employee']);

export const agendaTypeEnum = pgEnum('agenda_type', [
  'counseling',
  'class',
  'seminar',
  'others',
]);

export const locationCounselingTypeEnum = pgEnum('location_counseling_type', [
  'online',
  'offline',
  'organization',
  'chat',
]);

export const counselingMethodEnum = pgEnum('counseling_method', [
  Object.values(counselingMethods).join(', '),
]);

export const counselingStatusAppointmentEnum = pgEnum(
  'counseling_status_appointment',
  arrStatusAppointment,
);
