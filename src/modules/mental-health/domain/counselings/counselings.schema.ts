import { pgTable, uuid, timestamp, index, varchar } from 'drizzle-orm/pg-core';
import { createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

import { users, psychologistProfiles } from '@/common/database/database-schema';
import { counselingStatusAppointmentEnum } from '@/common/database/database-enums';

export const counselings = pgTable(
  'counselings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .references(() => users.id)
      .notNull(),
    psychologistId: uuid('psychologist_id')
      .references(() => psychologistProfiles.userId)
      .notNull(),
    date: timestamp('date', {
      mode: 'date',
      withTimezone: false,
    }).notNull(),
    endDate: timestamp('end_date', {
      mode: 'date',
      withTimezone: false,
    }).notNull(),
    originalTimezone: varchar('original_timezone', { length: 50 }).notNull(),
    notes: varchar('notes', { length: 255 }),
    status: counselingStatusAppointmentEnum('status').default('scheduled'),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => [
    index('idx_counselings_user_id').on(table.userId),
    index('idx_counselings_date').on(table.date),
    index('idx_counselings_end_date').on(table.endDate),
    index('idx_counselings_psychologist_id').on(table.psychologistId),
    index('idx_counselings_status').on(table.status),
  ],
);

export const counselingsSelectSchema = createSelectSchema(counselings);

export type Counselings = z.infer<typeof counselingsSelectSchema>;
