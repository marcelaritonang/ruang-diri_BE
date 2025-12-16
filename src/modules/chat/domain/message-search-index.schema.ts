import {
  pgTable,
  uuid,
  timestamp,
  varchar,
  integer,
  index,
} from 'drizzle-orm/pg-core';
import {
  createSelectSchema,
  createInsertSchema,
  createUpdateSchema,
} from 'drizzle-zod';
import { z } from 'zod';

import { users } from '@/modules/users/domain/users.schema';
import { chatSessions, chatMessages } from './chat-sessions.schema';

export const messageSearchIndex = pgTable(
  'message_search_index',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    messageId: uuid('message_id')
      .references(() => chatMessages.id, { onDelete: 'cascade' })
      .notNull(),
    sessionId: uuid('session_id')
      .references(() => chatSessions.id, { onDelete: 'cascade' })
      .notNull(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    tokenHash: varchar('token_hash', { length: 128 }).notNull(), // HMAC-SHA256 hex output (64 chars) + padding
    keyVersion: integer('key_version').notNull().default(1), // For key rotation support
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    index('idx_search_user_token_key').on(
      table.userId,
      table.tokenHash,
      table.keyVersion,
    ),

    index('idx_search_session_user').on(table.sessionId, table.userId),
    index('idx_search_message_id').on(table.messageId),
    index('idx_search_user_key_version').on(table.userId, table.keyVersion),

    index('idx_search_created_at').on(table.createdAt),

    index('idx_search_session_token_key').on(
      table.sessionId,
      table.tokenHash,
      table.keyVersion,
    ),
  ],
);

export const messageSearchIndexSelectSchema =
  createSelectSchema(messageSearchIndex);
export const messageSearchIndexInsertSchema =
  createInsertSchema(messageSearchIndex);
export const messageSearchIndexUpdateSchema =
  createUpdateSchema(messageSearchIndex);

export type MessageSearchIndex = z.infer<typeof messageSearchIndexSelectSchema>;
export type CreateMessageSearchIndex = z.infer<
  typeof messageSearchIndexInsertSchema
>;
export type UpdateMessageSearchIndex = z.infer<
  typeof messageSearchIndexUpdateSchema
>;
