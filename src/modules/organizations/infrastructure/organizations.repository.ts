import {
  and,
  eq,
  asc,
  or,
  ilike,
  type SQL,
  desc,
  sql,
  inArray,
} from 'drizzle-orm';
import { Injectable } from '@nestjs/common';

import { users } from '@/modules/users/domain/users.schema';
import type { GetStudentsQuery } from '@/modules/students/domain/dto/response-student.dto';
import { studentProfiles } from '@/modules/students/domain/student.schema';
import {
  employeeProfiles,
  type GetEmployeeQuery,
} from '@/modules/employees/domain/employees.schema';
import { UsersRepository } from '@/modules/users/infrastructure/users.repository';

import { DrizzleService } from '@common/drizzle/drizzle.service';
import {
  totalCountQuery,
  executePagedQuery,
  getSortColumns,
  buildWhereConditions,
} from '@common/utils/query-helper.util';

import {
  organizations,
  type UpdateOrganizationInfo,
} from '../domain/organizations.schema';
import { counselings, screenings } from '@/common/database/database-schema';

type Transaction<T> = T extends (cb: (tx: infer U) => any) => any ? U : never;

@Injectable()
export class OrganizationsRepository {
  constructor(
    private drizzle: DrizzleService,
    private usersRepository: UsersRepository,
  ) {}

  private get db() {
    return this.drizzle.db;
  }

  async getStudents(organizationId: string, query: GetStudentsQuery) {
    let whereConditions: SQL<unknown>[] = [
      eq(users.organizationId, organizationId),
      eq(users.role, 'student'),
    ];

    const sortMapping: Record<string, SQL<unknown>[]> = {
      name: [sql`${users.fullName}`],
      nis: [sql`${studentProfiles.nis}`],
      iqScore: [sql`${studentProfiles.iqScore}`],
      default: [
        sql`
        CASE
          WHEN ${studentProfiles.classroom} = 'X' THEN 1
          WHEN ${studentProfiles.classroom} = 'XI' THEN 2
          WHEN ${studentProfiles.classroom} = 'XII' THEN 3
          ELSE 4
        END
      `,
        asc(sql`${studentProfiles.grade}`),
        asc(sql`${users.fullName}`),
      ],
    };

    const sortColumns = getSortColumns(
      sortMapping,
      query.sortBy,
      query.sortOrder,
    );

    if (query.search) {
      whereConditions.push(
        or(
          ilike(users.fullName, `%${query.search}%`),
          ilike(studentProfiles.nis, `%${query.search}%`),
        ) as SQL<string>,
      );
    }

    const genericConditions = buildWhereConditions(
      {
        gender: query.gender,
        grade: query.grade,
        classroom: query.classroom,
        screeningStatus: query.screeningStatus,
        counselingStatus:
          query.counselingStatus === '1'
            ? true
            : query.counselingStatus === '0'
              ? false
              : undefined,
      },
      {
        gender: { column: sql`${studentProfiles.gender}` },
        grade: { column: sql`${studentProfiles.grade}` },
        classroom: { column: sql`${studentProfiles.classroom}` },
        screeningStatus: { column: sql`filtered_screening.screening_status` },
        counselingStatus: {
          column: sql`filtered_counseling.has_counseling`,
          nullCheck: true,
        },
      },
    );

    whereConditions.push(...genericConditions);

    const filteredScreening = this.db
      .select({
        userId: screenings.userId,
        screeningStatus: sql`MAX(${screenings.screeningStatus})`.as(
          'screening_status',
        ),
      })
      .from(screenings)
      .groupBy(screenings.userId)
      .as('filtered_screening');

    const filteredCounseling = this.db
      .select({
        userId: counselings.userId,
        hasCounseling: sql`TRUE`.as('has_counseling'),
      })
      .from(counselings)
      .groupBy(counselings.userId)
      .as('filtered_counseling');

    const baseQuery = this.db
      .select({
        id: users.id,
        fullName: users.fullName,
        profilePicture: users.profilePicture,
        classroom: studentProfiles.classroom,
        grade: studentProfiles.grade,
        gender: studentProfiles.gender,
        nis: studentProfiles.nis,
        iqScore: studentProfiles.iqScore,
        screeningStatus: sql<
          string | null
        >`filtered_screening.screening_status`,
        hasCounseling: sql<boolean>`COALESCE(filtered_counseling.has_counseling, FALSE)`,
        totalCount: totalCountQuery,
        totalMale: sql<number>`count(*) FILTER (WHERE ${studentProfiles.gender} = 'male') OVER()`,
        totalFemale: sql<number>`count(*) FILTER (WHERE ${studentProfiles.gender} = 'female') OVER()`,
      })
      .from(users)
      .leftJoin(studentProfiles, eq(users.id, studentProfiles.userId))
      .leftJoin(filteredScreening, eq(users.id, filteredScreening.userId))
      .leftJoin(filteredCounseling, eq(users.id, filteredCounseling.userId))
      .where(and(...whereConditions))
      .groupBy(
        users.id,
        users.fullName,
        studentProfiles.classroom,
        studentProfiles.grade,
        studentProfiles.gender,
        studentProfiles.nis,
        studentProfiles.iqScore,
        filteredScreening.screeningStatus,
        filteredCounseling.hasCounseling,
      );

    return executePagedQuery(
      baseQuery.$dynamic(),
      sortColumns,
      query.page,
      query.limit,
      true,
    );
  }

  async getEmployees(organizationId: string, query: GetEmployeeQuery) {
    let whereConditions: SQL<unknown>[] = [
      eq(users.organizationId, organizationId),
      eq(users.role, 'employee'),
    ];

    const sortMapping: Record<string, SQL<unknown>[]> = {
      age: [sql`${employeeProfiles.age}`],
      name: [sql`${users.fullName}`],
      yearsOfService: [sql`${employeeProfiles.yearsOfService}`],
      default: [
        sql`CASE WHEN ${employeeProfiles.department} = 'Finance' THEN 0 ELSE 1 END`,
        desc(sql`${employeeProfiles.yearsOfService}`),
        asc(sql`${users.fullName}`),
      ],
    };

    const sortColumns = getSortColumns(
      sortMapping,
      query.sortBy,
      query.sortOrder,
    );

    if (query.search) {
      whereConditions.push(
        or(
          ilike(users.fullName, `%${query.search}%`),
          ilike(employeeProfiles.employeeId, `%${query.search}%`),
        ) as SQL<string>,
      );
    }

    const genericConditions = buildWhereConditions(
      {
        gender: query.gender,
        department: query.department,
        position: query.position,
        screeningStatus: query.screeningStatus,
        counselingStatus:
          query.counselingStatus === '1'
            ? true
            : query.counselingStatus === '0'
              ? false
              : undefined,
      },
      {
        gender: { column: sql`${employeeProfiles.gender}` },
        department: { column: sql`${employeeProfiles.department}` },
        position: { column: sql`${employeeProfiles.position}` },
        screeningStatus: { column: sql`filtered_screening.screening_status` },
        counselingStatus: {
          column: sql`filtered_counseling.has_counseling`,
          nullCheck: true,
        },
      },
    );

    whereConditions.push(...genericConditions);

    const filteredScreening = this.db
      .select()
      .from(screenings)
      .where(
        inArray(
          sql`(${screenings.userId}, ${screenings.createdAt})`,
          this.db
            .select({
              userId: screenings.userId,
              createdAt: sql`MAX(${screenings.createdAt})`.as('max_created_at'),
            })
            .from(screenings)
            .groupBy(screenings.userId),
        ),
      )
      .as('filtered_screening');

    const filteredCounseling = this.db
      .select({
        userId: counselings.userId,
        hasCounseling: sql`TRUE`.as('has_counseling'),
      })
      .from(counselings)
      .groupBy(counselings.userId)
      .as('filtered_counseling');

    const baseQuery = this.db
      .select({
        id: users.id,
        fullName: users.fullName,
        profilePicture: users.profilePicture,
        department: employeeProfiles.department,
        position: employeeProfiles.position,
        gender: employeeProfiles.gender,
        age: employeeProfiles.age,
        yearsOfService: employeeProfiles.yearsOfService,
        screeningStatus: sql<
          string | null
        >`filtered_screening.screening_status`,
        hasCounseling: sql<boolean>`COALESCE(filtered_counseling.has_counseling, FALSE)`,
        totalCount: totalCountQuery,
        totalMale: sql<number>`count(*) FILTER (WHERE ${employeeProfiles.gender} = 'male') OVER()`,
        totalFemale: sql<number>`count(*) FILTER (WHERE ${employeeProfiles.gender} = 'female') OVER()`,
      })
      .from(users)
      .leftJoin(employeeProfiles, eq(users.id, employeeProfiles.userId))
      .leftJoin(filteredScreening, eq(users.id, filteredScreening.userId))
      .leftJoin(filteredCounseling, eq(users.id, filteredCounseling.userId))
      .where(and(...whereConditions))
      .groupBy(
        users.id,
        users.fullName,
        employeeProfiles.department,
        employeeProfiles.position,
        employeeProfiles.gender,
        employeeProfiles.age,
        employeeProfiles.yearsOfService,
        filteredScreening.screeningStatus,
        filteredCounseling.hasCounseling,
      );

    return executePagedQuery(
      baseQuery.$dynamic(),
      sortColumns,
      query.page,
      query.limit,
      true,
    );
  }

  async getStudentsInPeriod(organizationId: string, query: GetStudentsQuery) {
    let whereConditions: SQL<unknown>[] = [
      eq(users.organizationId, organizationId),
      eq(users.role, 'student'),
    ];

    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (query.month && query.year) {
      const year = query.year;
      const month = query.month - 1;

      startDate = new Date(Date.UTC(year, month, 1, 0, 0, 0));
      endDate = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59));
    }

    const latestScreening = this.db
      .select({
        s_user_id: sql`DISTINCT ON (s.user_id) s.user_id`.as('s_user_id'),
        screening_status: sql`s.screening_status`.as('screening_status'),
        screening_date: sql`s.date`.as('screening_date'),
      })
      .from(sql`screenings as s`)
      .orderBy(sql`s.user_id`, sql`s.date DESC`)
      .as('latest_screening');

    const latestCounseling = this.db
      .select({
        c_user_id: sql`DISTINCT ON (c.user_id) c.user_id`.as('c_user_id'),
        counseling_date: sql`c.date`.as('counseling_date'),
      })
      .from(sql`counselings as c`)
      .where(
        startDate && endDate
          ? sql`c.date BETWEEN ${startDate} AND ${endDate}`
          : undefined,
      )
      .orderBy(sql`c.user_id`, sql`c.date DESC`)
      .as('latest_counseling');

    let postJoinConditions: SQL<unknown>[] = [];

    if (query.counselingStatus === '1') {
      postJoinConditions.push(sql`latest_counseling.c_user_id IS NOT NULL`);
    } else if (query.counselingStatus === '0') {
      postJoinConditions.push(sql`latest_counseling.c_user_id IS NULL`);
    }

    if (query.screeningStatus === 'not_screened' && startDate && endDate) {
      postJoinConditions.push(sql`
      NOT EXISTS (
        SELECT 1 FROM screenings s
        WHERE s.user_id = ${users.id}
        AND s.date BETWEEN ${startDate} AND ${endDate}
      )
    `);
    } else if (
      query.screeningStatus &&
      query.screeningStatus !== 'not_screened'
    ) {
      postJoinConditions.push(
        sql`latest_screening.s_user_id IS NOT NULL AND latest_screening.screening_status = ${query.screeningStatus}`,
      );

      if (startDate && endDate) {
        postJoinConditions.push(
          sql`latest_screening.screening_date BETWEEN ${startDate} AND ${endDate}`,
        );
      }
    }

    const baseQuery = this.db
      .select({
        id: users.id,
        fullName: users.fullName,
        profilePicture: users.profilePicture,
        classroom: studentProfiles.classroom,
        grade: studentProfiles.grade,
        gender: studentProfiles.gender,
        nis: studentProfiles.nis,
        iqScore: studentProfiles.iqScore,
        screeningStatus: sql<string | null>`latest_screening.screening_status`,
        hasCounseling: sql<boolean>`latest_counseling.c_user_id IS NOT NULL`,
        totalCount: totalCountQuery,
        totalMale: sql<number>`count(*) FILTER (WHERE ${studentProfiles.gender} = 'male') OVER()`,
        totalFemale: sql<number>`count(*) FILTER (WHERE ${studentProfiles.gender} = 'female') OVER()`,
      })
      .from(users)
      .innerJoin(studentProfiles, eq(users.id, studentProfiles.userId))
      .leftJoin(latestScreening, eq(users.id, sql`latest_screening.s_user_id`))
      .leftJoin(
        latestCounseling,
        eq(users.id, sql`latest_counseling.c_user_id`),
      )
      .where(and(...whereConditions, ...postJoinConditions))
      .groupBy(
        users.id,
        users.fullName,
        studentProfiles.classroom,
        studentProfiles.grade,
        studentProfiles.gender,
        studentProfiles.nis,
        studentProfiles.iqScore,
        sql`latest_screening.screening_status`,
        sql`latest_counseling.c_user_id`,
      );

    return executePagedQuery(
      baseQuery.$dynamic(),
      [],
      query.page,
      query.limit,
      true,
    );
  }

  async getEmployeesInPeriod(organizationId: string, query: GetEmployeeQuery) {
    let whereConditions: SQL<unknown>[] = [
      eq(users.organizationId, organizationId),
      eq(users.role, 'employee'),
    ];

    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (query.month && query.year) {
      const year = query.year;
      const month = query.month - 1;

      startDate = new Date(Date.UTC(year, month, 1, 0, 0, 0));
      endDate = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59));
    }

    const latestScreening = this.db
      .select({
        user_id: sql`DISTINCT ON (s.user_id) s.user_id`.as('user_id'),
        screening_status: sql`s.screening_status`.as('screening_status'),
        screening_date: sql`s.date`.as('screening_date'),
      })
      .from(sql`screenings as s`)
      .orderBy(sql`s.user_id`, sql`s.date DESC`)
      .as('latest_screening');

    const latestCounseling = this.db
      .select({
        c_user_id: sql`DISTINCT ON (c.user_id) c.user_id`.as('c_user_id'),
        counseling_date: sql`c.date`.as('counseling_date'),
      })
      .from(sql`counselings as c`)
      .where(
        startDate && endDate
          ? sql`c.date BETWEEN ${startDate} AND ${endDate}`
          : undefined,
      )
      .orderBy(sql`c.user_id`, sql`c.date DESC`)
      .as('latest_counseling');

    let postJoinConditions: SQL<unknown>[] = [];

    if (query.counselingStatus === '1') {
      postJoinConditions.push(sql`latest_counseling.c_user_id IS NOT NULL`);
    } else if (query.counselingStatus === '0') {
      postJoinConditions.push(sql`latest_counseling.c_user_id IS NULL`);
    }

    if (query.screeningStatus === 'not_screened' && startDate && endDate) {
      postJoinConditions.push(sql`
      NOT EXISTS (
        SELECT 1 FROM screenings s
        WHERE s.user_id = ${users.id}
        AND s.date BETWEEN ${startDate} AND ${endDate}
      )
    `);
    } else if (
      query.screeningStatus &&
      query.screeningStatus !== 'not_screened'
    ) {
      postJoinConditions.push(
        sql`latest_screening.user_id IS NOT NULL AND latest_screening.screening_status = ${query.screeningStatus}`,
      );

      if (startDate && endDate) {
        postJoinConditions.push(
          sql`latest_screening.screening_date BETWEEN ${startDate} AND ${endDate}`,
        );
      }
    }

    const baseQuery = this.db
      .select({
        id: users.id,
        fullName: users.fullName,
        profilePicture: users.profilePicture,
        department: employeeProfiles.department,
        position: employeeProfiles.position,
        gender: employeeProfiles.gender,
        age: employeeProfiles.age,
        yearsOfService: employeeProfiles.yearsOfService,
        screeningStatus: sql<string | null>`latest_screening.screening_status`,
        hasCounseling: sql<boolean>`latest_counseling.c_user_id IS NOT NULL`,
        totalCount: totalCountQuery,
        totalMale: sql<number>`count(*) FILTER (WHERE ${employeeProfiles.gender} = 'male') OVER()`,
        totalFemale: sql<number>`count(*) FILTER (WHERE ${employeeProfiles.gender} = 'female') OVER()`,
      })
      .from(users)
      .innerJoin(employeeProfiles, eq(users.id, employeeProfiles.userId))
      .leftJoin(latestScreening, eq(users.id, sql`latest_screening.user_id`))
      .leftJoin(
        latestCounseling,
        eq(users.id, sql`latest_counseling.c_user_id`),
      )
      .where(and(...whereConditions, ...postJoinConditions))
      .groupBy(
        users.id,
        users.fullName,
        employeeProfiles.department,
        employeeProfiles.position,
        employeeProfiles.gender,
        employeeProfiles.age,
        employeeProfiles.yearsOfService,
        sql`latest_screening.screening_status`,
        sql`latest_counseling.c_user_id`,
      );

    return executePagedQuery(
      baseQuery.$dynamic(),
      [],
      query.page,
      query.limit,
      true,
    );
  }

  async updateOrganization(
    tx: Transaction<typeof this.db.transaction>,
    orgId: string,
    data: UpdateOrganizationInfo,
  ) {
    await tx.update(organizations).set(data).where(eq(organizations.id, orgId));
  }

  async getOrganizationById(
    tx: Transaction<typeof this.db.transaction>,
    orgId: string,
  ) {
    return tx
      .select()
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .then((r: any) => r[0]);
  }

  async updateOrganizationInfo(
    userId: string,
    organizationData?: UpdateOrganizationInfo,
    generalData?: Record<string, any>,
  ): Promise<any> {
    return await this.db.transaction(async (tx) => {
      const user = await this.usersRepository.getUserById(tx, userId);

      return await this.usersRepository.updateUserProfile({
        userId: user.id,
        updateData: {
          details: organizationData,
          generalData,
        },
        profileTable: organizations,
        useUserId: false,
      });
    });
  }

  async getOrganizationCounselingQuotas(organizationId: string): Promise<any> {
    const result = await this.db
      .select({
        totalQuota: organizations.totalQuota,
        remainingQuota: organizations.remainingQuota,
      })
      .from(organizations)
      .where(eq(organizations.id, organizationId));

    return result.length > 0 ? result[0] : null;
  }

  async deductCounselingQuota(
    organizationId: string,
    amount: number,
  ): Promise<void> {
    await this.db
      .update(organizations)
      .set({
        remainingQuota: sql`${organizations.remainingQuota} - ${amount}`,
      })
      .where(eq(organizations.id, organizationId));
  }
}
