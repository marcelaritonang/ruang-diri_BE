import { relations } from 'drizzle-orm';

import { counselings, screenings, users } from '../database-schema';

export const usersMhRelations = relations(users, ({ many }) => ({
  screenings: many(screenings),
  counselings: many(counselings),
}));

export const screeningsRelations = relations(screenings, ({ one }) => ({
  user: one(users, {
    fields: [screenings.userId],
    references: [users.id],
  }),
}));

export const counselingsRelations = relations(counselings, ({ one }) => ({
  user: one(users, {
    fields: [counselings.userId],
    references: [users.id],
  }),
}));
