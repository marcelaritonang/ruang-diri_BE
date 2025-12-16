import { pgTable, varchar, timestamp, uuid } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-zod';
import { z } from 'zod';

export const partners = pgTable('partners', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    logo: varchar('logo', { length: 255 }).notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const PartnersSelectSchema = createSelectSchema(partners);

export const PartnersInsertSchema = createInsertSchema(partners, {
    name: (schema) => schema
        .min(1, { message: 'Name is required' })
        .max(255, { message: 'Name must be less than 255 characters' }),
    logo: (schema) => schema
        .min(1, { message: 'Logo is required' })
});

export const PartnersUpdateSchema = createUpdateSchema(partners, {
    name: (schema) => schema
        .min(1, { message: 'Name is required' })
        .max(255, { message: 'Name must be less than 255 characters' })
        .optional(),
    logo: (schema) => schema
        .min(1, { message: 'Logo is required' })
        .optional()
});

export type Partners = z.infer<typeof PartnersSelectSchema>;
export type CreatePartners = z.infer<typeof PartnersInsertSchema>;
export type UpdatePartners = z.infer<typeof PartnersUpdateSchema>;