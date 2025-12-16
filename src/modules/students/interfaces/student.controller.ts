import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import type { IUserRequest } from '@/modules/auth/strategies/jwt.strategy';

import {
  ApiStandardDocs,
  authorizationHeaderDocs,
} from '@/common/utils/swagger-decorator.util';
import {
  OrganizationTypeGuard,
  RequireOrgType,
} from '@/common/guards/organization-type.guard';

import { StudentProfilesService } from '../application/student.service';
import {
  StudentAcademicInfoDto,
  StudentDashboardMetricsDto,
  StudentDetailDto,
} from '../domain/dto/student-docs.dto';

@UseGuards(JwtAuthGuard, RolesGuard, OrganizationTypeGuard)
@Roles('organization')
@RequireOrgType('school')
@ApiTags('Students')
@Controller({
  version: '1',
  path: 'students',
})
@ApiBearerAuth()
export class StudentProfilesController {
  constructor(private readonly service: StudentProfilesService) {}

  @Get('academic-info')
  @ApiStandardDocs({
    summary: 'Get students academic information',
    roles: ['organization'],
    headers: [authorizationHeaderDocs()],
    successResponseDto: StudentAcademicInfoDto,
    extraResponses: [
      { status: 404, description: 'Students academic info not found' },
    ],
  })
  async getStudentsAcademicInfo() {
    return this.service.getStudentsAcademicInfo();
  }

  @Get('metrics/monthly-stats')
  @ApiStandardDocs({
    summary: 'Get dashboard metrics for students',
    roles: ['organization'],
    successResponseDto: StudentDashboardMetricsDto,
    headers: [authorizationHeaderDocs()],
  })
  async getMonthlyMentalHealthStats() {
    return this.service.getMonthlyMentalHealthStats();
  }

  @Get('metrics/yearly-stats')
  @ApiStandardDocs({
    summary: 'Get yearly mental health statistics for students',
    roles: ['organization'],
    successResponseDto: StudentDashboardMetricsDto,
    headers: [authorizationHeaderDocs()],
    queries: [
      { name: 'year', type: 'number', required: true, description: 'Year' },
      {
        name: 'grade',
        type: 'string',
        required: true,
        description: 'Grade level',
      },
      {
        name: 'classroom',
        type: 'string',
        required: true,
        description: 'Classroom identifier',
      },
    ],
    extraResponses: [
      { status: 400, description: 'Year, grade, and classroom are required' },
      { status: 400, description: 'Year must be a number' },
    ],
  })
  async getYearlyMentalHealthStats(
    @Query('year') year: number,
    @Query('grade') grade: string,
    @Query('classroom') classroom: string,
  ) {
    if (!year || !grade || !classroom) {
      throw new BadRequestException(
        'Year, grade, and classroom are required to fetch metrics',
      );
    }

    return this.service.getYearlyMentalHealthStats(year, grade, classroom);
  }

  @Get()
  @Post('bulk-create/file')
  @UseInterceptors(FileInterceptor('file'))
  async uploadStudentProfiles(
    @Req() req: IUserRequest,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const organizationId = req.user.organizationId;
    if (!organizationId) {
      throw new BadRequestException('Organization ID not found');
    }

    return this.service.createStudentsFromExcel(file.buffer, organizationId);
  }

  @Get(':id')
  @ApiStandardDocs({
    summary: 'Get student detail by ID',
    roles: ['organization'],
    successResponseDto: StudentDetailDto,
    headers: [authorizationHeaderDocs()],
    extraResponses: [{ status: 400, description: 'Student not found' }],
    params: [
      { name: 'id', type: 'string', required: true, description: 'Student ID' },
    ],
  })
  async getStudentDetail(@Param('id') id: string) {
    if (!id) {
      throw new BadRequestException('Student ID is required');
    }

    return this.service.getStudentById(id);
  }
}

// At Risk > Counseling, if not there's no counseling

// 1. at_risk > first count yg at risk, second count yg udah screening
// 2. not_screened > first count yg not screened, count kedua total siswa
// 3 not_counseled > first count yg not counseled, second count at_risk krn counseling wajib untuk yg berbahaya
