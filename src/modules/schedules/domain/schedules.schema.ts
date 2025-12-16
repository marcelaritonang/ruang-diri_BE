import {
  pgTable,
  uuid,
  timestamp,
  varchar,
  primaryKey,
  integer,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

import { organizations, users } from '@/common/database/database-schema';
import {
  agendaTypeEnum,
  locationCounselingTypeEnum,
} from '@/common/database/database-enums';

export const schedules = pgTable(
  'schedules',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id').references(() => organizations.id),
    psychologistId: uuid('psychologist_id').references(() => users.id),
    agenda: varchar('agenda', { length: 255 }).notNull(),
    startDateTime: timestamp('start_date_time', {
      mode: 'date',
      withTimezone: false,
    }).notNull(),
    endDateTime: timestamp('end_date_time', {
      mode: 'date',
      withTimezone: false,
    }).notNull(),
    originalTimezone: varchar('original_timezone', { length: 50 }).notNull(),
    location: locationCounselingTypeEnum('location'),
    customLocation: varchar('custom_location', { length: 255 }),
    description: varchar('description'),
    notificationOffset: integer('notification_offset').notNull(),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id),
    updatedBy: uuid('updated_by').references(() => users.id),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
    type: agendaTypeEnum('type'),
    zoomJoinUrl: varchar('zoom_join_url', { length: 1024 }),
    zoomStartUrl: varchar('zoom_start_url', { length: 1024 }),
  },
  (t) => [
    sql`CONSTRAINT schedules_one_owner CHECK (
      ((${t.organizationId} IS NOT NULL)::int + (${t.psychologistId} IS NOT NULL)::int) = 1
    )`,
    index('idx_schedules_organization_id').on(t.organizationId),
    index('idx_schedules_type').on(t.type),
    index('idx_schedules_org_type').on(t.organizationId, t.type),
    index('idx_sched_psy_time').on(t.psychologistId, t.startDateTime),
    index('idx_sched_org_time').on(t.organizationId, t.startDateTime),
  ],
);

export const usersSchedules = pgTable(
  'users_schedules',
  {
    scheduleId: uuid('schedule_id')
      .notNull()
      .references(() => schedules.id),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.scheduleId, t.userId] }),
    index('idx_users_schedules_user_id').on(t.userId),
  ],
);

export const scheduleAttachments = pgTable(
  'schedule_attachments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    scheduleId: uuid('schedule_id')
      .notNull()
      .references(() => schedules.id),
    fileUrl: varchar('file_url', { length: 1024 }).notNull(),
    fileType: varchar('file_type', { length: 100 }).notNull(),
    originalName: varchar('original_name', { length: 255 }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [index('idx_schedule_attachments_schedule_id').on(t.scheduleId)],
);

export const SchedulesSelectSchema = createSelectSchema(schedules);
export const SchedulesAttachmentsSelectSchema =
  createSelectSchema(scheduleAttachments);

export type Schedules = z.infer<typeof SchedulesSelectSchema>;
export type SchedulesAttachments = z.infer<
  typeof SchedulesAttachmentsSelectSchema
>;

export type SimplifiedSchedules = Omit<
  Schedules,
  | 'organizationId'
  | 'psychologistId'
  | 'createdBy'
  | 'updatedBy'
  | 'createdAt'
  | 'updatedAt'
  | 'notificationOffset'
  | 'zoomJoinUrl'
  | 'zoomStartUrl'
  | 'description'
> & {
  originalTimezone: string;
  displayStartDateTime?: string;
  displayEndDateTime?: string;
};
