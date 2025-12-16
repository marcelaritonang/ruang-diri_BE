import { Module } from '@nestjs/common';

import { UsersService } from './application/users.service';
import { UsersController } from './interfaces/users.controller';
import { UsersRepository } from './infrastructure/users.repository';

import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  controllers: [UsersController],
  providers: [UsersService, UsersRepository],
  exports: [UsersService, UsersRepository],
  imports: [NotificationsModule],
})
export class UsersModule {}
