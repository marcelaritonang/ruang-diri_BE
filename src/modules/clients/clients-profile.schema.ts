import { pgTable, varchar, uuid, timestamp } from 'drizzle-orm/pg-core';
import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from 'drizzle-zod';
import { z } from 'zod';

import { users } from '@/modules/users/domain/users.schema';

export const clientProfiles = pgTable('client_profiles', {
  userId: uuid('user_id')
    .references(() => users.id)
    .primaryKey(),
  address: varchar('address', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  emergencyContact: varchar('emergency_contact', { length: 255 }),
  emergencyPhone: varchar('emergency_phone', { length: 50 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const ClientSelectSchema = createSelectSchema(clientProfiles);
export const ClientInsertSchema = createInsertSchema(clientProfiles);
export const ClientUpdateSchema = createUpdateSchema(clientProfiles);

export type ClientProfile = z.infer<typeof ClientSelectSchema>;
export type CreateClientProfile = z.infer<typeof ClientInsertSchema>;
export type UpdateClientProfile = z.infer<typeof ClientUpdateSchema>;
