import { Module } from '@nestjs/common';

import { SchedulesModule } from '@/modules/schedules/schedules.module';
import { PsychologistProfileModule } from '@/modules/psychologists/psychologist-profile.module';
import { NotificationsModule } from '@/modules/notifications/notifications.module';
import { UsersModule } from '@/modules/users/users.module';
import { ChatModule } from '@/modules/chat/chat.module';
import { QueueModule } from '@/queue/queue.module';
import { OrganizationsModule } from '../organizations/organizations.module';

import { CommonModule } from '@/common/common.module';

import { CounselingsService } from './application/counselings.service';
import { CounselingsController } from './interfaces/counselings.controller';
import { CounselingsRepository } from './infrastructure/counselings.repository';

import { ScreeningsService } from './application/screenings.service';
import { ScreeningsController } from './interfaces/screenings.controller';
import { ScreeningsRepository } from './infrastructure/screenings.repository';

import { DassUtilityService } from './utils/dass-utility.service';

@Module({
  imports: [
    SchedulesModule,
    CommonModule,
    PsychologistProfileModule,
    NotificationsModule,
    UsersModule,
    ChatModule,
    QueueModule,
    OrganizationsModule,
  ],
  controllers: [CounselingsController, ScreeningsController],
  providers: [
    CounselingsService,
    CounselingsRepository,
    ScreeningsService,
    ScreeningsRepository,
    DassUtilityService,
  ],
  exports: [ScreeningsService, DassUtilityService],
})
export class MentalHealthModule {}
