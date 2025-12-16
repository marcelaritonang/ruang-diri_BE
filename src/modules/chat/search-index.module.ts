import { Module } from '@nestjs/common';

import { CommonModule } from '@/common/common.module';

import { SearchIndexController } from './interfaces/search-index.controller';
import { SearchIndexService } from './application/search-index.service';
import { SearchIndexRepository } from './infrastructure/search-index.repository';
import { ChatRepository } from './infrastructure/chat.repository';

@Module({
  imports: [CommonModule],
  controllers: [SearchIndexController],
  providers: [SearchIndexService, SearchIndexRepository, ChatRepository],
  exports: [SearchIndexService, SearchIndexRepository],
})
export class SearchIndexModule {}
