import { pgTable, varchar, timestamp, uuid } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-zod';
import { z } from 'zod';

export const testimonials = pgTable('testimonials', {
    id: uuid('id').primaryKey().defaultRandom(),
    author: varchar('author', { length: 255 }).notNull(),
    quote: varchar('quote', { length: 300 }).notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const TestimonialSelectSchema = createSelectSchema(testimonials);

export const TestimonialInsertSchema = createInsertSchema(testimonials, {
    author: (schema) => schema
        .min(1, { message: 'Author is required' })
        .max(255, { message: 'Author must be less than 255 characters' }),
    quote: (schema) => schema
        .min(1, { message: 'Quote is required' })
        .max(300, { message: 'Quote must be less than 500 characters' }),
});

export const TestimonialUpdateSchema = createUpdateSchema(testimonials, {
    author: (schema) => schema
        .min(1, { message: 'Author is required' })
        .max(255, { message: 'Author must be less than 255 characters' })
        .optional(),
    quote: (schema) => schema
        .min(1, { message: 'Quote is required' })
        .max(300, { message: 'Quote must be less than 500 characters' })
        .optional(),
});

export type Testimonial = z.infer<typeof TestimonialSelectSchema>;
export type CreateTestimonial = z.infer<typeof TestimonialInsertSchema>;
export type UpdateTestimonial = z.infer<typeof TestimonialUpdateSchema>;