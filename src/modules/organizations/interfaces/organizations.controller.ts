import {
  Controller,
  Get,
  Request,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Body,
  Patch,
  Param,
  ConflictException,
  Put,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiBearerAuth } from '@nestjs/swagger';

import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@modules/auth/guards/roles.guard';
import { Roles } from '@modules/auth/decorators/roles.decorator';
import {
  ApiStandardDocs,
  authorizationHeaderDocs,
} from '@/common/utils/swagger-decorator.util';
import {
  type GetStudentsQuery,
  GetStudentsQuerySchema,
} from '@/modules/students/domain/dto/response-student.dto';
import {
  type GetEmployeeQuery,
  GetEmployeeQuerySchema,
} from '@/modules/employees/domain/employees.schema';
import type { IUserRequest } from '@modules/auth/strategies/jwt.strategy';

import {
  OrganizationTypeGuard,
  RequireOrgType,
} from '@/common/guards/organization-type.guard';
import { ZodPipe } from '@/common/pipes/zod-validation.pipe';
import { uploadImageToGCS } from '@/common/utils/image.util';
import { multerConfigFactory } from '@/config/multer.config';
import { CloudStorageService } from '@/common/cloud-storage/cloud-storage.service';

import {
  SchoolDocsResponseDto,
  CompanyDocsResponseDto,
  OrganizationDto,
} from '../domain/dto/organizations-docs.dto';

import { OrganizationsService } from '../application/organizations.service';
import {
  updateOrganizationInfo,
  type UpdateOrganizationInfo,
} from '../domain/organizations.schema';

@UseGuards(JwtAuthGuard, RolesGuard, OrganizationTypeGuard)
@Roles('organization', 'super_admin')
@Controller({
  version: '1',
  path: 'organizations',
})
@ApiBearerAuth()
export class OrganizationsController {
  constructor(
    private organizationsService: OrganizationsService,
    private cloudStorageService: CloudStorageService,
  ) {}

  @RequireOrgType('school')
  @SkipThrottle()
  @Get('students')
  @ApiStandardDocs({
    summary: 'Get students list',
    roles: ['organization', 'super_admin'],
    headers: [authorizationHeaderDocs()],
    successResponseDto: SchoolDocsResponseDto,
    extraResponses: [
      { status: 404, description: 'Students not found' },
      { status: 409, description: 'Organization ID is required' },
    ],
  })
  async getStudents(
    @Request() req: IUserRequest,
    @Query(new ZodPipe(GetStudentsQuerySchema)) query: GetStudentsQuery,
  ) {
    if (!req.user.organizationId) {
      throw new ConflictException('Organization ID is required');
    }

    return this.organizationsService.getStudentList(
      req.user.organizationId!,
      query,
    );
  }

  @RequireOrgType('company')
  @SkipThrottle()
  @Get('employees')
  @ApiStandardDocs({
    summary: 'Get employees list',
    roles: ['organization', 'super_admin'],
    headers: [authorizationHeaderDocs()],
    successResponseDto: CompanyDocsResponseDto,
    extraResponses: [
      { status: 404, description: 'Employees not found' },
      { status: 400, description: 'Invalid query parameters' },
    ],
  })
  async getEmployees(
    @Request() req: IUserRequest,
    @Query(new ZodPipe(GetEmployeeQuerySchema)) query: GetEmployeeQuery,
  ) {
    if (!req.user.organizationId) {
      throw new ConflictException('Organization ID is required');
    }

    return this.organizationsService.getEmployeeList(
      req.user.organizationId!,
      query,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch('profile')
  @UseInterceptors(
    FileInterceptor('profilePicture', multerConfigFactory('organizations')),
  )
  @ApiStandardDocs({
    summary: 'Update organization profile',
    roles: ['organization', 'super_admin'],
    headers: [authorizationHeaderDocs()],
    successResponseDto: OrganizationDto,
    extraResponses: [
      { status: 409, description: 'Organization ID is required' },
      { status: 400, description: 'Invalid update data' },
    ],
  })
  async updateOrganizationInfo(
    @Request() req: IUserRequest,
    @UploadedFile() profilePicture: Express.Multer.File,
    @Body() body: UpdateOrganizationInfo,
  ) {
    if (!req.user.organizationId) {
      throw new ConflictException('Organization ID is required');
    }
    if (!body) {
      throw new ConflictException('No update data provided');
    }
    const updateData = updateOrganizationInfo.parse(body);
    
    let profilePictureFilePath: string | undefined = undefined;
    if (profilePicture) {
      // Upload to GCS and get relative path
      profilePictureFilePath = await uploadImageToGCS(
        profilePicture,
        'organizations',
        this.cloudStorageService,
      );
    }
    
    const data = updateData || {};
    const {
      fullName,
      phone,
      address,
      isOnboarded,
      profilePicture: _,
      ...organizationData
    } = data;
    
    // Filter out empty/null/undefined fields
    const filterValid = (obj: any) =>
      Object.fromEntries(
        Object.entries(obj).filter(
          ([_, v]) => v !== undefined && v !== null && v !== '',
        ),
      );
    
    const generalData = filterValid({
      fullName,
      phone,
      address,
      isOnboarded,
      profilePicture: profilePictureFilePath || data.profilePicture,
    });
    
    const filteredOrgData = filterValid(organizationData);
    
    return this.organizationsService.updateOrganizationInfo(
      req.user.id!,
      filteredOrgData,
      generalData,
    );
  }

  @Get('students/period')
  async getStudentsInPeriod(
    @Request() req: IUserRequest,
    @Query(new ZodPipe(GetStudentsQuerySchema)) query: GetStudentsQuery,
  ) {
    if (!req.user.organizationId) {
      throw new ConflictException('Organization ID is required');
    }

    return this.organizationsService.getStudentsInPeriod(
      req.user.organizationId,
      query,
    );
  }

  @Get('employees/period')
  async getEmployeesInPeriod(
    @Request() req: IUserRequest,
    @Query(new ZodPipe(GetStudentsQuerySchema)) query: GetEmployeeQuery,
  ) {
    if (!req.user.organizationId) {
      throw new ConflictException('Organization ID is required');
    }

    return this.organizationsService.getEmployeesInPeriod(
      req.user.organizationId,
      query,
    );
  }

  @RequireOrgType('school')
  @Patch('students/:id')
  @UseInterceptors(
    FileInterceptor('profilePicture', multerConfigFactory('students')),
  )
  async updateStudent(
    @Param('id') studentId: string,
    @UploadedFile() profilePicture: Express.Multer.File,
    @Body() updateData: any,
  ) {
    if (!studentId) {
      throw new ConflictException('Student ID is required');
    }
    if (!updateData) {
      throw new ConflictException('No update data provided');
    }
    
    let profilePictureFilePath: string | undefined = undefined;
    if (profilePicture) {
      // Upload to GCS and get relative path
      profilePictureFilePath = await uploadImageToGCS(
        profilePicture,
        'students',
        this.cloudStorageService,
      );
    }
    
    updateData = updateData || {};
    
    // Extract user-table fields
    const {
      fullName,
      address,
      phone,
      isOnboarded,
      profilePicture: _,
      ...details
    } = updateData;
    
    const filterValid = (obj: any) =>
      Object.fromEntries(
        Object.entries(obj).filter(
          ([_, v]) => v !== undefined && v !== null && v !== '',
        ),
      );
    
    const generalData = filterValid({
      fullName,
      address,
      phone,
      isOnboarded,
      profilePicture: profilePictureFilePath || updateData.profilePicture,
    });
    
    const filteredDetails = filterValid(details);
    
    return this.organizationsService.updateStudentProfile(studentId, {
      generalData,
      details: filteredDetails,
    });
  }

  @RequireOrgType('company')
  @Patch('employees/:id')
  @UseInterceptors(
    FileInterceptor('profilePicture', multerConfigFactory('employees')),
  )
  async updateEmployee(
    @Param('id') employeeId: string,
    @UploadedFile() profilePicture: Express.Multer.File,
    @Body() updateData: any,
  ) {
    if (!employeeId) {
      throw new ConflictException('Employee ID is required');
    }
    if (!updateData) {
      throw new ConflictException('No update data provided');
    }
    
    let profilePictureFilePath: string | undefined = undefined;
    if (profilePicture) {
      // Upload to GCS and get relative path
      profilePictureFilePath = await uploadImageToGCS(
        profilePicture,
        'employees',
        this.cloudStorageService,
      );
    }
    
    updateData = updateData || {};
    
    // Extract user-table fields
    const {
      fullName,
      address,
      phone,
      isOnboarded,
      profilePicture: _,
      ...details
    } = updateData;
    
    const filterValid = (obj: any) =>
      Object.fromEntries(
        Object.entries(obj).filter(
          ([_, v]) => v !== undefined && v !== null && v !== '',
        ),
      );
    
    const generalData = filterValid({
      fullName,
      address,
      phone,
      isOnboarded,
      profilePicture: profilePictureFilePath || updateData.profilePicture,
    });
    
    const filteredDetails = filterValid(details);
    
    return this.organizationsService.updateEmployeeProfile(employeeId, {
      generalData,
      details: filteredDetails,
    });
  }
}
