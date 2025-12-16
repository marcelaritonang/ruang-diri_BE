import type { ArrayIdxType } from '@common/types/array.type';

export const notificationTypes = ['schedule', 'system', 'report'] as const;
export const notificationSubTypes = ['counseling', 'general'] as const;
export const notificationStatuses = [
  'pending',
  'sent',
  'failed',
  'read',
] as const;

export type NotificationType = ArrayIdxType<typeof notificationTypes>;
export type NotificationStatus = ArrayIdxType<typeof notificationStatuses>;
export type NotificationSubType = ArrayIdxType<typeof notificationSubTypes>;
