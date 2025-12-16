import {
  Controller,
  Response,
  HttpStatus,
  Logger,
  UseGuards,
  Request,
  Get,
  Query,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Response as ExpressResponse } from 'express';
import { PdfGeneratorService } from '../application/pdf-generator.service';
import { PdfIntegrationService } from '../application/pdf-integration.service';
import { SuccessResponse } from '../../../common/utils/response.util';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../modules/auth/guards/roles.guard';
import {
  OrganizationTypeGuard,
  RequireOrgType,
} from '../../../common/guards/organization-type.guard';
import { Roles } from '../../../modules/auth/decorators/roles.decorator';
import { ZodPipe } from '../../../common/pipes/zod-validation.pipe';
import { GetEmployeeQuerySchema } from '../../employees/domain/employees.schema';
import { GetStudentsQuerySchema } from '../../students/domain/dto/response-student.dto';
import type { GetEmployeeQuery } from '../../employees/domain/employees.schema';
import type { GetStudentsQuery } from '../../students/domain/dto/response-student.dto';
import type { IUserRequest } from '../../auth/strategies/jwt.strategy';

@ApiTags('PDF Generator')
@Controller({
  version: '1',
  path: 'pdf',
})
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('organization')
export class PdfController {
  private readonly logger = new Logger(PdfController.name);

  constructor(
    private readonly pdfGeneratorService: PdfGeneratorService,
    private readonly pdfIntegrationService: PdfIntegrationService,
  ) {}

  @Get('employees/risk-report')
  @UseGuards(OrganizationTypeGuard)
  @RequireOrgType('company')
  @ApiOperation({
    summary: 'Generate employee risk assessment PDF report',
    description:
      'Generate a PDF report with employee risk data from organization data',
  })
  @ApiResponse({
    status: 200,
    description: 'PDF generated successfully',
    content: {
      'application/pdf': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  async generateEmployeeRiskReport(
    @Request() req: IUserRequest,
    @Query(new ZodPipe(GetEmployeeQuerySchema)) query: GetEmployeeQuery,
    @Response() res: ExpressResponse,
  ) {
    try {
      if (!req.user.organizationId) {
        throw new BadRequestException('Organization ID is required');
      }

      this.logger.log(
        `Generating employee PDF report for organization: ${req.user.organizationId}`,
      );

      const pdfBuffer =
        await this.pdfIntegrationService.generateEmployeePeriodReport(
          req.user,
          query,
        );

      const filename = this.pdfGeneratorService.generateFilename(
        'karyawan_list_report',
      );

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}"`,
      );
      res.setHeader('Content-Length', pdfBuffer.length);

      res.status(HttpStatus.OK).send(pdfBuffer);

      this.logger.log(
        `Employee PDF report generated successfully: ${filename}`,
      );
    } catch (error) {
      this.logger.error('Error generating employee PDF report:', error);

      res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json(
          SuccessResponse.create(
            null,
            'Failed to generate employee PDF report',
          ),
        );
    }
  }

  //   @Get('students/risk-report')
  //   @UseGuards(OrganizationTypeGuard)
  //   @RequireOrgType('school')
  //   @ApiOperation({
  //     summary: 'Generate student risk assessment PDF report',
  //     description:
  //       'Generate a PDF report with student risk data from organization data',
  //   })
  //   @ApiResponse({
  //     status: 200,
  //     description: 'PDF generated successfully',
  //     content: {
  //       'application/pdf': {
  //         schema: {
  //           type: 'string',
  //           format: 'binary',
  //         },
  //       },
  //     },
  //   })
  //   async generateStudentRiskReport(
  //     @Request() req: IUserRequest,
  //     @Query(new ZodPipe(GetStudentsQuerySchema)) query: GetStudentsQuery,
  //     @Response() res: ExpressResponse,
  //   ) {
  //     try {
  //       if (!req.user.organizationId) {
  //         throw new BadRequestException('Organization ID is required');
  //       }

  //       this.logger.log(
  //         `Generating student PDF report for organization: ${req.user.organizationId}`,
  //       );

  //       const pdfBuffer =
  //         await this.pdfIntegrationService.generateStudentPeriodReport(
  //           req.user.organizationId,
  //           query,
  //         );

  //       const filename = this.pdfGeneratorService.generateFilename(
  //         'students_risk_report',
  //       );

  //       res.setHeader('Content-Type', 'application/pdf');
  //       res.setHeader(
  //         'Content-Disposition',
  //         `attachment; filename="${filename}"`,
  //       );
  //       res.setHeader('Content-Length', pdfBuffer.length);

  //       res.status(HttpStatus.OK).send(pdfBuffer);

  //       this.logger.log(`Student PDF report generated successfully: ${filename}`);
  //     } catch (error) {
  //       this.logger.error('Error generating student PDF report:', error);

  //       res
  //         .status(HttpStatus.INTERNAL_SERVER_ERROR)
  //         .json(
  //           SuccessResponse.create(null, 'Failed to generate student PDF report'),
  //         );
  //     }
  //   }

  //   @Post('generate-risk-report')
  //   @ApiOperation({
  //     summary: 'Generate risk assessment PDF report',
  //     description:
  //       'Generate a PDF report with employee risk data in RuangDiri format',
  //   })
  //   @ApiResponse({
  //     status: 200,
  //     description: 'PDF generated successfully',
  //     content: {
  //       'application/pdf': {
  //         schema: {
  //           type: 'string',
  //           format: 'binary',
  //         },
  //       },
  //     },
  //   })
  //   @ApiResponse({
  //     status: 400,
  //     description: 'Invalid request data',
  //   })
  //   @ApiResponse({
  //     status: 500,
  //     description: 'Internal server error',
  //   })
  //   async generateRiskReport(
  //     @Body() request: GeneratePdfRequestDto,
  //     @Response() res: ExpressResponse,
  //   ) {
  //     try {
  //       this.logger.log(
  //         `Generating PDF report for ${request.employees.length} employees`,
  //       );

  //       // Generate PDF buffer
  //       const pdfBuffer = await this.pdfGeneratorService.generateRiskPdf(
  //         request.employees,
  //         request.logoBase64 || '',
  //         {
  //           title: request.title,
  //           subtitle: request.subtitle,
  //           footerText: request.footerText,
  //         },
  //       );

  //       // Generate filename
  //       const filename = this.pdfGeneratorService.generateFilename();

  //       // Set response headers for PDF download
  //       res.setHeader('Content-Type', 'application/pdf');
  //       res.setHeader(
  //         'Content-Disposition',
  //         `attachment; filename="${filename}"`,
  //       );
  //       res.setHeader('Content-Length', pdfBuffer.length);

  //       // Send PDF buffer
  //       res.status(HttpStatus.OK).send(pdfBuffer);

  //       this.logger.log(`PDF report generated successfully: ${filename}`);
  //     } catch (error) {
  //       this.logger.error('Error generating PDF report:', error);

  //       res
  //         .status(HttpStatus.INTERNAL_SERVER_ERROR)
  //         .json(SuccessResponse.create(null, 'Failed to generate PDF report'));
  //     }
  //   }

  //   @Post('generate-risk-report-base64')
  //   @ApiOperation({
  //     summary: 'Generate risk assessment PDF report as base64',
  //     description:
  //       'Generate a PDF report and return as base64 string for API consumption',
  //   })
  //   @ApiResponse({
  //     status: 200,
  //     description: 'PDF generated successfully',
  //     schema: {
  //       type: 'object',
  //       properties: {
  //         success: { type: 'boolean' },
  //         message: { type: 'string' },
  //         data: {
  //           type: 'object',
  //           properties: {
  //             pdfBase64: { type: 'string' },
  //             filename: { type: 'string' },
  //             contentType: { type: 'string' },
  //           },
  //         },
  //       },
  //     },
  //   })
  //   async generateRiskReportBase64(@Body() request: GeneratePdfRequestDto) {
  //     try {
  //       this.logger.log(
  //         `Generating PDF report (base64) for ${request.employees.length} employees`,
  //       );

  //       // Generate PDF buffer
  //       const pdfBuffer = await this.pdfGeneratorService.generateRiskPdf(
  //         request.employees,
  //         request.logoBase64 || '',
  //         {
  //           title: request.title,
  //           subtitle: request.subtitle,
  //           footerText: request.footerText,
  //         },
  //       );

  //       // Convert to base64
  //       const pdfBase64 = pdfBuffer.toString('base64');
  //       const filename = this.pdfGeneratorService.generateFilename();

  //       this.logger.log(
  //         `PDF report generated successfully (base64): ${filename}`,
  //       );

  //       return SuccessResponse.create(
  //         {
  //           pdfBase64,
  //           filename,
  //           contentType: 'application/pdf',
  //           size: pdfBuffer.length,
  //         },
  //         'PDF report generated successfully',
  //       );
  //     } catch (error) {
  //       this.logger.error('Error generating PDF report (base64):', error);
  //       throw error;
  //     }
  //   }

  //   @Post('test-sample-report')
  //   @ApiOperation({
  //     summary: 'Generate sample PDF report for testing',
  //     description: 'Generate a test PDF with sample employee data',
  //   })
  //   @ApiResponse({
  //     status: 200,
  //     description: 'Sample PDF generated successfully',
  //   })
  //   async generateSampleReport(@Response() res: ExpressResponse) {
  //     try {
  //       this.logger.log('Generating sample PDF report for testing');

  //       // Sample employee data
  //       const sampleEmployees = [
  //         {
  //           name: 'Ahmad Suryadi',
  //           department: 'Teknologi Informasi',
  //           gender: 'Laki-laki',
  //           age: 32,
  //         },
  //         {
  //           name: 'Siti Nurhaliza',
  //           department: 'Sumber Daya Manusia',
  //           gender: 'Perempuan',
  //           age: 28,
  //         },
  //         {
  //           name: 'Budi Santoso',
  //           department: 'Keuangan',
  //           gender: 'Laki-laki',
  //           age: 35,
  //         },
  //       ];

  //       // Generate PDF buffer
  //       const pdfBuffer = await this.pdfGeneratorService.generateRiskPdf(
  //         sampleEmployees,
  //         '', // No logo for test
  //         {
  //           title: 'RuangDiri - Sample Report',
  //           subtitle: 'Test Report',
  //         },
  //       );

  //       // Generate filename
  //       const filename = this.pdfGeneratorService.generateFilename();

  //       // Set response headers for PDF download
  //       res.setHeader('Content-Type', 'application/pdf');
  //       res.setHeader(
  //         'Content-Disposition',
  //         `attachment; filename="sample_${filename}"`,
  //       );
  //       res.setHeader('Content-Length', pdfBuffer.length);

  //       // Send PDF buffer
  //       res.status(HttpStatus.OK).send(pdfBuffer);

  //       this.logger.log(`Sample PDF report generated successfully: ${filename}`);
  //     } catch (error) {
  //       this.logger.error('Error generating sample PDF report:', error);

  //       res
  //         .status(HttpStatus.INTERNAL_SERVER_ERROR)
  //         .json(
  //           SuccessResponse.create(null, 'Failed to generate sample PDF report'),
  //         );
  //     }
  //   }
}
