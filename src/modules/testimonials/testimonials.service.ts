import { 
    Injectable, 
    Logger,
    NotFoundException,
  } from '@nestjs/common';
  import { SuccessResponse } from '@/common/utils/response.util';
  import { TestimonialsRepository } from './testimonials.repository';
  import {
    type CreateTestimonial,
    type UpdateTestimonial,
  } from "./testimonials.schema"
  
  @Injectable()
  export class TestimonialsService {
    private readonly logger = new Logger(TestimonialsService.name);
  
    constructor(
      private readonly testimonialRepository: TestimonialsRepository,
    ) {}
  
    async getTestimonials() {
      this.logger.log('Fetching all testimonials');
      const fetchedTestimonials = await this.testimonialRepository.getTestimonials();
  
      this.logger.log(`Fetched Testimonials: ${fetchedTestimonials.length}`);
      return SuccessResponse.create(fetchedTestimonials, 'Testimonials fetched successfully');
    }
  
    async createTestimonial(createTestimonyDTO: CreateTestimonial) {
      this.logger.log('Creating Testimonial');
      const createdTestimonial = await this.testimonialRepository.createTestimony(createTestimonyDTO);
  
      this.logger.log(`Testimonial created with ID: ${createdTestimonial[0]?.id}`);
      return SuccessResponse.create(createdTestimonial, 'Testimonial created successfully');
    }
  
    async updateTestimonial(id: string, updateTestimonyDTO: UpdateTestimonial) {
      this.logger.log(`Updating Testimonial with ID: ${id}`);
      
      const dataToUpdate = {
        ...updateTestimonyDTO,
        updatedAt: new Date()
      };
      
      const updatedTestimonial = await this.testimonialRepository.updateTestimony(id, dataToUpdate);
  
      if (!updatedTestimonial.length) {
        throw new NotFoundException(`Testimonial with ID ${id} not found`);
      }
  
      this.logger.log(`Testimonial updated: ${updatedTestimonial[0]?.id}`);
      return SuccessResponse.create(updatedTestimonial, 'Testimonial updated successfully');
    }
  
    async deleteTestimonial(id: string) {
      this.logger.log(`Deleting testimonial with ID: ${id}`);
      const deletedTestimonial = await this.testimonialRepository.deleteTestimony(id);
  
      if (!deletedTestimonial.length) {
        throw new NotFoundException(`Testimonial with ID ${id} not found`);
      }
  
      this.logger.log(`Testimonial deleted: ${deletedTestimonial[0]?.id}`);
      return SuccessResponse.create(deletedTestimonial, 'Testimonial deleted successfully');
    }
  }