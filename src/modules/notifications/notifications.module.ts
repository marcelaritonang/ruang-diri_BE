import { Module } from '@nestjs/common';

import { NotificationGateway } from '@/gateway/notifications/notification.gateway';

import { NotificationsController } from './interfaces/notifications.controller';
import { NotificationsRepository } from './infrastructure/notifications.repository';
import { NotificationsService } from './application/notifications.service';

@Module({
  controllers: [NotificationsController],
  providers: [
    NotificationsRepository,
    NotificationsService,
    NotificationGateway,
  ],
  exports: [NotificationsRepository, NotificationsService, NotificationGateway],
})
export class NotificationsModule {}
