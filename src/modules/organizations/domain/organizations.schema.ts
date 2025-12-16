import {
  pgTable,
  pgEnum,
  uuid,
  integer,
  index,
  check,
} from 'drizzle-orm/pg-core';
import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from 'drizzle-zod';
import { sql } from 'drizzle-orm';
import { z } from 'zod';

export const organizationTypeEnum = pgEnum('organization_type', [
  'school',
  'company',
]);

export const organizations = pgTable(
  'organizations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    type: organizationTypeEnum().notNull(),
    totalQuota: integer('total_quota'),
    remainingQuota: integer('remaining_quota'),
  },
  (table) => [
    index('idx_organization_type').on(table.type),
    index('idx_organization_remaining_quota').on(table.remainingQuota),
    index('idx_organization_total_quota').on(table.totalQuota),
    check(
      'remaining_quota_must_be_non_negative',
      sql`${organizations.remainingQuota} >= 0`,
    ),
    check(
      'total_quota_must_be_non_negative',
      sql`${organizations.totalQuota} >= 0`,
    ),
    check(
      'remaining_quota_must_not_exceed_total_quota',
      sql`${organizations.remainingQuota} <= ${organizations.totalQuota}`,
    ),
  ],
);

export const organizationTypeEnumSchema = z.enum(['school', 'company']);

export const updateOrganizationInfo = z
  .object({
    address: z
      .string()
      .max(255, { message: "Address can't be more than 255 characters." })
      .optional(),
    phone: z
      .string()
      .max(25, { message: "Phone number can't be more than 25 characters." })
      .optional(),
    profilePicture: z
      .string()
      .url({ message: 'Profile picture must be a valid URL.' })
      .optional(),
    fullName: z
      .string()
      .max(255, { message: "Full name can't be more than 255 characters." })
      .optional(),
    isOnboarded: z.string().optional(),
    totalQuota: z
      .number()
      .int()
      .nonnegative({ message: 'Total quota must be a non-negative integer.' })
      .optional(),
    remainingQuota: z
      .number()
      .int()
      .nonnegative({
        message: 'Remaining quota must be a non-negative integer.',
      })
      .optional(),
  })
  .refine(
    (data) => {
      if (data.totalQuota !== undefined && data.remainingQuota !== undefined) {
        return data.remainingQuota <= data.totalQuota;
      }
      return true;
    },
    {
      message: 'Remaining quota must not exceed total quota.',
    },
  );

export const OrganizationSelectSchema = createSelectSchema(organizations);
export const OrganizationInsertSchema = createInsertSchema(organizations);
export const OrganizationUpdateSchema = createUpdateSchema(organizations);

export type Organization = z.infer<typeof OrganizationSelectSchema>;
export type OrganizationTypeEnum = z.infer<typeof organizationTypeEnumSchema>;
export type CreateOrganization = z.infer<typeof OrganizationInsertSchema>;
export type UpdateOrganization = z.infer<typeof OrganizationUpdateSchema>;

export type UpdateOrganizationInfo = z.infer<typeof updateOrganizationInfo>;
