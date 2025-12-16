import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DrizzleService } from '@common/drizzle/drizzle.service';
import { type Testimonial, type CreateTestimonial, testimonials } from './testimonials.schema';

@Injectable()
export class TestimonialsRepository {
  constructor(private drizzle: DrizzleService) {}

  async getTestimonials() {
      const { db } = this.drizzle;
      const result = await db.select().from(testimonials);
      return result;
  }

  async createTestimony(testimony: CreateTestimonial): Promise<Testimonial[]> {
      const { db } = this.drizzle;

      return await db.insert(testimonials).values(testimony).returning();
  }

  async updateTestimony(id: string, testimony: Partial<Testimonial>): Promise<Testimonial[]> {
      const { db } = this.drizzle;
      return await db.update(testimonials)
          .set(testimony)
          .where(eq(testimonials.id, id))
          .returning();
  }

  async deleteTestimony(id: string): Promise<Testimonial[]> {
      const { db } = this.drizzle;

      return await db.delete(testimonials)
          .where(eq(testimonials.id, id))
          .returning();
  }
}