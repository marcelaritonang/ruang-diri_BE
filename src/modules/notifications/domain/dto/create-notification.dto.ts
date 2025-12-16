import { z } from 'zod';

import { notificationTypes, notificationSubTypes } from '../notification.enum';

export const createNotificationDto = z.object({
  recipientIds: z
    .array(z.string().uuid())
    .min(1, 'At least one recipient is required'),
  title: z.string().min(1, 'Title is required').max(255, 'Title is too long'),
  message: z
    .string()
    .min(1, 'Message is required')
    .max(1000, 'Message is too long')
    .optional(),
  type: z
    .enum(notificationTypes, {
      errorMap: () => ({ message: 'Invalid notification type' }),
    })
    .default('system')
    .optional(),
  subType: z
    .enum(notificationSubTypes, {
      errorMap: () => ({ message: 'Invalid notification sub-type' }),
    })
    .default('general')
    .optional(),
  additional: z
    .object({
      orgTitle: z.string().optional(),
      orgMessage: z.string().optional(),
      psychologistTitle: z.string().optional(),
      psychologistMessage: z.string().optional(),
    })
    .optional(),
});

export type CreateNotificationDto = z.infer<typeof createNotificationDto>;
