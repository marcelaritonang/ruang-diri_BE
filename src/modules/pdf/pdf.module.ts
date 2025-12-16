import { Module } from '@nestjs/common';
import { PdfController } from './interfaces/pdf.controller';
import { PdfGeneratorService } from './application/pdf-generator.service';
import { PdfIntegrationService } from './application/pdf-integration.service';
import { OrganizationsModule } from '../organizations/organizations.module';

@Module({
  imports: [OrganizationsModule],
  controllers: [PdfController],
  providers: [PdfGeneratorService, PdfIntegrationService],
  exports: [PdfGeneratorService, PdfIntegrationService],
})
export class PdfModule {}
