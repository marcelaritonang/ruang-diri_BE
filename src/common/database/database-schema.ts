import { partners } from '@modules/partners/partners.schema';
import { testimonials } from '@modules/testimonials/testimonials.schema';
import { users, userRoleEnum } from '@/modules/users/domain/users.schema';

import {
  organizations,
  organizationTypeEnum,
} from '@/modules/organizations/domain/organizations.schema';

import { clientProfiles } from '@/modules/clients/clients-profile.schema';

import {
  employeeProfiles,
  employeeGenderEnum,
  employeeScreeningEnum,
} from '@/modules/employees/domain/employees.schema';

import {
  studentProfiles,
  iqCategoryEnum,
  genderTypeEnum as studentGenderTypeEnum,
  screeningTypeEnum as studentScreeningTypeEnum,
} from '@/modules/students/domain/student.schema';

import {
  psychologistProfiles,
  psychologistAvailability,
} from '@/modules/psychologists/psychologist-profile.schema';

import {
  screeningTypeEnum,
  actorTypeEnum,
  agendaTypeEnum,
  locationCounselingTypeEnum,
  counselingMethodEnum,
  counselingStatusAppointmentEnum,
} from './database-enums';

import { screenings } from '@/modules/mental-health/domain/screenings/screenings.schema';
import { counselings } from '@/modules/mental-health/domain/counselings/counselings.schema';

import {
  schedules,
  usersSchedules,
  scheduleAttachments,
} from '@/modules/schedules/domain/schedules.schema';

import {
  notifications,
  notificationTypeEnum,
  notificationStatusEnum,
  notificationSubTypeEnum,
} from '@/modules/notifications/domain/notifications.schema';

import {
  chatSessions,
  chatMessages,
  chatUserPresence,
} from '@/modules/chat/domain/chat-sessions.schema';

import { messageSearchIndex } from '@/modules/chat/domain/message-search-index.schema';

export {
  partners,
  testimonials,
  users,
  organizations,
  clientProfiles,
  employeeProfiles,
  studentProfiles,
  psychologistProfiles,
  organizationTypeEnum,
  iqCategoryEnum,
  employeeGenderEnum,
  employeeScreeningEnum,
  userRoleEnum,
  studentScreeningTypeEnum,
  studentGenderTypeEnum,
  schedules,
  usersSchedules,
  actorTypeEnum,
  screeningTypeEnum,
  counselings,
  screenings,
  agendaTypeEnum,
  locationCounselingTypeEnum,
  notificationTypeEnum,
  notificationStatusEnum,
  notifications,
  scheduleAttachments,
  notificationSubTypeEnum,
  chatSessions,
  chatMessages,
  messageSearchIndex,
  psychologistAvailability,
  counselingMethodEnum,
  counselingStatusAppointmentEnum,
  chatUserPresence,
};
