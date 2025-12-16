import {
  pgTable,
  varchar,
  timestamp,
  pgEnum,
  boolean,
  uuid,
  index,
} from 'drizzle-orm/pg-core';
import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from 'drizzle-zod';
import { z } from 'zod';

import { organizations } from '@/modules/organizations/domain/organizations.schema';
import type { Organization } from '@/modules/organizations/domain/organizations.schema';
import type { ClientProfile } from '@/modules/clients/clients-profile.schema';
import type { EmployeeProfile } from '@/modules/employees/domain/employees.schema';
import type { PsychologistProfile } from '@/modules/psychologists/psychologist-profile.schema';
import type { StudentProfile } from '@/modules/students/domain/student.schema';
import { checkTimezone } from '@/common/utils/date.util';

export const userRoleEnum = pgEnum('user_role', [
  'super_admin',
  'organization',
  'psychologist',
  'client',
  'student',
  'employee',
]);

export const userRoleEnumSchema = z.enum([
  'super_admin',
  'organization',
  'psychologist',
  'client',
  'student',
  'employee',
]);

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    password: varchar('password', { length: 255 }).notNull(),
    lastPassword: varchar('last_password', { length: 255 }),
    profilePicture: varchar('profile_picture', { length: 255 }),
    fullName: varchar('full_name', { length: 255 }),
    role: userRoleEnum().notNull(),
    organizationId: uuid('organization_id').references(() => organizations.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
    passwordChangedAt: timestamp('password_changed_at'),
    isActive: boolean('is_active').default(true),
    isOnboarded: boolean('is_onboarded').default(false),
    osName: varchar('os_name', { length: 50 }).default('Unknown'),
    deviceType: varchar('device_type', { length: 50 }).default('desktop'),
    address: varchar('address', { length: 255 }),
    phone: varchar('phone', { length: 50 }).unique(),
    timezone: varchar('timezone', { length: 50 }).default('UTC'),
  },
  (table) => [
    index('idx_users_organization_id').on(table.organizationId),
    index('idx_users_role').on(table.role),
    index('idx_users_org_role').on(table.organizationId, table.role),
    index('idx_users_email').on(table.email),
    index('idx_users_full_name').on(table.fullName),
    index('idx_users_id').on(table.id),
    index('idx_users_phone').on(table.phone),
    index('idx_users_address').on(table.address),
    index('idx_users_timezone').on(table.timezone),
  ],
);

export const UserSelectSchema = createSelectSchema(users);
export const UserInsertSchema = createInsertSchema(users);
export const UserUpdateSchema = createUpdateSchema(users);

export const Login = z.object({
  email: z.string().email('Invalid email address').nonempty(),
  password: z.string({ message: 'Password is required' }).nonempty(),
  rememberMe: z.boolean().optional().default(false),
  timezone: z
    .string({
      message: 'Please provide a valid timezone',
    })
    .refine((val) => {
      return checkTimezone(val);
    }),
});

export const ClientRegister = z.object({
  email: z.string().email('Invalid email address').nonempty(),
  password: z
    .string({ message: 'Password is required' })
    .min(8, 'Password must be at least 8 characters'),
  fullName: z.string({ message: 'Full name is required' }).nonempty(),
  timezone: z
    .string({
      message: 'Please provide a valid timezone',
    })
    .refine((val) => {
      return checkTimezone(val);
    }),
});

export type User = z.infer<typeof UserSelectSchema>;
export type CreateUser = z.infer<typeof UserInsertSchema>;
export type UpdateUser = z.infer<typeof UserUpdateSchema>;
export type UserRoleEnum = z.infer<typeof userRoleEnumSchema>;
export type ILogin = z.infer<typeof Login>;
export type IClientRegister = z.infer<typeof ClientRegister>;

export type UserProfile =
  | Organization
  | ClientProfile
  | EmployeeProfile
  | PsychologistProfile
  | StudentProfile;
