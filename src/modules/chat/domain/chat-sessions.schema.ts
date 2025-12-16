import {
  pgTable,
  uuid,
  timestamp,
  varchar,
  boolean,
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
import { counselings } from '@/modules/mental-health/domain/counselings/counselings.schema';

export const chatSessions = pgTable(
  'chat_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    clientId: uuid('client_id')
      .references(() => users.id)
      .notNull(),
    psychologistId: uuid('psychologist_id')
      .references(() => users.id)
      .notNull(),
    counselingId: uuid('counseling_id').references(() => counselings.id),
    status: varchar('status', { length: 50 }).notNull().default('pending'),
    isActive: boolean('is_active').notNull().default(false),
    startedAt: timestamp('started_at'),
    endedAt: timestamp('ended_at'),
    scheduledAt: timestamp('scheduled_at', {
      mode: 'date',
      withTimezone: false,
    })
      .notNull()
      .defaultNow(),
    encryptionType: varchar('encryption_type', { length: 20 })
      .notNull()
      .default('plaintext'), // 'plaintext' or 'e2e'
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    index('idx_chat_sessions_client_id').on(table.clientId),
    index('idx_chat_sessions_psychologist_id').on(table.psychologistId),
    index('idx_chat_sessions_counseling_id').on(table.counselingId),
    index('idx_chat_sessions_status').on(table.status),
    index('idx_chat_sessions_is_active').on(table.isActive),
    index('idx_chat_sessions_scheduled_at').on(table.scheduledAt),
    index('idx_chat_sessions_encryption_type').on(table.encryptionType),
  ],
);

export const chatMessages = pgTable(
  'chat_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id')
      .references(() => chatSessions.id)
      .notNull(),
    senderId: uuid('sender_id')
      .references(() => users.id)
      .notNull(),
    message: varchar('message', {
      length: 4096,
    }).notNull(),
    messageType: varchar('message_type', { length: 50 })
      .notNull()
      .default('text'), // text, image, file, automated, system
    isAutomated: boolean('is_automated').notNull().default(false),
    isRead: boolean('is_read').notNull().default(false),
    attachmentUrl: varchar('attachment_url', { length: 500 }),
    attachmentType: varchar('attachment_type', { length: 100 }),
    attachmentName: varchar('attachment_name', { length: 255 }),
    attachmentSize: integer('attachment_size'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    index('idx_chat_messages_session_id').on(table.sessionId),
    index('idx_chat_messages_sender_id').on(table.senderId),
    index('idx_chat_messages_created_at').on(table.createdAt),
  ],
);

export const chatUserPresence = pgTable(
  'chat_user_presence',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id')
      .references(() => chatSessions.id)
      .notNull(),
    userId: uuid('user_id')
      .references(() => users.id)
      .notNull(),
    status: varchar('status', { length: 10 }).notNull().default('present'), // 'present' or 'away'
    lastSeen: timestamp('last_seen').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    index('idx_chat_user_presence_session_id').on(table.sessionId),
    index('idx_chat_user_presence_user_id').on(table.userId),
    index('idx_chat_user_presence_session_user').on(
      table.sessionId,
      table.userId,
    ),
    index('idx_chat_user_presence_status').on(table.status),
  ],
);

export const chatSessionSelectSchema = createSelectSchema(chatSessions);
export const chatSessionInsertSchema = createInsertSchema(chatSessions);
export const chatSessionUpdateSchema = createUpdateSchema(chatSessions);

export const chatMessageSelectSchema = createSelectSchema(chatMessages);
export const chatMessageInsertSchema = createInsertSchema(chatMessages);

export const chatUserPresenceSelectSchema =
  createSelectSchema(chatUserPresence);
export const chatUserPresenceInsertSchema =
  createInsertSchema(chatUserPresence);
export const chatUserPresenceUpdateSchema =
  createUpdateSchema(chatUserPresence);

export type ChatSession = z.infer<typeof chatSessionSelectSchema>;
export type CreateChatSession = z.infer<typeof chatSessionInsertSchema>;
export type UpdateChatSession = z.infer<typeof chatSessionUpdateSchema>;

export type ChatMessage = z.infer<typeof chatMessageSelectSchema>;
export type CreateChatMessage = z.infer<typeof chatMessageInsertSchema>;

export type ChatUserPresence = z.infer<typeof chatUserPresenceSelectSchema>;
export type CreateChatUserPresence = z.infer<
  typeof chatUserPresenceInsertSchema
>;
export type UpdateChatUserPresence = z.infer<
  typeof chatUserPresenceUpdateSchema
>;
