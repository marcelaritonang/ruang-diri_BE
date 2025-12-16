import {
  pgTable,
  uuid,
  timestamp,
  varchar,
  index,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

import { users } from '@/common/database/database-schema';

import {
  notificationTypes,
  notificationStatuses,
  notificationSubTypes,
} from './notification.enum';

export const notificationTypeEnum = pgEnum(
  'notification_type',
  notificationTypes,
);
export const notificationStatusEnum = pgEnum(
  'notification_status',
  notificationStatuses,
);

export const notificationSubTypeEnum = pgEnum(
  'notification_sub_type',
  notificationSubTypes,
);

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    recipientId: uuid('recipient_id')
      .notNull()
      .references(() => users.id),
    type: notificationTypeEnum('type').notNull(),
    subType: notificationSubTypeEnum('sub_type').default('general'),
    title: varchar('title', { length: 255 }).notNull(),
    message: varchar('message', { length: 1000 }),
    status: notificationStatusEnum('status').notNull().default('pending'),
    readAt: timestamp('read_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    index('idx_notifications_recipient_id').on(table.recipientId),
    index('idx_notifications_type').on(table.type),
    index('idx_notifications_status').on(table.status),
    index('idx_notifications_sub_type').on(table.subType),
    index('idx_notifications_created_at').on(table.createdAt),
    index('idx_notifications_read_at').on(table.readAt),
    index('idx_notifications_type_sub_type').on(table.type, table.subType),
    index('idx_notifications_status_sub_type').on(table.status, table.subType),
    index('idx_notifications_recipient_type').on(table.recipientId, table.type),
  ],
);

export const NotificationsSelectSchema = createSelectSchema(notifications);

export type Notifications = z.infer<typeof NotificationsSelectSchema>;
export type NotificationType =
  | 'schedule_created'
  | 'schedule_updated'
  | 'schedule_deleted'
  | 'schedule_reminder'
  | 'system_announcement';
export type NotificationStatus = 'pending' | 'sent' | 'failed' | 'read';
