import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { ZodPipe } from '@/common/pipes/zod-validation.pipe';
import { CurrentUser } from '@/common/decorators/current-user.decorator';

import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { IUserRequest } from '@/modules/auth/strategies/jwt.strategy';
import { Roles } from '@/modules/auth/decorators/roles.decorator';

import {
  notificationParam,
  NotificationQueryDto,
  getNotificationsQuery,
  NotificationParamDto,
  markAsReadDto,
  MarkAsReadDto,
} from '../domain/dto/notification-response.dto';
import { NotificationsService } from '../application/notifications.service';
import { CreateNotificationDto } from '../domain/dto/create-notification.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(
  'organization',
  'super_admin',
  'student',
  'psychologist',
  'employee',
  'client',
)
@Controller({
  path: 'notifications',
  version: '1',
})
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async getNotifications(
    @Query(new ZodPipe(getNotificationsQuery)) query: NotificationQueryDto,
    @CurrentUser() user: IUserRequest['user'],
  ) {
    return this.notificationsService.getNotifications(query, user);
  }

  @Post()
  async createNotification(
    @Body(new ZodPipe(notificationParam)) body: CreateNotificationDto,
    @CurrentUser() user: IUserRequest['user'],
  ) {
    return this.notificationsService.createNotification(body, user);
  }

  @Get('unread-count')
  async getUnreadCount(@CurrentUser() user: IUserRequest['user']) {
    return this.notificationsService.getUnreadCount(user);
  }

  @Post('mark-as-read')
  async markAsRead(
    @Body(new ZodPipe(markAsReadDto)) body: MarkAsReadDto,
    @CurrentUser() user: IUserRequest['user'],
  ) {
    return this.notificationsService.markAsRead(body, user);
  }

  @Post('mark-all-as-read')
  async markAllAsRead(@CurrentUser() user: IUserRequest['user']) {
    return this.notificationsService.markAllAsRead(user);
  }

  @Delete(':id')
  async deleteNotification(
    @Param(new ZodPipe(notificationParam)) params: NotificationParamDto,
  ) {
    return this.notificationsService.deleteNotification(params.id);
  }

  @Get(':id')
  async getNotificationById(
    @Param(new ZodPipe(notificationParam)) params: NotificationParamDto,
  ) {
    return this.notificationsService.getNotificationById(params.id);
  }
}
