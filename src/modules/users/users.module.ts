import { Module, forwardRef } from '@nestjs/common';

import { UsersService } from './application/users.service';
import { UsersController } from './interfaces/users.controller';
import { UsersRepository } from './infrastructure/users.repository';

import { NotificationsModule } from '../notifications/notifications.module';
import { PsychologistProfileModule } from '../psychologists/psychologist-profile.module';

@Module({
  controllers: [UsersController],
  providers: [UsersService, UsersRepository],
  exports: [UsersService, UsersRepository],
  imports: [NotificationsModule, forwardRef(() => PsychologistProfileModule)],
})
export class UsersModule {}
