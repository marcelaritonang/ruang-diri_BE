import { Module, forwardRef } from '@nestjs/common';

import { NotificationsModule } from '../notifications/notifications.module';
import { UsersModule } from '../users/users.module';

import { QueueModule } from '@/queue/queue.module';

import { SchedulesController } from './interfaces/schedules.controller';
import { SchedulesRepository } from './infrastructure/schedules.repository';
import { SchedulesService } from './application/schedules.service';

@Module({
  imports: [NotificationsModule, forwardRef(() => QueueModule), forwardRef(() => UsersModule)],
  controllers: [SchedulesController],
  providers: [SchedulesRepository, SchedulesService],
  exports: [SchedulesRepository, SchedulesService],
})
export class SchedulesModule {}
