import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DrizzleService } from '@common/drizzle/drizzle.service';
import { clientProfiles } from './clients-profile.schema';
import type { ClientProfile, CreateClientProfile, UpdateClientProfile } from './clients-profile.schema';

@Injectable()
export class ClientProfilesRepository {
  constructor(private readonly drizzle: DrizzleService) {}

  async findByUserId(userId: string): Promise<ClientProfile | undefined> {
    const { db } = this.drizzle;
    const result = await db.select().from(clientProfiles).where(eq(clientProfiles.userId, userId));
    return result[0];
  }

  async create(data: CreateClientProfile): Promise<ClientProfile> {
    const { db } = this.drizzle;
    const [inserted] = await db.insert(clientProfiles).values(data).returning();
    return inserted;
  }

  async update(userId: string, data: Partial<UpdateClientProfile>): Promise<ClientProfile | undefined> {
    const { db } = this.drizzle;
    const [updated] = await db.update(clientProfiles).set(data).where(eq(clientProfiles.userId, userId)).returning();
    return updated;
  }

  async delete(userId: string): Promise<ClientProfile | undefined> {
    const { db } = this.drizzle;
    const [deleted] = await db.delete(clientProfiles).where(eq(clientProfiles.userId, userId)).returning();
    return deleted;
  }
}
