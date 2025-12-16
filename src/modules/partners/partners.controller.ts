// src/modules/partners/partners.controller.ts
import {
  Controller,
  // Get,
  // Post,
  // Put,
  // Delete,
  // Body,
  // Param,
  // UseInterceptors,
  // UploadedFile,
  // UseGuards,
  // HttpCode,
} from '@nestjs/common';
// import { FileInterceptor } from '@nestjs/platform-express';
// import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
// import { RolesGuard } from '@modules/auth/guards/roles.guard';
// import { Roles } from '@modules/auth/decorators/roles.decorator';
// import { CloudStorageService } from '@/common/cloud-storage/cloud-storage.service'; // GCS: Add this
// import { uploadImageToGCS } from '@/common/utils/image.util'; // GCS: Add this
import { PartnersService } from './partners.service';
// import {
//   CreatePartners,
//   UpdatePartners,
//   PartnersInsertSchema,
//   PartnersUpdateSchema,
// } from './partners.schema';

@Controller({
  version: '1',
  path: 'partners',
})
export class PartnersController {
  constructor(
    private readonly partnersService: PartnersService,
    // private readonly cloudStorageService: CloudStorageService, // GCS: Add this
  ) {}

  // @Get()
  // async getPartners() {
  //   return this.partnersService.getPartners();
  // }

  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles('super_admin')
  // @Post()
  // @HttpCode(201)
  // @UseInterceptors(FileInterceptor('logo'))
  // async createPartner(
  //   @UploadedFile() logo: Express.Multer.File,
  //   @Body() createPartnerDto: unknown,
  // ) {
  //   // GCS: Replace old code with this
  //   const logoPath = logo
  //     ? await uploadImageToGCS(logo, 'partners', this.cloudStorageService)
  //     : undefined;
  //
  //   const partnerData = {
  //     ...(createPartnerDto as Partial<CreatePartners>),
  //     logo: logoPath, // GCS: Store relative path: "partners/logo-123.jpg"
  //   };
  //
  //   const validatedData = PartnersInsertSchema.parse(partnerData);
  //   return this.partnersService.createPartner(validatedData);
  // }

  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles('super_admin')
  // @Put(':id')
  // @UseInterceptors(FileInterceptor('logo'))
  // async updatePartner(
  //   @Param('id') id: string,
  //   @UploadedFile() logo: Express.Multer.File,
  //   @Body() updatePartnerDto: unknown,
  // ) {
  //   // GCS: Replace old code with this
  //   const logoPath = logo
  //     ? await uploadImageToGCS(logo, 'partners', this.cloudStorageService)
  //     : undefined;
  //
  //   const partnerData = {
  //     ...(updatePartnerDto as Partial<UpdatePartners>),
  //     ...(logo && {
  //       logo: logoPath, // GCS: Store relative path
  //     }),
  //   };
  //
  //   const cleanedData = Object.fromEntries(
  //     Object.entries(partnerData as Record<string, unknown>).filter(
  //       ([_, value]) => value !== '' && value !== null && value !== undefined,
  //     ),
  //   );
  //
  //   const validatedData = PartnersUpdateSchema.parse(cleanedData);
  //   return this.partnersService.updatePartner(id, validatedData);
  // }

  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles('super_admin')
  // @Delete(':id')
  // async deletePartner(@Param('id') id: string) {
  //   return this.partnersService.deletePartner(id);
  // }
}