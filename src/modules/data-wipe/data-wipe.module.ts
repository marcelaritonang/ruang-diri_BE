import { Module } from '@nestjs/common';

import { CommonModule } from '@/common/common.module';

import { DataWipeService } from './data-wipe.service';
import { DataWipeController } from './data-wipe.controller';

@Module({
  imports: [CommonModule],
  controllers: [DataWipeController],
  providers: [DataWipeService],
  exports: [DataWipeService],
})
export class DataWipeModule {}
