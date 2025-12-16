import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

import { SuccessResponse } from '@/common/utils/response.util';

import { IUserRequest } from '@/modules/auth/strategies/jwt.strategy';

import { NotificationGateway } from '@/gateway/notifications/notification.gateway';

import { NotificationsRepository } from '../infrastructure/notifications.repository';

import { CreateNotificationDto } from '../domain/dto/create-notification.dto';
import {
  NotificationParamDto,
  NotificationQueryDto,
  MarkAsReadDto,
} from '../domain/dto/notification-response.dto';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly notificationsRepository: NotificationsRepository,
    private readonly notificationGateway: NotificationGateway,
  ) {}

  private getCustomTitleAndMessage({
    recipientId,
    currentUser,
    defaultTitle,
    defaultMessage,
    additional,
  }: {
    recipientId: string;
    currentUser?: IUserRequest['user'];
    defaultTitle: string;
    defaultMessage?: string;
    additional?: CreateNotificationDto['additional'];
  }): { title: string; message?: string } {
    if (!additional || recipientId === currentUser?.id) {
      return { title: defaultTitle, message: defaultMessage };
    }

    if (currentUser?.organizationId) {
      return {
        title: additional.orgTitle || defaultTitle,
        message: additional.orgMessage || defaultMessage,
      };
    }

    return {
      title: additional.psychologistTitle || defaultTitle,
      message: additional.psychologistMessage || defaultMessage,
    };
  }

  async createNotification(
    dto: CreateNotificationDto,
    currentUser?: IUserRequest['user'],
    data?: Record<string, unknown>,
  ) {
    this.logger.log(`Creating notification with title: ${dto.title}`);

    try {
      const { additional, ...restDto } = dto;
      let totalNotifCount = 0;

      if (currentUser) {
        const unreadCount =
          await this.notificationsRepository.getUnreadCount(currentUser);
        totalNotifCount =
          unreadCount.generalCount + unreadCount.counselingCount;
      }

      for (const recipientId of dto.recipientIds) {
        if (!recipientId) {
          throw new BadRequestException('Recipient ID cannot be empty');
        }

        const { title, message } = this.getCustomTitleAndMessage({
          recipientId,
          currentUser,
          defaultTitle: dto.title,
          defaultMessage: dto.message,
          additional,
        });

        const [newNotification] =
          await this.notificationsRepository.createNotification({
            ...restDto,
            recipientIds: [recipientId],
            title,
            message,
          });

        if (newNotification) totalNotifCount++;

        if (currentUser?.organizationId) {
          this.notificationGateway.sendNotificationToOrg(
            currentUser.organizationId,
            {
              event: 'created',
              data: {
                recipientId,
                title,
                message: message ?? '',
                unreadCount: totalNotifCount,
                ...data,
              },
            },
          );
        }

        this.notificationGateway.sendNotificationToUser(recipientId, {
          event: 'created',
          data: {
            recipientId,
            title,
            message: message ?? '',
            unreadCount: totalNotifCount,
          },
        });
      }

      this.logger.log(
        `Notification created for recipients: ${dto.recipientIds.join(', ')}`,
      );

      return SuccessResponse.create(
        { totalNotifCount },
        'Notification created successfully',
      );
    } catch (error) {
      this.logger.error('Error creating notifications', error);

      if (error instanceof BadRequestException && error.message) {
        throw new BadRequestException(error.message);
      }

      throw new BadRequestException(
        'An unexpected error occurred while creating notifications',
      );
    }
  }

  async getNotifications(
    query: NotificationQueryDto,
    user: IUserRequest['user'],
  ) {
    this.logger.log(
      `Fetching notifications with filters: ${JSON.stringify(query)}`,
    );

    try {
      const notificationsResult =
        await this.notificationsRepository.getNotifications(query, user);

      return SuccessResponse.create(
        notificationsResult,
        'Notifications fetched successfully',
      );
    } catch (error) {
      this.logger.error('Error fetching notifications', error);

      if (error instanceof NotFoundException) {
        throw new NotFoundException('No notifications found');
      } else {
        throw new BadRequestException(
          'An unexpected error occurred while fetching notifications',
        );
      }
    }
  }

  async deleteNotification(id: NotificationParamDto['id']) {
    this.logger.log(`Deleting notification with ID: ${id}`);

    try {
      await this.notificationsRepository.deleteNotification(id);

      return SuccessResponse.create(null, 'Notification deleted successfully');
    } catch (error) {
      this.logger.error('Error deleting notification', error);

      if (error instanceof NotFoundException) {
        throw error;
      } else {
        throw new BadRequestException(
          'An unexpected error occurred while deleting the notification',
        );
      }
    }
  }

  async getNotificationById(id: NotificationParamDto['id']) {
    this.logger.log(`Fetching notification with ID: ${id}`);

    try {
      const notification =
        await this.notificationsRepository.getNotificationById(id);

      if (!notification) {
        throw new NotFoundException(`Notification with ID ${id} not found`);
      }

      return SuccessResponse.create(
        notification,
        'Notification fetched successfully',
      );
    } catch (error) {
      this.logger.error('Error fetching notification by ID', error);

      if (error instanceof NotFoundException) {
        throw error;
      } else {
        throw new BadRequestException(
          'An unexpected error occurred while fetching the notification',
        );
      }
    }
  }

  async markAsRead(dto: MarkAsReadDto, user: IUserRequest['user']) {
    this.logger.log(
      `Marking ${dto.notificationIds.length} notifications as read`,
    );

    try {
      const [readRes, countRes] = await Promise.all([
        this.notificationsRepository.markAsRead(dto.notificationIds, user),
        this.notificationsRepository.getUnreadCount(user),
      ]);

      this.notificationGateway.sendNotificationToUser(user.id, {
        event: 'read',
        data: {
          updatedCount: readRes.updated,
          userId: user.id,
          notificationIds: dto.notificationIds,
          unreadCount: countRes.generalCount + countRes.counselingCount || 0,
        },
      });
      return SuccessResponse.create(
        readRes,
        `${readRes.updated} notification(s) marked as read`,
      );
    } catch (error) {
      this.logger.error('Error marking notifications as read', error);
      throw new BadRequestException(
        'An unexpected error occurred while marking notifications as read',
      );
    }
  }

  async getUnreadCount(user: IUserRequest['user']) {
    this.logger.log(`Fetching unread count for user: ${user.id}`);

    try {
      const result = await this.notificationsRepository.getUnreadCount(user);

      return SuccessResponse.create(
        result,
        'Unread count fetched successfully',
      );
    } catch (error) {
      this.logger.error('Error fetching unread count', error);
      throw new BadRequestException(
        'An unexpected error occurred while fetching unread count',
      );
    }
  }

  async markAllAsRead(user: IUserRequest['user']) {
    this.logger.log(`Reading all notifications for user: ${user.id}`);

    try {
      const [result, unreadCount] = await Promise.all([
        this.notificationsRepository.markAllAsRead(user),
        this.notificationsRepository.getUnreadCount(user),
      ]);

      this.notificationGateway.sendNotificationToUser(user.id, {
        event: 'read',
        data: {
          updatedCount: result.updated,
          userId: user.id,
          notificationIds: [],
          unreadCount:
            unreadCount.generalCount + unreadCount.counselingCount || 0,
        },
      });

      return SuccessResponse.create(
        result,
        `${result.updated} notification(s) marked as read`,
      );
    } catch (error) {
      this.logger.error('Error reading all notifications', error);
      throw new BadRequestException(
        'An unexpected error occurred while reading all notifications',
      );
    }
  }
}
