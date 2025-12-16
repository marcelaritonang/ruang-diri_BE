import {
  eq,
  and,
  between,
  desc,
  inArray,
  count,
  SQL,
  isNull,
} from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

import { Injectable, NotFoundException } from '@nestjs/common';

import { DrizzleService } from '@common/drizzle/drizzle.service';

import { IUserRequest } from '@/modules/auth/strategies/jwt.strategy';

import {
  notifications,
  type Notifications,
} from '../domain/notifications.schema';

import { CreateNotificationDto } from '../domain/dto/create-notification.dto';
import { NotificationQueryDto } from '../domain/dto/notification-response.dto';

@Injectable()
export class NotificationsRepository {
  constructor(private drizzle: DrizzleService) {}

  private get db() {
    return this.drizzle.db;
  }

  async createNotification(
    dto: CreateNotificationDto,
  ): Promise<{ id: string; recipientId: string }[]> {
    const rows = dto.recipientIds.map((recipientId) => ({
      id: uuidv4(),
      recipientId,
      title: dto.title,
      message: dto.message,
      type: dto.type!,
      subType: dto.subType!,
    }));

    await this.db.insert(notifications).values(rows);

    return rows.map((row) => ({ id: row.id, recipientId: row.recipientId }));
  }

  async getNotifications(
    query: NotificationQueryDto,
    user: IUserRequest['user'],
  ): Promise<{ notifications: Notifications[]; total: number }> {
    const { page = 1, limit = 10, type, status, from, to, subType } = query;

    const offset = (page - 1) * limit;

    const conditions: SQL<unknown>[] = [];

    if (type) {
      conditions.push(eq(notifications.type, type));
    }

    if (subType) {
      conditions.push(eq(notifications.subType, subType));
    }

    if (status) {
      conditions.push(eq(notifications.status, status));
    }

    if (from && to) {
      const fromDate = new Date(from);
      const toDate = new Date(to);
      conditions.push(between(notifications.createdAt, fromDate, toDate));
    }

    if (user.role !== 'super_admin') {
      conditions.push(eq(notifications.recipientId, user.id));
    }

    const [notificationsList, totalResult] = await Promise.all([
      this.db
        .select()
        .from(notifications)
        .where(and(...conditions))
        .orderBy(desc(notifications.createdAt))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ count: count() })
        .from(notifications)
        .where(and(...conditions)),
    ]);

    return {
      notifications: notificationsList,
      total: totalResult[0]?.count || 0,
    };
  }

  async deleteNotification(id: string): Promise<void> {
    await this.db.transaction(async (tx) => {
      const currentNotification = await tx
        .select()
        .from(notifications)
        .where(eq(notifications.id, id))
        .limit(1);

      if (currentNotification.length === 0) {
        throw new NotFoundException(`Notification with ID ${id} not found`);
      }

      // await tx
      //   .update(notifications)
      //   .set({
      //     deletedAt: new Date(),
      //   })
      //   .where(eq(notifications.id, id));
    });
  }

  async getNotificationById(id: string): Promise<Notifications | null> {
    const notification = await this.db
      .select()
      .from(notifications)
      .where(eq(notifications.id, id))
      .limit(1);

    return notification[0] || null;
  }

  async markAsRead(
    notificationIds: string[],
    user: IUserRequest['user'],
  ): Promise<{ updated: number }> {
    const conditions = [inArray(notifications.id, notificationIds)];

    // Non-admin users can only mark their own notifications as read
    if (user.role !== 'organization' && user.role !== 'super_admin') {
      conditions.push(eq(notifications.recipientId, user.id));
    }

    const result = await this.db
      .update(notifications)
      .set({
        readAt: new Date(),
        status: 'read',
      })
      .where(and(...conditions))
      .returning({ id: notifications.id });

    return { updated: result.length };
  }

  async getUnreadCount(
    user: IUserRequest['user'],
  ): Promise<{ generalCount: number; counselingCount: number }> {
    const conditions: SQL<unknown>[] = [
      isNull(notifications.readAt),
      eq(notifications.status, 'pending'),
    ];

    if (user.role !== 'super_admin') {
      conditions.push(eq(notifications.recipientId, user.id));
    }

    const [systemResult, scheduleResult] = await Promise.all([
      this.db
        .select({ count: count() })
        .from(notifications)
        .where(and(...conditions, eq(notifications.type, 'system'))),
      this.db
        .select({ count: count() })
        .from(notifications)
        .where(and(...conditions, eq(notifications.type, 'schedule'))),
    ]);

    return {
      generalCount: systemResult[0]?.count || 0,
      counselingCount: scheduleResult[0]?.count || 0,
    };
  }

  async markAllAsRead(
    user: IUserRequest['user'],
  ): Promise<{ updated: number }> {
    const conditions = [
      eq(notifications.recipientId, user.id),
      isNull(notifications.readAt),
    ];

    const rows = await this.db
      .update(notifications)
      .set({ readAt: new Date(), status: 'read' })
      .where(and(...conditions))
      .returning({ id: notifications.id });

    return { updated: rows.length };
  }
}
