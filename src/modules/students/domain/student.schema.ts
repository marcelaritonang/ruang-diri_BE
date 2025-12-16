import {
  pgTable,
  varchar,
  pgEnum,
  uuid,
  integer,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from 'drizzle-zod';
import { z } from 'zod';

import { users } from '@/modules/users/domain/users.schema';
import { sql } from 'drizzle-orm';

export const genderTypeEnum = pgEnum('gender_type', ['female', 'male']);
export const screeningTypeEnum = pgEnum('screening_type', [
  'stable',
  'at_risk',
  'monitored',
  'not_screened',
]);

export const iqCategoryEnum = pgEnum('iq_category', [
  'very_below_average',
  'below_average',
  'average',
  'above_average',
  'very_above_average',
]);

export const studentProfiles = pgTable(
  'student_profiles',
  {
    userId: uuid('user_id')
      .references(() => users.id)
      .primaryKey(),
    grade: varchar('grade', { length: 50 }),
    classroom: varchar('classroom', { length: 50 }),
    gender: genderTypeEnum().notNull(),
    nis: varchar('nis', { length: 50 }),
    iqScore: integer('iq_score').default(0),
    guardianName: varchar('guardian_name', { length: 50 }),
    guardianContact: varchar('guardian_contact', { length: 50 }),
    birthDate: timestamp('birth_date'),
    birthPlace: varchar('birth_place', { length: 50 }),
    iqCategory: iqCategoryEnum(),
  },
  (table) => [
    index('idx_student_classroom').on(table.classroom),
    index('idx_student_gender').on(table.gender),
    index('idx_student_nis').on(table.nis),
    index('idx_student_grade').on(table.grade),
    index('idx_student_iqScore').on(table.iqScore),
    sql`CREATE INDEX idx_student_screening_year ON student_profiles ((EXTRACT(YEAR FROM screening_date)))`,
    sql`CREATE INDEX idx_student_counseling_year ON student_profiles ((EXTRACT(YEAR FROM counseling_date)))`,
  ],
);

export const StudentProfileSelectSchema = createSelectSchema(studentProfiles);
export const StudentProfileInsertSchema = createInsertSchema(studentProfiles);
export const StudentProfileUpdateSchema = createUpdateSchema(studentProfiles);

export type StudentProfile = z.infer<typeof StudentProfileSelectSchema>;
export type CreateStudentProfile = z.infer<typeof StudentProfileInsertSchema>;
export type UpdateStudentProfile = z.infer<typeof StudentProfileUpdateSchema>;
