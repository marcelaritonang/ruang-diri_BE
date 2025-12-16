// src/modules/partners/partners.service.ts
import { 
  Injectable, 
  ConflictException, 
  Logger,
  NotFoundException
} from '@nestjs/common';
import { SuccessResponse } from '@/common/utils/response.util';
// import { CloudStorageService } from '@/common/cloud-storage/cloud-storage.service'; // GCS: Add this
import { PartnersRepository } from './partners.repository';
import type { CreatePartners, UpdatePartners } from "./partners.schema";

@Injectable()
export class PartnersService {
  private readonly logger = new Logger(PartnersService.name);

  constructor(
    private readonly partnersRepository: PartnersRepository,
    // private readonly cloudStorageService: CloudStorageService, // GCS: Add this
  ) {}

  async getPartners() {
    this.logger.log('Fetching all partners');
    const partners = await this.partnersRepository.getPartners();

    // GCS: Generate signed URLs for logos
    // const partnersWithSignedUrls = await Promise.all(
    //   partners.map(async (partner) => {
    //     if (partner.logo) {
    //       return {
    //         ...partner,
    //         logoUrl: await this.cloudStorageService.getSignedUrl(
    //           partner.logo,
    //           { expiresIn: 60 }, // 60 minutes
    //         ),
    //       };
    //     }
    //     return partner;
    //   }),
    // );

    this.logger.log(`Fetched partners: ${partners.length}`);
    return SuccessResponse.create(partners, 'Partners fetched successfully');
    // return SuccessResponse.create(partnersWithSignedUrls, 'Partners fetched successfully'); // GCS: Use this instead
  }

  async createPartner(createPartnerDTO: CreatePartners) {
    this.logger.log('Creating partner');
    
    if (!createPartnerDTO.logo) {
      throw new ConflictException('Logo is required');
    }

    const createdPartner = await this.partnersRepository.createPartner(createPartnerDTO);

    // GCS: Generate signed URL for response
    // if (createdPartner[0]?.logo) {
    //   const logoUrl = await this.cloudStorageService.getSignedUrl(
    //     createdPartner[0].logo,
    //     { expiresIn: 60 },
    //   );
    //   createdPartner[0] = {
    //     ...createdPartner[0],
    //     logoUrl,
    //   };
    // }

    this.logger.log(`Partner created with ID: ${createdPartner[0]?.id}`);
    return SuccessResponse.create(createdPartner, 'Partner created successfully');
  }

  async updatePartner(id: string, updatePartnerDTO: UpdatePartners) {
    this.logger.log(`Updating partner with ID: ${id}`);

    if (Object.keys(updatePartnerDTO).length === 0) {
      throw new ConflictException('No data provided for update');
    }

    const updatedPartner = await this.partnersRepository.updatePartner(id, updatePartnerDTO as CreatePartners);
    
    if (!updatedPartner.length) {
      throw new NotFoundException(`Partner with ID ${id} not found`);
    }

    // GCS: Generate signed URL for response
    // if (updatedPartner[0]?.logo) {
    //   const logoUrl = await this.cloudStorageService.getSignedUrl(
    //     updatedPartner[0].logo,
    //     { expiresIn: 60 },
    //   );
    //   updatedPartner[0] = {
    //     ...updatedPartner[0],
    //     logoUrl,
    //   };
    // }
    
    this.logger.log(`Partner updated: ${updatedPartner[0]?.id}`);
    return SuccessResponse.create(updatedPartner, 'Partner updated successfully');
  }

  async deletePartner(id: string) {
    this.logger.log(`Deleting partner with ID: ${id}`);

    const deletedPartner = await this.partnersRepository.deletePartner(id);

    if (!deletedPartner.length) {
      throw new NotFoundException(`Partner with ID ${id} not found`);
    }

    // GCS: Optional - Delete logo from GCS
    // if (deletedPartner[0]?.logo) {
    //   await this.cloudStorageService.deleteFile(deletedPartner[0].logo);
    //   this.logger.log(`Deleted logo from GCS: ${deletedPartner[0].logo}`);
    // }

    this.logger.log(`Partner deleted: ${deletedPartner[0]?.id}`);
    return SuccessResponse.create(deletedPartner, 'Partner deleted successfully');
  }
}