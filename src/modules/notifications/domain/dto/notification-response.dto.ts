import { z } from 'zod';

import { notificationTypes, notificationSubTypes } from '../notification.enum';

export const notificationParam = z.object({
  id: z.string().uuid('Invalid notification ID format'),
});

export const markAsReadDto = z.object({
  notificationIds: z
    .array(z.string().uuid())
    .min(1, 'At least one notification ID is required'),
});

export const getNotificationsQuery = z.object({
  page: z.coerce.number().optional().default(1),
  limit: z.coerce.number().optional().default(10),
  type: z.enum(notificationTypes).optional(),
  subType: z.enum(notificationSubTypes).optional(),
  status: z.enum(['pending', 'sent', 'failed', 'read']).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

export type NotificationParamDto = z.infer<typeof notificationParam>;
export type NotificationQueryDto = z.infer<typeof getNotificationsQuery>;
export type MarkAsReadDto = z.infer<typeof markAsReadDto>;
