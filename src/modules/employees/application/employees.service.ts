import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

import { SuccessResponse } from '@/common/utils/response.util';
import { ExcelLib } from '@/common/libs/excel.lib';

import { EmployeeProfilesRepository } from '../infrastructure/employees.repository';

import {
  EmployeeProfileUploadSchema,
  type EmployeeProfileUploadDto,
} from '../domain/dto/create-employee.dto';
import type { CreateUser } from '@/modules/users/domain/users.schema';

@Injectable()
export class EmployeeProfilesService {
  private readonly logger = new Logger(EmployeeProfilesService.name);

  constructor(private readonly repository: EmployeeProfilesRepository) {}

  async getEmployeesRoles(organizationId: string) {
    this.logger.log(`Fetching employee roles`);

    const roles = await this.repository.getEmployeesRoles(organizationId);

    if (!roles.departments || roles.departments.length === 0) {
      throw new NotFoundException('No roles found');
    }

    this.logger.log(`Employee roles fetched successfully`);

    return SuccessResponse.create(roles, 'Employee roles fetched successfully');
  }

  async getMonthlyMentalHealthStats(orgId: string): Promise<any> {
    const metrics = await this.repository.getMonthlyMentalHealthStats(orgId);

    if (!metrics) {
      throw new NotFoundException('No metrics found');
    }

    this.logger.log(`Dashboard metrics fetched successfully`);

    return SuccessResponse.success(
      metrics,
      'Employees dashboard metrics fetched successfully',
    );
  }

  async getYearlyMentalHealthStats(
    year: number,
    department?: string,
    orgId?: string,
  ): Promise<any> {
    try {
      const metrics = await this.repository.getYearlyMentalHealthStats(
        year,
        department,
        orgId,
      );

      if (!metrics) {
        throw new NotFoundException('No metrics found for the given year');
      }

      this.logger.log(`Yearly mental health stats fetched successfully`);

      return SuccessResponse.success(
        metrics,
        'Yearly mental health stats fetched successfully',
      );
    } catch (error) {
      this.logger.error(
        `Error fetching yearly mental health stats: ${error.message}`,
      );
      throw new NotFoundException('Yearly mental health stats not found');
    }
  }

  async createEmployeesFromExcel(buffer: Buffer, organizationId: string) {
    const validatedProfiles: EmployeeProfileUploadDto[] =
      ExcelLib.parseExcel<EmployeeProfileUploadDto>({
        buffer,
        label: 'Employee',
        keyMap: {
          nama: 'fullName',
          departemen: 'department',
          jabatan: 'position',
          jenis_kelamin: 'gender',
          tanggal_lahir: 'birthDate',
          lama_bekerja: 'yearsOfService',
          email: 'email',
        },
        schema: EmployeeProfileUploadSchema,
        valueTranslator: (row): EmployeeProfileUploadDto => {
          const userId = uuidv4();

          return {
            userId,
            fullName: row.fullName,
            email: String(row.email),
            department: row.department || '',
            position: row.position || '',
            gender: ExcelLib.translateGender(row.gender) ?? 'male',
            yearsOfService:
              row.yearsOfService !== undefined ? Number(row.yearsOfService) : 0,
            birthDate: row.birthDate
              ? typeof row.birthDate === 'number'
                ? new Date(ExcelLib.excelDateToTimestamp(row.birthDate) as any)
                : new Date(
                    ExcelLib.parseDateStringToTimestamp(row.birthDate) as any,
                  )
              : undefined,
          };
        },
      }).filter(Boolean);

    if (validatedProfiles.length === 0) {
      throw new BadRequestException('No valid employee data to import.');
    }

    const defaultPassword = await bcrypt.hash('ruangdiri0425', 10);

    const usersData: Array<CreateUser> = [];
    const profileData: Array<
      EmployeeProfileUploadDto & { screeningStatus: 'not_screened' }
    > = [];

    for (const profile of validatedProfiles) {
      usersData.push({
        id: profile.userId,
        email: profile.email,
        password: defaultPassword,
        fullName: profile.fullName,
        role: 'employee',
        organizationId,
      });

      profileData.push({
        userId: profile.userId,
        email: profile.email,
        fullName: profile.fullName,
        department: profile.department,
        position: profile.position,
        gender: profile.gender,
        yearsOfService: profile.yearsOfService,
        birthDate: profile.birthDate,
        screeningStatus: 'not_screened',
      });
    }

    try {
      if (usersData.length === 0) {
        throw new BadRequestException('No valid employees to create.');
      }

      await this.repository.bulkCreateEmployees(usersData, profileData);

      return SuccessResponse.create(
        { inserted: validatedProfiles.length },
        'Employees created successfully',
      );
    } catch (error) {
      // Handle duplicate email error
      if (error.code === '23505' && error.detail?.includes('email')) {
        const match = error.detail.match(/\(email\)=\((.*?)\)/);
        const email = match?.[1] || 'unknown';
        throw new BadRequestException(`Duplicate email: ${email}`);
      }

      console.error('Unexpected DB error:', error);
      throw new InternalServerErrorException(
        'Something went wrong during employee import.',
      );
    }
  }

  async getEmployeeById(id: string) {
    this.logger.log(`Fetching employee profile with ID: ${id}`);

    try {
      const employee = await this.repository.getEmployeeById(id);

      this.logger.log(`Employee profile fetched successfully for ID: ${id}`);

      return SuccessResponse.create(
        employee,
        'employee profile fetched successfully',
      );
    } catch (error) {
      this.logger.error(`Error fetching employee profile: ${error.message}`);
      throw new NotFoundException('employee not found');
    }
  }
}
