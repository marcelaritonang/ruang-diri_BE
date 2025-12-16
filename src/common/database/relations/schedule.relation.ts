import { relations } from 'drizzle-orm';

import { users } from '@/modules/users/domain/users.schema';

import {
  schedules,
  usersSchedules,
  scheduleAttachments,
} from '@/modules/schedules/domain/schedules.schema';

export const schedulesRelations = relations(schedules, ({ many }) => ({
  usersSchedules: many(usersSchedules),
  attachments: many(scheduleAttachments),
}));

export const usersSchedulesRelations = relations(usersSchedules, ({ one }) => ({
  user: one(users, {
    fields: [usersSchedules.userId],
    references: [users.id],
  }),
  schedule: one(schedules, {
    fields: [usersSchedules.scheduleId],
    references: [schedules.id],
  }),
}));

export const scheduleAttachmentsRelations = relations(
  scheduleAttachments,
  ({ one }) => ({
    schedule: one(schedules, {
      fields: [scheduleAttachments.scheduleId],
      references: [schedules.id],
    }),
  }),
);
