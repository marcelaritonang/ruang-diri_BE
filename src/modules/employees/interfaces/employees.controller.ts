import {
  Controller,
  Get,
  UseGuards,
  Query,
  Post,
  UseInterceptors,
  UploadedFile,
  Req,
  BadRequestException,
  Param,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { Roles } from '@/modules/auth/decorators/roles.decorator';

import {
  ApiStandardDocs,
  authorizationHeaderDocs,
} from '@/common/utils/swagger-decorator.util';
import {
  OrganizationTypeGuard,
  RequireOrgType,
} from '@/common/guards/organization-type.guard';

import {
  EmployeeRolesDto,
  EmployeeDashboardMetricsDto,
  EmployeeDetailDto,
} from '../domain/dto/employee-docs.dto';

import { EmployeeProfilesService } from '../application/employees.service';
import { IUserRequest } from '@/modules/auth/strategies/jwt.strategy';
import { CurrentUser } from '@/common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, RolesGuard, OrganizationTypeGuard)
@Roles('organization')
@RequireOrgType('company')
@ApiTags('Employees')
@Controller({
  version: '1',
  path: 'employees',
})
@ApiBearerAuth()
export class EmployeeProfilesController {
  constructor(private readonly service: EmployeeProfilesService) {}

  @Get('roles')
  @ApiStandardDocs({
    summary: 'Get students academic information',
    roles: ['organization'],
    headers: [authorizationHeaderDocs()],
    successResponseDto: EmployeeRolesDto,
    extraResponses: [{ status: 404, description: 'No roles found' }],
  })
  async getDepartments(@CurrentUser() user: IUserRequest['user']) {
    return this.service.getEmployeesRoles(user.organizationId!);
  }

  @Get('metrics/monthly-stats')
  @ApiStandardDocs({
    summary: 'Get dashboard metrics for students',
    successResponseDto: EmployeeDashboardMetricsDto,
    roles: ['organization'],
    headers: [authorizationHeaderDocs()],
  })
  async getMonthlyMentalHealthStats(@CurrentUser() user: IUserRequest['user']) {
    return this.service.getMonthlyMentalHealthStats(user.organizationId!);
  }

  @Get('metrics/yearly-stats')
  @ApiStandardDocs({
    summary: 'Get yearly mental health metrics for students',
    roles: ['organization'],
    successResponseDto: EmployeeDashboardMetricsDto,
    headers: [authorizationHeaderDocs()],
    queries: [
      {
        name: 'year',
        type: 'number',
        required: true,
        description: 'Year for which to fetch metrics',
      },
      {
        name: 'department',
        type: 'string',
        required: true,
        description: 'Department to filter metrics by',
      },
    ],
    extraResponses: [
      { status: 400, description: 'Invalid year or department' },
      { status: 404, description: 'No metrics found for the given year' },
    ],
  })
  async getYearlyMentalHealthStats(
    @Query('year') year: number,
    @Query('department') department: string,
    @CurrentUser() user: IUserRequest['user'],
  ) {
    if (!year || isNaN(year)) {
      throw new BadRequestException('Year must be a valid number');
    }

    return this.service.getYearlyMentalHealthStats(
      year,
      department,
      user.organizationId,
    );
  }

  @Post('bulk-create/file')
  @UseInterceptors(FileInterceptor('file'))
  async uploadEmployeesProfiles(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const organizationId = req.user.organizationId;

    if (!organizationId) {
      throw new BadRequestException('Organization ID not found');
    }

    return this.service.createEmployeesFromExcel(file.buffer, organizationId);
  }

  @Get(':id')
  @ApiStandardDocs({
    summary: 'Get employee detail by ID',
    successResponseDto: EmployeeDetailDto,
    roles: ['organization'],
    headers: [authorizationHeaderDocs()],
    extraResponses: [
      { status: 400, description: 'Employee not found' },
      { status: 404, description: 'Employee not found' },
    ],
    params: [
      { name: 'id', type: 'string', required: true, description: 'Student ID' },
    ],
  })
  async getStudentDetail(@Param('id') id: string) {
    if (!id) {
      throw new BadRequestException('Employee ID is required');
    }

    return this.service.getEmployeeById(id);
  }
}
