import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { QueueModule } from '@/queue/queue.module';
import { CloudStorageModule } from '@/common/cloud-storage/cloud-storage.module';

import { ChatController } from './interfaces/chat.controller';
import { ChatService } from './application/chat.service';
import { ChatRepository } from './infrastructure/chat.repository';
import { AblyService } from './application/ably.service';
import { CounselingsRepository } from '@/modules/mental-health/infrastructure/counselings.repository';
import { UsersRepository } from '@/modules/users/infrastructure/users.repository';
import { SearchIndexModule } from './search-index.module';

@Module({
  imports: [
    ConfigModule,
    forwardRef(() => QueueModule),
    SearchIndexModule,
    CloudStorageModule, // ADD THIS
  ],
  controllers: [ChatController],
  providers: [
    ChatService,
    ChatRepository,
    AblyService,
    CounselingsRepository,
    UsersRepository,
  ],
  exports: [ChatService, AblyService, SearchIndexModule],
})
export class ChatModule {}