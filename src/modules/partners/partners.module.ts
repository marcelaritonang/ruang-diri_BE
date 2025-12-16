// src/modules/partners/partners.module.ts
import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { multerConfigFactory } from '@/config/multer.config';
// import { CloudStorageModule } from '@/common/cloud-storage/cloud-storage.module'; // GCS: Add this
import { PartnersService } from './partners.service';
import { PartnersController } from './partners.controller';
import { PartnersRepository } from './partners.repository';

@Module({
  controllers: [PartnersController],
  providers: [PartnersService, PartnersRepository],
  imports: [
    MulterModule.register(multerConfigFactory("partners")),
    // CloudStorageModule, // GCS: Add this
  ],
  exports: [PartnersService],
})
export class PartnersModule {}