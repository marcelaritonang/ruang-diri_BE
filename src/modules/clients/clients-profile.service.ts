import { Injectable, NotFoundException } from '@nestjs/common';
import { ClientProfilesRepository } from './clients-profile.repository';
import type { ClientProfile, CreateClientProfile, UpdateClientProfile } from './clients-profile.schema';

@Injectable()
export class ClientsProfileService {
  constructor(private readonly repo: ClientProfilesRepository) {}

  async getByUserId(userId: string): Promise<ClientProfile> {
    const profile = await this.repo.findByUserId(userId);
    if (!profile) throw new NotFoundException('Client profile not found');
    return profile;
  }

  async create(data: CreateClientProfile): Promise<ClientProfile> {
    return this.repo.create(data);
  }

  async update(userId: string, data: Partial<UpdateClientProfile>): Promise<ClientProfile> {
    const updated = await this.repo.update(userId, data);
    if (!updated) throw new NotFoundException('Profile to update not found');
    return updated;
  }

  async delete(userId: string): Promise<ClientProfile> {
    const deleted = await this.repo.delete(userId);
    if (!deleted) throw new NotFoundException('Profile to delete not found');
    return deleted;
  }
}
