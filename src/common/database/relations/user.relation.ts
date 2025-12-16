import { relations } from 'drizzle-orm';

import { users } from '@/modules/users/domain/users.schema';

// actors
import { organizations } from '@/modules/organizations/domain/organizations.schema';
import { clientProfiles } from '@/modules/clients/clients-profile.schema';
import { employeeProfiles } from '@/modules/employees/domain/employees.schema';
import { psychologistProfiles } from '@/modules/psychologists/psychologist-profile.schema';
import { studentProfiles } from '@/modules/students/domain/student.schema';

export const usersRelations = relations(users, ({ one }) => ({
  organization: one(organizations, {
    fields: [users.organizationId],
    references: [organizations.id],
  }),
  clientProfile: one(clientProfiles, {
    fields: [users.id],
    references: [clientProfiles.userId],
  }),
  employeeProfile: one(employeeProfiles, {
    fields: [users.id],
    references: [employeeProfiles.userId],
  }),
  psychologistProfile: one(psychologistProfiles, {
    fields: [users.id],
    references: [psychologistProfiles.userId],
  }),
  studentProfile: one(studentProfiles, {
    fields: [users.id],
    references: [studentProfiles.userId],
  }),
}));

export const organizationsRelations = relations(organizations, ({ many }) => ({
  users: many(users),
}));

export const clientProfilesRelations = relations(clientProfiles, ({ one }) => ({
  user: one(users, {
    fields: [clientProfiles.userId],
    references: [users.id],
  }),
}));

export const employeeProfilesRelations = relations(
  employeeProfiles,
  ({ one }) => ({
    user: one(users, {
      fields: [employeeProfiles.userId],
      references: [users.id],
    }),
  }),
);

export const studentProfilesRelations = relations(
  studentProfiles,
  ({ one }) => ({
    user: one(users, {
      fields: [studentProfiles.userId],
      references: [users.id],
    }),
  }),
);

export const psychologistProfilesRelations = relations(
  psychologistProfiles,
  ({ one }) => ({
    user: one(users, {
      fields: [psychologistProfiles.userId],
      references: [users.id],
    }),
  }),
);
