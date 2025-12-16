import { relations } from 'drizzle-orm';

import { users } from '@/modules/users/domain/users.schema';
import {
  psychologistProfiles,
  psychologistAvailability,
} from '@/modules/psychologists/psychologist-profile.schema';

export const psychologistProfileRelations = relations(
  psychologistProfiles,
  ({ one, many }) => ({
    user: one(users, {
      fields: [psychologistProfiles.userId],
      references: [users.id],
    }),
    availability: many(psychologistAvailability),
  }),
);

export const psychologistAvailabilityRelations = relations(
  psychologistAvailability,
  ({ one }) => ({
    psychologist: one(psychologistProfiles, {
      fields: [psychologistAvailability.psychologistId],
      references: [psychologistProfiles.userId],
    }),
  }),
);
