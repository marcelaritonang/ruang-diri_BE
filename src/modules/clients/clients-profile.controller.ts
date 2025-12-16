import { Controller } from '@nestjs/common';
import { ClientsProfileService } from './clients-profile.service';
// import type { CreateClientProfile, UpdateClientProfile } from './clients-profile.schema';

@Controller('client-profiles')
export class ClientsProfileController {
  constructor(private readonly service: ClientsProfileService) {}

  // @Get(':userId')
  // getByUserId(@Param('userId') userId: string) {
  //   return this.service.getByUserId(userId);
  // }

  // @Post()
  // create(@Body() data: CreateClientProfile) {
  //   return this.service.create(data);
  // }

  // @Patch(':userId')
  // update(@Param('userId') userId: string, @Body() data: Partial<UpdateClientProfile>) {
  //   return this.service.update(userId, data);
  // }

  // @Delete(':userId')
  // delete(@Param('userId') userId: string) {
  //   return this.service.delete(userId);
  // }
}
