import * as bcrypt from 'bcryptjs';
import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

import { ExcelLib } from '@/common/libs/excel.lib';
import { SuccessResponse } from '@/common/utils/response.util';

import { StudentsRepository } from '../infrastructure/student.repository';

import {
  type StudentProfileUploadDto,
  StudentProfileUploadSchema,
} from '../domain/dto/create-student.dto';

@Injectable()
export class StudentProfilesService {
  private readonly logger = new Logger(StudentProfilesService.name);

  constructor(private readonly repository: StudentsRepository) {}

  async getStudentsAcademicInfo() {
    this.logger.log(`Fetching students academic info`);

    try {
      const students = await this.repository.getStudentsAcademicInfo();

      if (!students) {
        this.logger.warn(`No students academic info found`);
        throw new NotFoundException('Students academic info not found');
      }

      this.logger.log(`Students academic info fetched successfully`);

      return SuccessResponse.create(
        students,
        'Students academic info fetched successfully',
      );
    } catch (error) {
      this.logger.error(
        `Error fetching students academic info: ${error.message}`,
      );

      throw new NotFoundException('Students academic info not found');
    }
  }

  async getStudentById(id: string) {
    this.logger.log(`Fetching student profile for ID: ${id}`);

    try {
      const student = await this.repository.getStudentById(id);

      this.logger.log(`Student profile fetched successfully for ID: ${id}`);

      return SuccessResponse.create(
        student,
        'Student profile fetched successfully',
      );
    } catch (error) {
      this.logger.error(`Error fetching student profile: ${error.message}`);
      throw new NotFoundException('Student not found');
    }
  }

  async getMonthlyMentalHealthStats(): Promise<any> {
    const metrics = await this.repository.getMonthlyMentalHealthStats();

    if (!metrics) {
      throw new NotFoundException('No metrics found');
    }

    this.logger.log(`Dashboard metrics fetched successfully`);

    return SuccessResponse.success(
      metrics,
      'Dashboard metrics fetched successfully',
    );
  }

  async getYearlyMentalHealthStats(
    year: number,
    grade: string,
    classroom: string,
  ): Promise<any> {
    try {
      const metrics = await this.repository.getYearlyMentalHealthStats(
        year,
        grade,
        classroom,
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

  async createStudentsFromExcel(buffer: Buffer, organizationId: string) {
    const validatedProfiles = ExcelLib.parseExcel<StudentProfileUploadDto>({
      buffer,
      label: 'Student',
      keyMap: {
        nama: 'full_name',
        tingkat: 'grade',
        kelas: 'classroom',
        jenis_kelamin: 'gender',
        tanggal_lahir: 'birth_date',
        nis: 'nis',
        skrining: 'screening_status',
        konseling: 'counseling_status',
        skor_iq: 'iq_score',
        kategori: 'iq_category',
        kontak_wali: 'guardian_name',
        no_kontak_wali: 'guardian_contact',
      },
      schema: StudentProfileUploadSchema,
      valueTranslator: (row) => {
        const hasValues = Object.values(row).some(
          (val) =>
            val !== null && val !== undefined && String(val).trim() !== '',
        );

        if (!hasValues) {
          return null;
        }

        const iqCategoryMap = {
          'Sangat Di Bawah Rata-rata': 'very_below_average',
          'Di Bawah Rata-rata': 'below_average',
          'Rata-rata': 'average',
          'Di Atas Rata-rata': 'above_average',
          'Sangat Di Atas Rata-rata': 'very_above_average',
        };

        return {
          full_name: row.full_name || '',
          nis: row.nis !== null && row.nis !== undefined ? String(row.nis) : '',
          gender: ExcelLib.translateGender(row.gender) || 'male',
          grade: row.grade || undefined,
          classroom: row.classroom !== null ? String(row.classroom) : undefined,
          screening_status: ExcelLib.translateScreeningStatus(
            row.screening_status,
          ),
          counseling_status: ExcelLib.translateCounselingStatus(
            row.counseling_status,
          ),
          iq_score: row.iq_score !== null ? Number(row.iq_score) : undefined,
          guardian_name: row.guardian_name || undefined,
          guardian_contact:
            row.guardian_contact !== null
              ? String(row.guardian_contact)
              : undefined,
          birth_date:
            row.birth_date !== null && typeof row.birth_date === 'number'
              ? ExcelLib.excelDateToTimestamp(row.birth_date)
              : row.birth_date !== null
                ? String(row.birth_date)
                : undefined,
          iq_category: row.iq_category
            ? iqCategoryMap[row.iq_category] || row.iq_category
            : undefined,
        };
      },
    }).filter(Boolean);

    const defaultPassword = await bcrypt.hash('ruangdiri0425', 10);
    const usersData: Array<any> = [];
    const profileData: Array<any> = [];

    for (const profile of validatedProfiles) {
      const userId = uuidv4();
      const email = `${profile.nis}@school.edu`.toLowerCase();

      usersData.push({
        id: userId,
        email,
        password: defaultPassword,
        fullName: profile.full_name,
        role: 'student',
        organizationId,
      });

      profileData.push({
        userId,
        nis: profile.nis,
        grade: profile.grade,
        classroom: profile.classroom,
        gender: profile.gender,
        screeningStatus: profile.screening_status ?? 'not_screened',
        counselingStatus: profile.counseling_status ?? false,
        iqScore: profile.iq_score ?? null,
        guardianName: profile.guardian_name,
        guardianContact: profile.guardian_contact,
        birthDate: profile.birth_date,
        birthPlace: profile.birth_place,
        iqCategory: profile.iq_category ?? null,
      });
    }

    await this.repository.bulkCreateStudents(usersData, profileData);

    return SuccessResponse.create(
      { inserted: validatedProfiles.length },
      'Students created successfully',
    );
  }
}
