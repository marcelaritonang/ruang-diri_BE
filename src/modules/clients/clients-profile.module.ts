import { Module } from '@nestjs/common';
import { ClientProfilesRepository } from './clients-profile.repository';
import { ClientsProfileService } from './clients-profile.service';
import { ClientsProfileController } from './clients-profile.controller';

@Module({
  controllers: [ClientsProfileController],
  providers: [ClientsProfileService, ClientProfilesRepository],
  exports: [ClientsProfileService, ClientProfilesRepository],
})
export class ClientProfilesModule {}
