import {
  pgTable,
  uuid,
  timestamp,
  index,
  integer,
  text,
  jsonb,
} from 'drizzle-orm/pg-core';
import { createSelectSchema, createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

import { screeningTypeEnum } from '@/common/database/database-enums';
import { users } from '@/common/database/database-schema';

export const screenings = pgTable(
  'screenings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .references(() => users.id)
      .notNull(),
    date: timestamp('date').notNull().defaultNow(),
    screeningStatus: screeningTypeEnum('screening_status').notNull(),
    depressionScore: integer('depression_score'),
    anxietyScore: integer('anxiety_score'),
    stressScore: integer('stress_score'),
    depressionCategory: text('depression_category'),
    anxietyCategory: text('anxiety_category'),
    stressCategory: text('stress_category'),
    overallRisk: text('overall_risk'),
    answers: jsonb('answers').$type<number[]>(),
    notes: text('notes'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    index('idx_screenings_user_id').on(table.userId),
    index('idx_screenings_date').on(table.date),
    index('idx_screenings_status').on(table.screeningStatus),
    index('idx_screenings_overall_risk').on(table.overallRisk),
    index('idx_screenings_created_at').on(table.createdAt),
  ],
);

export const screeningsSelectSchema = createSelectSchema(screenings);
export const screeningsInsertSchema = createInsertSchema(screenings);

export type Screenings = z.infer<typeof screeningsSelectSchema>;
export type CreateScreenings = z.infer<typeof screeningsInsertSchema>;

export interface DassAssessmentResult {
  depressionScore: number;
  anxietyScore: number;
  stressScore: number;
  depressionCategory: string;
  anxietyCategory: string;
  stressCategory: string;
  overallRisk: string;
}
