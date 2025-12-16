import { Injectable, Logger, BadRequestException } from '@nestjs/common';

import {
  employeeProfiles,
  type GetEmployeeQuery,
} from '@/modules/employees/domain/employees.schema';
import type { GetStudentsQuery } from '@/modules/students/domain/dto/response-student.dto';
import { UsersRepository } from '@/modules/users/infrastructure/users.repository';
import { NotificationsService } from '@/modules/notifications/application/notifications.service';
import { CloudStorageService } from '@/common/cloud-storage/cloud-storage.service';

import { ACCOUNT_NOTIF_MSG } from '@/common/constants/notif-msg.constant';

import { SuccessResponse } from '@/common/utils/response.util';

import { OrganizationsRepository } from '../infrastructure/organizations.repository';
import { UpdateOrganizationInfo } from '../domain/organizations.schema';
import { studentProfiles } from '../../students/domain/student.schema';

@Injectable()
export class OrganizationsService {
  private readonly logger = new Logger(OrganizationsService.name);

  constructor(
    private organizationsRepository: OrganizationsRepository,
    private usersRepository: UsersRepository,
    private notificationsService: NotificationsService,
    private cloudStorageService: CloudStorageService,
  ) {}

  async getStudentList(organizationId: string, query: GetStudentsQuery) {
    this.logger.log(
      `Fetching student list for organization ID: ${organizationId}`,
    );

    const students = await this.organizationsRepository.getStudents(
      organizationId,
      query,
    );

    // Generate signed URLs for profile pictures
    const studentsWithSignedUrls = await Promise.all(
      students.data.map(async (student: any) => {
        if (student.profilePicture) {
          return {
            ...student,
            profilePictureUrl: await this.cloudStorageService.getSignedUrl(
              student.profilePicture,
              { expiresIn: 60 },
            ),
          };
        }
        return student;
      }),
    );

    const response = {
      data: { students: studentsWithSignedUrls },
      metadata: students.metadata,
    };

    return SuccessResponse.success(
      response,
      'Student list fetched successfully',
    );
  }

  async getEmployeeList(organizationId: string, query: GetEmployeeQuery) {
    this.logger.log(
      `Fetching employee list for organization ID: ${organizationId}`,
    );

    const employees = await this.organizationsRepository.getEmployees(
      organizationId,
      query,
    );

    // Generate signed URLs for profile pictures
    const employeesWithSignedUrls = await Promise.all(
      employees.data.map(async (employee: any) => {
        if (employee.profilePicture) {
          return {
            ...employee,
            profilePictureUrl: await this.cloudStorageService.getSignedUrl(
              employee.profilePicture,
              { expiresIn: 60 },
            ),
          };
        }
        return employee;
      }),
    );

    const response = {
      data: { employees: employeesWithSignedUrls },
      metadata: employees.metadata,
    };

    return SuccessResponse.success(
      response,
      'Employee list fetched successfully',
    );
  }

  async updateOrganizationInfo(
    userId: string,
    organizationData?: UpdateOrganizationInfo,
    generalData?: Record<string, any>,
  ) {
    this.logger.log(`Updating organization for user ID: ${userId}`);

    this.logger.log(
      `Organization data: ${JSON.stringify(organizationData)}, General data: ${JSON.stringify(generalData)}`,
    );

    try {
      const result = await this.organizationsRepository.updateOrganizationInfo(
        userId,
        organizationData,
        generalData,
      );

      this.logger.log(
        JSON.stringify(result, null, 2),
        `Organization updated successfully for user ID: ${userId}`,
      );

      if (result) {
        await this.notificationsService.createNotification({
          title: ACCOUNT_NOTIF_MSG.CHANGED_PROFILE,
          subType: 'general',
          type: 'system',
          recipientIds: [userId],
        });

        this.logger.log(`Organization updated for user: ${userId}`);
      }

      return SuccessResponse.create(
        result,
        'Organization updated successfully',
      );
    } catch (error) {
      this.logger.error(
        `Failed to update organization for user ${userId}: ${error.message}`,
      );
      throw error;
    }
  }

  async updateStudentProfile(
    studentId: string,
    updateData: Record<string, any>,
  ) {
    this.logger.log(`Updating student profile with ID: ${studentId}`);

    try {
      const result = await this.usersRepository.updateUserProfile({
        userId: studentId,
        updateData,
        profileTable: studentProfiles,
        useUserId: true,
      });

      this.logger.log(`Student profile updated: ${studentId}`);

      return SuccessResponse.create(result, 'Student profile updated');
    } catch (error) {
      this.logger.error(
        `Failed to update student profile for ID ${studentId}: ${error.message}`,
      );

      throw new BadRequestException(
        `Failed to update student profile: ${error.message}`,
      );
    }
  }

  async updateEmployeeProfile(
    employeeId: string,
    updateData: Record<string, any>,
  ) {
    this.logger.log(`Updating employee profile with ID: ${employeeId}`);

    try {
      const result = await this.usersRepository.updateUserProfile({
        userId: employeeId,
        updateData,
        profileTable: employeeProfiles,
        useUserId: true,
      });

      this.logger.log(`Employee profile updated: ${employeeId}`);

      return SuccessResponse.create(result, 'Employee profile updated');
    } catch (error) {
      this.logger.error(
        `Failed to update employee profile for ID ${employeeId}: ${error.message}`,
      );
      throw new BadRequestException(
        `Failed to update employee profile: ${error.message}`,
      );
    }
  }

  async getStudentsInPeriod(
    organizationId: string,
    query: GetStudentsQuery,
  ): Promise<any> {
    this.logger.log(
      `Fetching students with latest screening for organization ID: ${organizationId}`,
    );

    const students = await this.organizationsRepository.getStudentsInPeriod(
      organizationId,
      query,
    );

    if (!students || students.data.length === 0) {
      return SuccessResponse.create(
        { students: [], metadata: { total: 0, page: 1, limit: 10 } },
        'No students found for the organization',
      );
    }

    const { data, metadata } = students;

    // Generate signed URLs for profile pictures
    const studentsWithSignedUrls = await Promise.all(
      data.map(async (student: any) => {
        if (student.profilePicture) {
          return {
            ...student,
            profilePictureUrl: await this.cloudStorageService.getSignedUrl(
              student.profilePicture,
              { expiresIn: 60 },
            ),
          };
        }
        return student;
      }),
    );

    return SuccessResponse.create(
      { students: studentsWithSignedUrls, metadata },
      'Students with latest screening fetched successfully',
    );
  }

  async getEmployeesInPeriod(
    organizationId: string,
    query: GetEmployeeQuery,
  ): Promise<any> {
    this.logger.log(
      `Fetching employees with latest screening for organization ID: ${organizationId}`,
    );

    const employees = await this.organizationsRepository.getEmployeesInPeriod(
      organizationId,
      query,
    );

    if (!employees || employees.data.length === 0) {
      throw new BadRequestException('No employees found for the organization');
    }

    const { data, metadata } = employees;

    // Generate signed URLs for profile pictures
    const employeesWithSignedUrls = await Promise.all(
      data.map(async (employee: any) => {
        if (employee.profilePicture) {
          return {
            ...employee,
            profilePictureUrl: await this.cloudStorageService.getSignedUrl(
              employee.profilePicture,
              { expiresIn: 60 },
            ),
          };
        }
        return employee;
      }),
    );

    return SuccessResponse.create(
      { employees: employeesWithSignedUrls, metadata },
      'Employees with latest screening fetched successfully',
    );
  }

  async deductCounselingQuota(
    organizationId: string,
    amount: number,
  ): Promise<void> {
    this.logger.log(
      `Deducting ${amount} counseling quota for organization ID: ${organizationId}`,
    );

    const currentQuota =
      await this.organizationsRepository.getOrganizationCounselingQuotas(
        organizationId,
      );

    if (currentQuota.remainingQuota < amount) {
      throw new BadRequestException(
        'Insufficient counseling quota for the organization',
      );
    }

    await this.organizationsRepository.deductCounselingQuota(
      organizationId,
      amount,
    );

    this.logger.log(
      `Successfully deducted ${amount} counseling quota for organization ID: ${organizationId}`,
    );
  }
}
