import { Injectable } from '@nestjs/common';
import { eq, sql, and, desc, asc } from 'drizzle-orm';

import { DrizzleService } from '@/common/drizzle/drizzle.service';
import { formatUtcInUserTimezone } from '@/common/utils/date.util';

import {
  schedules,
  usersSchedules,
  users,
  screenings,
  counselings,
  organizations,
  psychologistProfiles,
} from '@/common/database/database-schema';

import { CounselingsQueryDto } from '../domain/counselings/dto/counselings-response.dto';
import { executePagedQuery } from '@/common/utils/query-helper.util';
import { CounselingsBookingDto } from '../domain/counselings/dto/counseling-book.dto';
import {
  type IStatusAppointment,
  statusAppointment,
} from '../constants/counseling.constant';

@Injectable()
export class CounselingsRepository {
  constructor(private drizzle: DrizzleService) {}

  private get db() {
    return this.drizzle.db;
  }

  async getCounselingSchedules(
    query: CounselingsQueryDto,
    organizationId: string,
  ) {
    const { page, limit } = query;

    let whereConditions = [
      eq(schedules.type, 'counseling'),
      eq(schedules.organizationId, organizationId),
    ];

    const baseQuery = this.db
      .select({
        id: schedules.id,
        startDateTime: schedules.startDateTime,
        location: sql<string | null>`
  CASE
    WHEN ${schedules.location} = 'organization' THEN (
      SELECT ${users.address}
      FROM ${users}
      WHERE ${users.organizationId} = ${schedules.organizationId}
        AND ${users.role} = 'organization'
      LIMIT 1
    ) 
    WHEN ${schedules.location} = 'offline' THEN (
      SELECT ${psychologistProfiles.location}
      FROM ${users}
      INNER JOIN ${usersSchedules} ON ${usersSchedules.userId} = ${users.id}
      INNER JOIN ${psychologistProfiles} ON ${psychologistProfiles.userId} = ${users.id}
      WHERE ${usersSchedules.scheduleId} = ${schedules.id}
        AND ${users.role} = 'psychologist'
      LIMIT 1
    )
    ELSE 'online'
  END
`.as('location'),
        users: sql`COALESCE(
      json_agg(
        DISTINCT jsonb_build_object(
          'id', ${users.id},
          'fullName', ${users.fullName},
          'email', ${users.email},
          'role', ${users.role},
          'screening', (
            SELECT jsonb_build_object(
              'id', s.id,
              'date', s.date,
              'screeningStatus', s.screening_status
            )
            FROM ${screenings} s
            WHERE s.user_id = ${users.id}
            ORDER BY s.date DESC
            LIMIT 1
          ),
          'counselingCount', (
            SELECT COUNT(*) FROM ${counselings} c
            WHERE c.user_id = ${users.id} AND (c.status = ${statusAppointment.SCHEDULED} OR c.status = ${statusAppointment.RESCHEDULED})
          )
        )
      ) FILTER (WHERE ${users.id} IS NOT NULL),
      '[]'
    )`.as('users'),
        totalCount: sql<number>`COUNT(*) OVER()`.as('total_count'),
      })
      .from(schedules)
      .leftJoin(usersSchedules, eq(schedules.id, usersSchedules.scheduleId))
      .leftJoin(users, eq(usersSchedules.userId, users.id))
      .leftJoin(organizations, eq(organizations.id, schedules.organizationId))
      .where(and(...whereConditions))
      .orderBy(desc(schedules.createdAt))
      .groupBy(schedules.id, schedules.startDateTime, schedules.location);

    const result = await executePagedQuery(
      baseQuery.$dynamic(),
      [desc(sql`${schedules.startDateTime}`)],
      page,
      limit,
      false,
    );

    return result;
  }

  async getCounselingSchedulesByPsychologist(
    query: CounselingsQueryDto,
    psychologistId: string,
  ) {
    const { page, limit, clientType, type } = query;

    let whereConditions = [
      eq(schedules.type, 'counseling'),
      sql`EXISTS (
        SELECT 1 FROM ${usersSchedules} us_psych 
        WHERE us_psych.schedule_id = ${schedules.id} 
        AND us_psych.user_id = ${psychologistId}
      )`,
      sql`${users.id} != ${psychologistId}`,
      sql`${users.role} IN ('client', 'employee', 'student')`,
    ];

    if (type) {
      whereConditions.push(eq(schedules.location, type));
    }

    if (clientType && ['client', 'employee', 'student'].includes(clientType)) {
      whereConditions.push(
        eq(users.role, clientType as 'client' | 'employee' | 'student'),
      );
    }

    const baseQuery = this.db
      .select({
        id: schedules.id,
        startDateTime: schedules.startDateTime,
        location: schedules.location,
        users: sql`COALESCE(
        json_agg(
          jsonb_build_object(
            'id', ${users.id},
            'fullName', ${users.fullName},
            'email', ${users.email},
            'clientType', ${users.role},
            'counselingType', ${schedules.location}
          )
        ) FILTER (WHERE ${users.id} IS NOT NULL),
        '[]'
      )`.as('users'),
        totalCount: sql<number>`COUNT(*) OVER()`.as('total_count'),
      })
      .from(schedules)
      .leftJoin(usersSchedules, eq(schedules.id, usersSchedules.scheduleId))
      .leftJoin(users, eq(usersSchedules.userId, users.id))
      .where(and(...whereConditions))
      .orderBy(desc(schedules.createdAt))
      .groupBy(schedules.id, schedules.startDateTime, schedules.location);

    const result = await executePagedQuery(
      baseQuery.$dynamic(),
      [desc(sql`${schedules.startDateTime}`)],
      page,
      limit,
      false,
    );

    return result;
  }

  async bookCounseling(
    bookingDto: CounselingsBookingDto & { endDate: string },
    userId: string,
  ) {
    const result = await this.db
      .insert(counselings)
      .values({
        date: bookingDto.date,
        userId,
        endDate: bookingDto.endDate,
        originalTimezone: bookingDto.timezone,
        psychologistId: bookingDto.psychologistId,
        notes: bookingDto.notes,
      } as any)
      .returning();

    return result[0];
  }

  async getCounselingById(counselingId: string) {
    const result = await this.db
      .select()
      .from(counselings)
      .where(eq(counselings.id, counselingId))
      .limit(1);

    return result[0];
  }

  async isUserHadCounseling(
    userId: string,
  ): Promise<{ psychologistId: string } | null> {
    const previousPsychologists = await this.db
      .select({
        psychologistId: counselings.psychologistId,
      })
      .from(counselings)
      .where(and(eq(counselings.userId, userId)))
      .groupBy(counselings.psychologistId)
      .orderBy(asc(counselings.createdAt))
      .limit(1);

    return previousPsychologists[0] || null;
  }

  async updateCounselingStatus(
    counselingId: string,
    status: IStatusAppointment,
  ): Promise<void> {
    await this.db
      .update(counselings)
      .set({ status })
      .where(eq(counselings.id, counselingId));
  }

  async cancelCounseling(counselingId: string, reason?: string): Promise<void> {
    const updateData: any = {
      status: 'cancelled' as IStatusAppointment,
    };

    if (reason) {
      updateData.notes = reason;
    }

    await this.db
      .update(counselings)
      .set(updateData)
      .where(eq(counselings.id, counselingId));
  }

  async rescheduleCounseling(
    counselingId: string,
    newDate: Date,
    newEndDate: Date,
    notes?: string,
  ): Promise<void> {
    const updateData: any = {
      date: newDate,
      endDate: newEndDate,
      status: 'rescheduled' as IStatusAppointment,
    };

    if (notes) {
      updateData.notes = notes;
    }

    await this.db
      .update(counselings)
      .set(updateData)
      .where(eq(counselings.id, counselingId));
  }

  /**
   * Get user's timezone from their profile, fallback to 'Asia/Jakarta' if not found
   */
  private async getUserTimezone(userId: string): Promise<string> {
    try {
      const result = await this.db
        .select({ timezone: users.timezone })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      return result[0]?.timezone || 'Asia/Jakarta';
    } catch (error) {
      return 'Asia/Jakarta';
    }
  }
}
