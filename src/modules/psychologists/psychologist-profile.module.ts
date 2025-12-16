import { Module } from '@nestjs/common';
import { PsychologistsService } from './psychologist-profile.service';
import { PsychologistsController } from './psychologist-profile.controller';
import { PsychologistRepository } from './psychologist-profile.repository';
import { AvailabilityService } from './services/availability.service';

import { SchedulesModule } from '../schedules/schedules.module';

@Module({
  controllers: [PsychologistsController],
  providers: [
    PsychologistsService,
    PsychologistRepository,
    AvailabilityService,
  ],
  exports: [PsychologistsService, AvailabilityService],
  imports: [SchedulesModule],
})
export class PsychologistProfileModule {}
