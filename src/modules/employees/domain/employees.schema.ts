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

export const employeeGenderEnum = pgEnum('gender_type', ['male', 'female']);

export const employeeScreeningEnum = pgEnum('employee_screening_type', [
  'stable',
  'at_risk',
  'monitored',
  'not_screened',
]);

export const employeeProfiles = pgTable(
  'employee_profiles',
  {
    userId: uuid('user_id')
      .references(() => users.id)
      .primaryKey(),
    employeeId: varchar('employee_id', { length: 50 }).unique(),
    department: varchar('department', { length: 100 }),
    position: varchar('position', { length: 100 }),
    gender: employeeGenderEnum().notNull(),
    age: integer('age'),
    yearsOfService: integer('years_of_service'),
    guardianName: varchar('guardian_name', { length: 50 }),
    guardianContact: varchar('guardian_contact', { length: 50 }),
    birthDate: timestamp('birth_date'),
    birthPlace: varchar('birth_place', { length: 50 }),
  },
  (table) => [
    index('idx_employee_department').on(table.department),
    index('idx_employee_position').on(table.position),
    index('idx_employee_gender').on(table.gender),
    index('idx_employee_age').on(table.age),
    index('idx_employee_years_of_service').on(table.yearsOfService),
    sql`CREATE INDEX idx_student_screening_year ON student_profiles ((EXTRACT(YEAR FROM screening_date)))`,
    sql`CREATE INDEX idx_student_counseling_year ON student_profiles ((EXTRACT(YEAR FROM counseling_date)))`,
  ],
);

export const EmployeeProfileSelectSchema = createSelectSchema(employeeProfiles);
export const EmployeeProfileInsertSchema = createInsertSchema(employeeProfiles);
export const EmployeeProfileUpdateSchema = createUpdateSchema(employeeProfiles);

export const employeeGenderEnumSchema = z.enum(['male', 'female']);

export const employeeScreeningEnumSchema = z.enum([
  'stable',
  'at_risk',
  'monitored',
  'not_screened',
]);

export const GetEmployeeQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().default(''),
  department: z.string().default(''),
  position: z.string().default(''),
  gender: z.enum(['male', 'female', '']).default(''),
  screeningStatus: z
    .enum(['stable', 'at_risk', 'monitored', 'not_screened', ''])
    .default(''),
  counselingStatus: z.enum(['1', '0', '']).default(''),
  sortBy: z.enum(['name', 'age', 'yearsOfService', '']).default(''),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
});

export type EmployeeProfile = z.infer<typeof EmployeeProfileSelectSchema>;
export type EmployeeGenderType = z.infer<typeof employeeGenderEnumSchema>;
export type EmployeeScreeningType = z.infer<typeof employeeScreeningEnumSchema>;

export type GetEmployeeQuery = z.infer<typeof GetEmployeeQuerySchema>;
