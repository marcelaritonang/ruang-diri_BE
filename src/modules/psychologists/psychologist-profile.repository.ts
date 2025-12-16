import { Injectable } from '@nestjs/common';
import {
  and,
  eq,
  ilike,
  or,
  SQL,
  gte,
  lte,
  inArray,
  isNotNull,
  desc,
  asc,
  isNull,
  sql,
  exists,
  notExists,
  lt,
  gt,
} from 'drizzle-orm';
import dayjs from 'dayjs';

import { DrizzleService } from '@common/drizzle/drizzle.service';
import {
  executePagedQuery,
  totalCountQuery,
} from '@/common/utils/query-helper.util';
import type { IPagination } from '@/common/types/metadata.type';

import {
  psychologistProfiles,
  psychologistAvailability,
} from './psychologist-profile.schema';

import { PsychologistQuerySchema } from './interfaces/http/queries/psychologist.query';
import { daysAvailability } from './constants/psychologist.constant';

import { users } from '../users/domain/users.schema';
import {
  usersSchedules,
  schedules,
} from '../schedules/domain/schedules.schema';
import { toDateOnly } from '@/common/utils/date.util';

export interface EnhancedPsychologist {
  id: string;
  fullName: string | null;
  email: string;
  profilePicture: string | null;
  specialization: string | null;
  yearsOfExperience: number | null;
  bio: string | null;
  location: string | null;
  address: string | null;
  sippNumber: string | null;
  registrationNumber: string | null;
  licenseValidUntil: Date | null;
  practiceStartDate: Date | null;
  pricePerSession: number | null;
  counselingMethod: unknown;
  fieldOfExpertise: unknown;
  isExternal: boolean | null;
  primarySpecialty: string;
  isActive: boolean;
  yearsOfPractice: number;
  sessionTypes: string[];
  avatar: string | null;
  hasAvailability: boolean;
  nextAvailableAt: string | null;
}

@Injectable()
export class PsychologistRepository {
  constructor(private drizzle: DrizzleService) {}

  private get db() {
    return this.drizzle.db;
  }

  async getLocations(): Promise<
    { location: string | null; address: string | null }[]
  > {
    const result = await this.db
      .select({
        location: psychologistProfiles.location,
        address: psychologistProfiles.address,
      })
      .from(psychologistProfiles)
      .groupBy(psychologistProfiles.location, psychologistProfiles.address)
      .orderBy(psychologistProfiles.location, psychologistProfiles.address);

    return result;
  }

  async getPsychologists(
    query: PsychologistQuerySchema,
  ): Promise<{ data: EnhancedPsychologist[]; metadata: IPagination }> {
    const {
      limit,
      page,
      search,
      location,
      date,
      specialty_ids,
      specialization,
      years_min,
      session_type,
      dayOfWeek,
      startTime,
      endTime,
      sort,
    } = query;

    const TZ_OFFSET = '+07:00';

    const today = new Date();
    const requestedDateISO = date || toDateOnly(today.toISOString());

    const requestedDOW =
      typeof dayOfWeek === 'number'
        ? dayOfWeek
        : new Date(`${requestedDateISO}T12:00:00${TZ_OFFSET}`).getUTCDay();

    const startLocal =
      startTime && startTime.length === 5 ? `${startTime}:00` : startTime;
    const endLocal =
      endTime && endTime.length === 5 ? `${endTime}:00` : endTime;

    const startTs = startLocal
      ? new Date(`${requestedDateISO}T${startLocal}${TZ_OFFSET}`)
      : (undefined as any);
    const endTs = endLocal
      ? new Date(`${requestedDateISO}T${endLocal}${TZ_OFFSET}`)
      : (undefined as any);

    const whereConditions: SQL<unknown>[] = [
      eq(users.role, 'psychologist'),
      eq(users.isActive, true),
      or(
        gte(psychologistProfiles.licenseValidUntil, sql`current_date`),
        isNull(psychologistProfiles.licenseValidUntil),
      ) as SQL<unknown>,
    ];

    if (search) {
      whereConditions.push(
        or(
          ilike(users.fullName, `%${search}%`),
          ilike(users.email, `%${search}%`),
        ) as SQL<unknown>,
      );
    }

    if (location) {
      whereConditions.push(
        ilike(psychologistProfiles.location, `%${location}%`) as SQL<unknown>,
      );
    }

    if (specialization) {
      whereConditions.push(
        ilike(
          psychologistProfiles.specialization,
          `%${specialization}%`,
        ) as SQL<unknown>,
      );
    }

    if (years_min) {
      whereConditions.push(
        gte(psychologistProfiles.yearsOfExperience, years_min) as SQL<unknown>,
      );
    }

    if (specialty_ids && specialty_ids.length > 0) {
      const specialtyConditions = specialty_ids.map(
        (sid) => sql`${psychologistProfiles.fieldOfExpertise} ? ${sid}`,
      );
      whereConditions.push(or(...specialtyConditions) as SQL<unknown>);
    }

    if (session_type) {
      whereConditions.push(
        sql`${psychologistProfiles.counselingMethod} ? ${session_type}` as SQL<unknown>,
      );
    }

    if (startLocal && endLocal) {
      whereConditions.push(
        exists(
          this.db
            .select({ one: sql`1` })
            .from(psychologistAvailability)
            .where(
              and(
                eq(psychologistAvailability.psychologistId, users.id),
                eq(psychologistAvailability.dayOfWeek, requestedDOW as any),
                lte(psychologistAvailability.startTime, startLocal as any),
                gte(psychologistAvailability.endTime, endLocal as any),
              ),
            ),
        ) as SQL<unknown>,
      );

      whereConditions.push(
        notExists(
          this.db
            .select({ one: sql`1` })
            .from(usersSchedules)
            .innerJoin(schedules, eq(usersSchedules.scheduleId, schedules.id))
            .where(
              and(
                eq(usersSchedules.userId, users.id),
                eq(schedules.type, 'counseling'),
                lt(schedules.startDateTime, endTs),
                gt(schedules.endDateTime, startTs),
              ),
            ),
        ) as SQL<unknown>,
      );
    }

    const baseQuery = this.db
      .select({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        profilePicture: users.profilePicture,
        specialization: psychologistProfiles.specialization,
        yearsOfExperience: psychologistProfiles.yearsOfExperience,
        bio: psychologistProfiles.bio,
        location: psychologistProfiles.location,
        address: psychologistProfiles.address,
        sippNumber: psychologistProfiles.sippNumber,
        registrationNumber: psychologistProfiles.registrationNumber,
        licenseValidUntil: psychologistProfiles.licenseValidUntil,
        practiceStartDate: psychologistProfiles.practiceStartDate,
        pricePerSession: psychologistProfiles.pricePerSession,
        counselingMethod: psychologistProfiles.counselingMethod,
        fieldOfExpertise: psychologistProfiles.fieldOfExpertise,
        isExternal: psychologistProfiles.isExternal,
        totalCount: totalCountQuery,
      })
      .from(users)
      .leftJoin(psychologistProfiles, eq(users.id, psychologistProfiles.userId))
      .leftJoin(
        psychologistAvailability,
        eq(users.id, psychologistAvailability.psychologistId),
      )
      .where(and(...whereConditions))
      .groupBy(users.id, psychologistProfiles.userId);

    const orderByClause =
      sort === 'experience'
        ? [desc(psychologistProfiles.yearsOfExperience), users.fullName]
        : sort === 'price'
          ? [asc(psychologistProfiles.pricePerSession), users.fullName]
          : [users.fullName];

    const result = await executePagedQuery(
      baseQuery.orderBy(...orderByClause).$dynamic(),
      [],
      page,
      limit,
      false,
    );

    // Batch check availability for all psychologists to avoid 6000+ individual queries
    const availabilityMap = date
      ? await this.batchCheckAvailabilityForDate(
          result.data.map((row: any) => row.id),
          requestedDateISO,
        )
      : new Map<string, boolean>();

    let enhancedData = result.data.map((row: any) => {
      const hasAvailability = date
        ? (availabilityMap.get(row.id) ?? false)
        : true;

      return {
        ...row,
        primarySpecialty: this.getPrimarySpecialty(
          row.fieldOfExpertise,
          row.specialization,
        ),
        isActive: this.computeActiveStatus(row.licenseValidUntil),
        yearsOfPractice: this.computeYearsOfPractice(
          row.practiceStartDate,
          row.yearsOfExperience,
        ),
        sessionTypes: this.extractSessionTypes(row.counselingMethod),
        avatar: row.profilePicture,
        hasAvailability,
        nextAvailableAt: null, // Removed expensive getNextAvailableDate call for performance
      } as EnhancedPsychologist;
    });

    if (date) {
      enhancedData = enhancedData.filter((p) => p.hasAvailability);
    }

    return {
      data: enhancedData,
      metadata: {
        ...result.metadata,
        totalData: date ? enhancedData.length : result.metadata.totalData,
      },
    };
  }

  async getPsychologistById(id: string): Promise<any> {
    const result = await this.db
      .select({
        id: users.id,
        email: users.email,
        profilePicture: users.profilePicture,
        fullName: users.fullName,
        role: users.role,
        location: psychologistProfiles.location,
      })
      .from(users)
      .leftJoin(psychologistProfiles, eq(users.id, psychologistProfiles.userId))
      .where(eq(users.id, id))
      .limit(1);

    return result[0];
  }

  async getAllPsychologistAvailability() {
    const result = await this.db
      .selectDistinct({
        dayOfWeek: psychologistAvailability.dayOfWeek,
        startTime: psychologistAvailability.startTime,
        endTime: psychologistAvailability.endTime,
        timezone: sql`coalesce(${users.timezone}, 'Asia/Jakarta')`.as(
          'timezone',
        ),
        psychologist: {
          id: users.id,
          fullName: users.fullName,
        },
      })
      .from(psychologistAvailability)
      .innerJoin(users, eq(psychologistAvailability.psychologistId, users.id))
      .innerJoin(
        psychologistProfiles,
        eq(users.id, psychologistProfiles.userId),
      )
      .where(
        and(
          eq(users.role, 'psychologist'),
          // Only include active psychologists with valid licenses
          sql`${psychologistProfiles.licenseValidUntil} IS NULL OR ${psychologistProfiles.licenseValidUntil} > NOW()`,
        ),
      )
      .orderBy(
        psychologistAvailability.dayOfWeek,
        psychologistAvailability.startTime,
        psychologistAvailability.endTime,
      );

    return result;
  }

  async getPsychologistScheduledSessions(psychologistId?: string) {
    const fromUtc = dayjs().utc().startOf('day').toDate();
    const toUtc = dayjs().utc().add(4, 'weeks').endOf('day').toDate();

    const whereParts: SQL<unknown>[] = [
      eq(users.role, 'psychologist'),
      eq(schedules.type, 'counseling'),
      lt(schedules.startDateTime, toUtc), // start < window_end
      gt(schedules.endDateTime, fromUtc), // end   > window_start
    ];

    if (psychologistId) {
      whereParts.push(eq(users.id, psychologistId));
    }

    return await this.db
      .select({
        psychologistId: users.id,
        psychologistName: users.fullName,
        startDateTime: schedules.startDateTime, // timestamptz UTC
        endDateTime: schedules.endDateTime, // timestamptz UTC
      })
      .from(usersSchedules)
      .innerJoin(users, eq(usersSchedules.userId, users.id))
      .innerJoin(schedules, eq(usersSchedules.scheduleId, schedules.id))
      .where(and(...whereParts))
      .orderBy(schedules.startDateTime);
  }

  async getPsychologistAvailabilityWithSchedules(psychologistId?: string) {
    const today = dayjs().startOf('day').toDate();
    const fourWeeksAhead = dayjs().add(4, 'weeks').endOf('day').toDate();

    let availabilityWhereConditions: SQL<unknown>[] = [];
    let scheduleWhereConditions = [
      eq(users.role, 'psychologist'),
      eq(schedules.type, 'counseling'),
      gte(schedules.startDateTime, today),
      lte(schedules.startDateTime, fourWeeksAhead),
    ];

    if (psychologistId) {
      availabilityWhereConditions.push(
        eq(psychologistAvailability.psychologistId, psychologistId),
      );
      scheduleWhereConditions.push(eq(users.id, psychologistId));
    }

    const [availability, scheduledSessions] = await Promise.all([
      this.db
        .select({
          psychologistId: psychologistAvailability.psychologistId,
          dayOfWeek: psychologistAvailability.dayOfWeek,
          startTime: psychologistAvailability.startTime,
          endTime: psychologistAvailability.endTime,
          psychologist: {
            id: users.id,
            fullName: users.fullName,
          },
        })
        .from(psychologistAvailability)
        .leftJoin(users, eq(psychologistAvailability.psychologistId, users.id))
        .where(
          availabilityWhereConditions.length > 0
            ? and(...availabilityWhereConditions)
            : undefined,
        )
        .orderBy(
          psychologistAvailability.psychologistId,
          psychologistAvailability.dayOfWeek,
          psychologistAvailability.startTime,
        ),
      this.db
        .select({
          psychologistId: users.id,
          startDateTime: schedules.startDateTime,
          endDateTime: schedules.endDateTime,
        })
        .from(usersSchedules)
        .innerJoin(users, eq(usersSchedules.userId, users.id))
        .innerJoin(schedules, eq(usersSchedules.scheduleId, schedules.id))
        .where(and(...scheduleWhereConditions))
        .orderBy(schedules.startDateTime),
    ]);

    return {
      availability,
      scheduledSessions,
    };
  }

  private getPrimarySpecialty(
    fieldOfExpertise: unknown,
    specialization: string | null,
  ): string {
    if (Array.isArray(fieldOfExpertise) && fieldOfExpertise.length > 0) {
      return fieldOfExpertise[0];
    }

    if (specialization) {
      return specialization;
    }

    return 'Psikolog Umum';
  }

  private computeActiveStatus(licenseValidUntil: Date | null): boolean {
    if (!licenseValidUntil) {
      return true;
    }

    return dayjs(licenseValidUntil).isAfter(dayjs());
  }

  private computeYearsOfPractice(
    practiceStartDate: Date | null,
    yearsOfExperience: number | null,
  ): number {
    if (practiceStartDate) {
      return dayjs().diff(dayjs(practiceStartDate), 'year');
    }

    return yearsOfExperience || 0;
  }

  private extractSessionTypes(counselingMethod: unknown): string[] {
    try {
      if (Array.isArray(counselingMethod)) {
        return counselingMethod;
      }

      if (typeof counselingMethod === 'string') {
        return JSON.parse(counselingMethod);
      }

      return ['online', 'offline', 'chat'];
    } catch {
      return ['online', 'offline', 'chat'];
    }
  }

  /**
   * Efficiently batch check availability for multiple psychologists
   * to avoid the 6000+ individual query issue
   */
  private async batchCheckAvailabilityForDate(
    psychologistIds: string[],
    targetDate: string,
  ): Promise<Map<string, boolean>> {
    const availabilityMap = new Map<string, boolean>();

    if (!targetDate || psychologistIds.length === 0) {
      psychologistIds.forEach((id) => availabilityMap.set(id, false));
      return availabilityMap;
    }

    try {
      const date = dayjs(targetDate);
      const dayOfWeek = date.day();

      const dayMap = {
        0: daysAvailability.sunday,
        1: daysAvailability.monday,
        2: daysAvailability.tuesday,
        3: daysAvailability.wednesday,
        4: daysAvailability.thursday,
        5: daysAvailability.friday,
        6: daysAvailability.saturday,
      };

      const mappedDay = dayMap[dayOfWeek as keyof typeof dayMap];

      const availabilitySlots = await this.db
        .select({
          psychologistId: psychologistAvailability.psychologistId,
          startTime: psychologistAvailability.startTime,
          endTime: psychologistAvailability.endTime,
        })
        .from(psychologistAvailability)
        .where(
          and(
            inArray(psychologistAvailability.psychologistId, psychologistIds),
            eq(psychologistAvailability.dayOfWeek, mappedDay as any),
          ),
        );

      const dateStart = dayjs(targetDate).startOf('day').toDate();
      const dateEnd = dayjs(targetDate).endOf('day').toDate();

      const existingBookings = await this.db
        .select({
          userId: usersSchedules.userId,
          startDateTime: schedules.startDateTime,
          endDateTime: schedules.endDateTime,
        })
        .from(usersSchedules)
        .innerJoin(schedules, eq(usersSchedules.scheduleId, schedules.id))
        .where(
          and(
            inArray(usersSchedules.userId, psychologistIds),
            eq(schedules.type, 'counseling'),
            gte(schedules.startDateTime, dateStart),
            lte(schedules.startDateTime, dateEnd),
          ),
        );

      const psychProfiles = await this.db
        .select({
          userId: psychologistProfiles.userId,
          maxConcurrentSessions: psychologistProfiles.maxConcurrentSessions,
        })
        .from(psychologistProfiles)
        .where(inArray(psychologistProfiles.userId, psychologistIds));

      const maxSessionsMap = new Map<string, number>();
      psychProfiles.forEach((profile) => {
        maxSessionsMap.set(profile.userId, profile.maxConcurrentSessions || 2);
      });

      psychologistIds.forEach((psychologistId) => {
        const psychSlots = availabilitySlots.filter(
          (slot) => slot.psychologistId === psychologistId,
        );

        if (psychSlots.length === 0) {
          availabilityMap.set(psychologistId, false);
          return;
        }

        const psychBookings = existingBookings.filter(
          (booking) => booking.userId === psychologistId,
        );
        const maxSessions = maxSessionsMap.get(psychologistId) || 2;

        const hasAvailableSlot = psychSlots.some((slot) => {
          const slotStart = dayjs(
            `${targetDate}T${slot.startTime}+07:00`,
          ).toDate();
          const slotEnd = dayjs(`${targetDate}T${slot.endTime}+07:00`).toDate();

          const concurrentCount = psychBookings.filter((booking) => {
            const bookingStart = new Date(booking.startDateTime);
            const bookingEnd = new Date(booking.endDateTime);
            return slotStart < bookingEnd && slotEnd > bookingStart;
          }).length;

          return concurrentCount < maxSessions;
        });

        availabilityMap.set(psychologistId, hasAvailableSlot);
      });

      return availabilityMap;
    } catch (error) {
      psychologistIds.forEach((id) => availabilityMap.set(id, false));
      return availabilityMap;
    }
  }

  private async checkAvailabilityForDate(
    psychologistId: string,
    targetDate?: string,
  ): Promise<boolean> {
    if (!targetDate) {
      return true;
    }

    try {
      const date = dayjs(targetDate);
      const dayOfWeek = date.day();

      const dayMap = {
        0: daysAvailability.sunday,
        1: daysAvailability.monday,
        2: daysAvailability.tuesday,
        3: daysAvailability.wednesday,
        4: daysAvailability.thursday,
        5: daysAvailability.friday,
        6: daysAvailability.saturday,
      };

      const mappedDay = dayMap[dayOfWeek as keyof typeof dayMap];

      const availability = await this.db
        .select()
        .from(psychologistAvailability)
        .where(
          and(
            eq(psychologistAvailability.psychologistId, psychologistId),
            eq(psychologistAvailability.dayOfWeek, mappedDay as any),
          ),
        )
        .limit(1);

      if (availability.length === 0) {
        return false;
      }

      const psychProfile = await this.db
        .select({
          maxConcurrentSessions: psychologistProfiles.maxConcurrentSessions,
        })
        .from(psychologistProfiles)
        .where(eq(psychologistProfiles.userId, psychologistId))
        .limit(1);

      const maxConcurrentSessions = psychProfile[0]?.maxConcurrentSessions || 2;

      const dateStart = dayjs(targetDate).startOf('day').toDate();
      const dateEnd = dayjs(targetDate).endOf('day').toDate();

      const existingBookings = await this.db
        .select({
          startDateTime: schedules.startDateTime,
          endDateTime: schedules.endDateTime,
        })
        .from(usersSchedules)
        .innerJoin(schedules, eq(usersSchedules.scheduleId, schedules.id))
        .where(
          and(
            eq(usersSchedules.userId, psychologistId),
            eq(schedules.type, 'counseling'),
            gte(schedules.startDateTime, dateStart),
            lte(schedules.startDateTime, dateEnd),
          ),
        );

      const daySlots = await this.db
        .select({
          startTime: psychologistAvailability.startTime,
          endTime: psychologistAvailability.endTime,
        })
        .from(psychologistAvailability)
        .where(
          and(
            eq(psychologistAvailability.psychologistId, psychologistId),
            eq(psychologistAvailability.dayOfWeek, mappedDay as any),
          ),
        );

      const hasAvailableSlot = daySlots.some((slot) => {
        const slotStart = dayjs(
          `${targetDate}T${slot.startTime}+07:00`,
        ).toDate();
        const slotEnd = dayjs(`${targetDate}T${slot.endTime}+07:00`).toDate();

        const concurrentSessionsCount = existingBookings.filter((booking) => {
          const bookingStart = new Date(booking.startDateTime);
          const bookingEnd = new Date(booking.endDateTime);

          return slotStart < bookingEnd && slotEnd > bookingStart;
        }).length;

        const isAvailable = concurrentSessionsCount < maxConcurrentSessions;
        return isAvailable;
      });

      return hasAvailableSlot;
    } catch {
      return true;
    }
  }

  private async getNextAvailableDate(
    psychologistId: string,
  ): Promise<string | null> {
    try {
      const availabilitySlots = await this.db
        .select({
          dayOfWeek: psychologistAvailability.dayOfWeek,
        })
        .from(psychologistAvailability)
        .where(eq(psychologistAvailability.psychologistId, psychologistId))
        .groupBy(psychologistAvailability.dayOfWeek);

      if (availabilitySlots.length === 0) {
        return null;
      }

      const today = dayjs();
      const availableDayNumbers = availabilitySlots.map((slot) => {
        const dayValue = slot.dayOfWeek;
        return typeof dayValue === 'number' ? dayValue : 0;
      });

      for (let i = 0; i < 30; i++) {
        const checkDate = today.add(i, 'day');
        const dayOfWeek = checkDate.day();

        if (availableDayNumbers.includes(dayOfWeek)) {
          const hasAvailability = await this.checkAvailabilityForDate(
            psychologistId,
            checkDate.format('YYYY-MM-DD'),
          );

          if (hasAvailability) {
            return checkDate.format('YYYY-MM-DD HH:mm');
          }
        }
      }

      return null;
    } catch {
      return null;
    }
  }
}
