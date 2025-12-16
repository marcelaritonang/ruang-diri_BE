import {
  Controller,
  // Get,
  // Post,
  // Delete,
  // Body,
  // Param,
  // Put,
  // UseGuards
} from '@nestjs/common';
// import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
// import { RolesGuard } from '@modules/auth/guards/roles.guard';
// import { Roles } from '@modules/auth/decorators/roles.decorator';
import { TestimonialsService } from './testimonials.service';
// import { TestimonialInsertSchema, TestimonialUpdateSchema } from './testimonials.schema';

@Controller({
  version: '1',
  path: 'testimonials',
})
export class TestimonialsController {
  constructor(private readonly testimonialsService: TestimonialsService) {}

  // @Get()
  // async getTestimonials() {
  //   return this.testimonialsService.getTestimonials();
  // }

  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles('super_admin')
  // @Post()
  // async createTestimonial(
  //   @Body() createTestimonyDTO: unknown
  // ) {
  //   const validatedData = TestimonialInsertSchema.parse(createTestimonyDTO);
  //   return this.testimonialsService.createTestimonial(validatedData);
  // }

  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles('super_admin')
  // @Put(':id')
  // async updateTestimonial(
  //   @Param('id') id: string,
  //   @Body() updateTestimonyDTO: unknown
  // ) {
  //   const cleanedData = Object.fromEntries(
  //     Object.entries(updateTestimonyDTO as Record<string, unknown>)
  //       .filter(([_, value]) => value !== '' && value !== null && value !== undefined)
  //   );

  //   const validatedData = TestimonialUpdateSchema.parse(cleanedData);
  //   return this.testimonialsService.updateTestimonial(id, validatedData);
  // }

  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles('super_admin')
  // @Delete(':id')
  // async deleteTestimonial(
  //   @Param('id') id: string
  // ) {
  //   return this.testimonialsService.deleteTestimonial(id)
  // }
}
