import { Module } from '@nestjs/common';
import { TestimonialsService } from './testimonials.service';
import { TestimonialsController } from './testimonials.controller';
import { TestimonialsRepository } from './testimonials.repository';

@Module({
  controllers: [TestimonialsController],
  providers: [TestimonialsService, TestimonialsRepository],
  exports: [TestimonialsService],
})
export class TestimonialsModule {}
