import { Injectable, Logger } from '@nestjs/common';

import { IUser } from '@/modules/auth/strategies/jwt.strategy';

import { EmployeeDTO } from '../domain/dto/employee.dto';
import { PdfGeneratorService } from '../application/pdf-generator.service';
import { OrganizationsService } from '../../organizations/application/organizations.service';
import type { GetEmployeeQuery } from '../../employees/domain/employees.schema';

@Injectable()
export class PdfIntegrationService {
  private readonly logger = new Logger(PdfIntegrationService.name);

  constructor(
    private readonly pdfGeneratorService: PdfGeneratorService,
    private readonly organizationsService: OrganizationsService,
  ) {}

  async generateEmployeePeriodReport(
    currentUser: IUser,
    query: GetEmployeeQuery,
  ): Promise<Buffer> {
    try {
      this.logger.log(
        `Fetching employee data for organization: ${currentUser.organizationId}`,
      );

      const employeesResponse =
        await this.organizationsService.getEmployeesInPeriod(
          currentUser.organizationId!,
          query,
        );

      const employeeData = employeesResponse.data?.employees || [];

      if (employeeData.length === 0) {
        this.logger.warn('No employee data found for PDF generation');
      }

      const employees: EmployeeDTO[] = employeeData.map((emp: any) => ({
        name: emp.fullName || emp.name || 'N/A',
        department: emp.department || emp.position || '',
        gender: this.mapGender(emp.gender),
        age: emp.age || 'N/A',
      }));

      this.logger.log(
        `Transformed ${employees.length} employee records for PDF generation`,
      );

      let returnedStatus: string = '';

      if (query.screeningStatus === 'at_risk') {
        if (query.counselingStatus === '0') {
          returnedStatus = 'Belum Konseling';
        } else {
          returnedStatus = 'Berisiko';
        }
      } else if (query.screeningStatus === 'not_screened') {
        returnedStatus = 'Belum Screening';
      }

      return await this.pdfGeneratorService.generateRiskPdf(employees, {
        title: `DAFTAR KARYAWAN ${currentUser.fullName.toLocaleUpperCase()} \n STATUS: ${returnedStatus.toUpperCase()}`,
      });
    } catch (error) {
      this.logger.error(
        `Error generating employee period PDF report: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  //   async generateStudentPeriodReport(
  //     organizationId: string,
  //     query: GetStudentsQuery,
  //   ): Promise<Buffer> {
  //     try {
  //       this.logger.log(
  //         `Fetching student data for organization: ${organizationId}`,
  //       );

  //       // Get students from organization service
  //       const studentsResponse =
  //         await this.organizationsService.getStudentsInPeriod(
  //           organizationId,
  //           query,
  //         );

  //       const studentData = studentsResponse.data?.students || [];

  //       if (studentData.length === 0) {
  //         this.logger.warn('No student data found for PDF generation');
  //       }

  //       // Transform student profile data to EmployeeDTO format
  //       const students: EmployeeDTO[] = studentData.map((student) => ({
  //         name: student.fullName || student.name || 'N/A',
  //         department: `${student.grade || 'N/A'} - ${student.classroom || 'N/A'}`,
  //         gender: this.mapGender(student.gender),
  //         age: this.calculateAge(student.birthDate) || 0,
  //       }));

  //       this.logger.log(
  //         `Transformed ${students.length} student records for PDF generation`,
  //       );

  //       // Generate PDF with default options
  //       return await this.pdfGeneratorService.generateRiskPdf(
  //         students,
  //         '', // No logo for now
  //         {
  //           title: 'RuangDiri - Laporan Risiko Siswa',
  //           subtitle: 'Daftar Siswa Berisiko',
  //           footerText:
  //             'Jl. Bintaro Raya, RT.4/RW.10, Bintaro, Kec. Pesanggrahan, Jakarta Selatan 12330',
  //         },
  //       );
  //     } catch (error) {
  //       this.logger.error(
  //         `Error generating student period PDF report: ${error.message}`,
  //         error.stack,
  //       );
  //       throw error;
  //     }
  //   }

  private mapGender(gender: string): string {
    if (!gender) return 'N/A';

    if (gender === 'male' || gender === 'laki-laki') {
      return 'Laki-laki';
    } else if (gender === 'female' || gender === 'perempuan') {
      return 'Perempuan';
    }
    return 'N/A';
  }
}
