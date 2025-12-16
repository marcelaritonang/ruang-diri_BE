import {
  clientProfilesRelations,
  employeeProfilesRelations,
  organizationsRelations,
  psychologistProfilesRelations,
  studentProfilesRelations,
  usersRelations,
} from '@/common/database/relations/user.relation';

import {
  schedulesRelations,
  usersSchedulesRelations,
  scheduleAttachmentsRelations,
} from './relations/schedule.relation';

import {
  counselingsRelations,
  screeningsRelations,
  usersMhRelations,
} from './relations/mental-health.relation';

import {
  psychologistProfileRelations,
  psychologistAvailabilityRelations,
} from './relations/psychologist.relation';

export {
  usersRelations,
  organizationsRelations,
  clientProfilesRelations,
  employeeProfilesRelations,
  studentProfilesRelations,
  psychologistProfilesRelations,
  schedulesRelations,
  usersSchedulesRelations,
  counselingsRelations,
  screeningsRelations,
  usersMhRelations,
  scheduleAttachmentsRelations,
  psychologistProfileRelations,
  psychologistAvailabilityRelations,
};
