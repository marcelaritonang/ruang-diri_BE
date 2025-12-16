import { eq } from 'drizzle-orm';
import { ConflictException, Injectable } from '@nestjs/common';
import { DrizzleService } from '@common/drizzle/drizzle.service';
import { partners } from './partners.schema';
import type { Partners, CreatePartners } from './partners.schema';

@Injectable()
export class PartnersRepository {
  constructor(private drizzle: DrizzleService) {}

    async getPartners() {
        const { db } = this.drizzle;

        const result = await db.select().from(partners);
        return result
    }

    async createPartner(partner: CreatePartners): Promise<Partners[]> {
        const { db } = this.drizzle;

        return await db.insert(partners).values({ ...partner, logo: partner.logo }).returning();
    }

    async updatePartner(id: string, partner: Partial<CreatePartners>): Promise<Partners[]> {
        const { db } = this.drizzle;

        if(!id) throw new ConflictException('partner ID is required for update');

        return await db.update(partners).set({...partner, logo: partner.logo}).where(eq(partners.id, id)).returning();
    }

    async deletePartner(id: string) {
        const { db } = this.drizzle;

        if(!id) throw new ConflictException('partner ID is required for delete');

        return await db.delete(partners).where(eq(partners.id, id)).returning();
    }
}