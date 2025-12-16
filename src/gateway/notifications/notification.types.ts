export type NotificationEvent =
  | 'created'
  | 'updated'
  | 'read'
  | 'deleted'
  | 'initial-message'
  | 'enable-chat';

export interface BaseNotificationPayload {
  event: NotificationEvent;
  data: unknown;
}

export interface NotificationCreatedPayload<T> extends BaseNotificationPayload {
  event: 'created';
  data: {
    title: string;
    message: string | null;
    recipientId: string;
    unreadCount?: number;
  } & T;
}

export interface NotificationUpdatedPayload<T> extends BaseNotificationPayload {
  event: 'updated';
  data: {
    id: string;
    title: string;
    message: string | null;
    status: string;
    recipientId: string;
  } & T;
}

export interface NotificationReadPayload<T> extends BaseNotificationPayload {
  event: 'read';
  data: {
    notificationIds: string[];
    updatedCount: number;
    unreadCount?: number;
    userId: string;
  } & T;
}

export interface NotificationDeletePayload<T> extends BaseNotificationPayload {
  event: 'deleted';
  data: {
    id: string;
    recipientId: string;
    title: string;
    message: string | null;
    unreadCount?: number;
  } & T;
}

export interface ChatNotificationPayload extends BaseNotificationPayload {
  event: 'initial-message' | 'enable-chat';
  data: {
    count: number;
    sessionId: string;
  };
}

export type NotificationPayload<T> =
  | NotificationCreatedPayload<T>
  | NotificationUpdatedPayload<T>
  | NotificationReadPayload<T>
  | NotificationDeletePayload<T>;

export type ChatNotificationPayloadType = ChatNotificationPayload;
