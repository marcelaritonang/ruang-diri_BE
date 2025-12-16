import { Injectable } from '@nestjs/common';
import { and, eq, gte, lte, SQL } from 'drizzle-orm';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

import { DrizzleService } from '@common/drizzle/drizzle.service';
import {
  psychologistAvailability,
  psychologistProfiles,
} from '../psychologist-profile.schema';
import {
  schedules,
  usersSchedules,
} from '../../schedules/domain/schedules.schema';
import { users } from '../../users/domain/users.schema';

dayjs.extend(utc);
dayjs.extend(timezone);

export interface AvailabilitySlot {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  isBooked: boolean;
}

export interface PsychologistAvailability {
  psychologistId: string;
  hasAvailabilityOnDate: boolean;
  nextAvailableAt: string | null;
  availableSlots: AvailabilitySlot[];
}

@Injectable()
export class AvailabilityService {
  constructor(private drizzle: DrizzleService) {}

  private get db() {
    return this.drizzle.db;
  }

  async checkAvailabilityOnDate(
    psychologistId: string,
    date: string,
    timezone: string = 'Asia/Jakarta',
  ): Promise<boolean> {
    const targetDate = dayjs.tz(date, timezone);
    const dayOfWeek = targetDate.day();

    const availability = await this.db
      .select()
      .from(psychologistAvailability)
      .where(
        and(
          eq(psychologistAvailability.psychologistId, psychologistId),
          eq(psychologistAvailability.dayOfWeek, dayOfWeek as any),
        ),
      );

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

    for (const slot of availability) {
      const slotStart = targetDate
        .hour(parseInt(slot.startTime.split(':')[0]))
        .minute(parseInt(slot.startTime.split(':')[1]))
        .second(0);

      const slotEnd = targetDate
        .hour(parseInt(slot.endTime.split(':')[0]))
        .minute(parseInt(slot.endTime.split(':')[1]))
        .second(0);

      const concurrentSessions = await this.db
        .select()
        .from(schedules)
        .innerJoin(usersSchedules, eq(schedules.id, usersSchedules.scheduleId))
        .innerJoin(users, eq(usersSchedules.userId, users.id))
        .where(
          and(
            eq(users.id, psychologistId),
            eq(schedules.type, 'counseling'),
            lte(schedules.startDateTime, slotEnd.toDate()),
            gte(schedules.endDateTime, slotStart.toDate()),
          ),
        );

      if (concurrentSessions.length < maxConcurrentSessions) {
        return true;
      }
    }

    return false;
  }

  /**
   * Find next available date for psychologist
   */
  async findNextAvailableDate(
    psychologistId: string,
    fromDate: string = dayjs().format('YYYY-MM-DD'),
    maxDaysAhead: number = 30,
    timezone: string = 'Asia/Jakarta',
  ): Promise<string | null> {
    const startDate = dayjs.tz(fromDate, timezone);

    for (let i = 0; i <= maxDaysAhead; i++) {
      const checkDate = startDate.add(i, 'day');
      const dateStr = checkDate.format('YYYY-MM-DD');

      if (
        await this.checkAvailabilityOnDate(psychologistId, dateStr, timezone)
      ) {
        return checkDate.toISOString();
      }
    }

    return null;
  }

  /**
   * Get detailed availability for psychologist within date range
   */
  async getDetailedAvailability(
    psychologistId: string,
    fromDate: string,
    toDate: string,
    timezone: string = 'Asia/Jakarta',
  ): Promise<PsychologistAvailability> {
    const startDate = dayjs.tz(fromDate, timezone);
    const endDate = dayjs.tz(toDate, timezone);

    // Get psychologist's concurrent session capacity
    const psychProfile = await this.db
      .select({
        maxConcurrentSessions: psychologistProfiles.maxConcurrentSessions,
      })
      .from(psychologistProfiles)
      .where(eq(psychologistProfiles.userId, psychologistId))
      .limit(1);

    const maxConcurrentSessions = psychProfile[0]?.maxConcurrentSessions || 2;

    // Get all availability slots for this psychologist
    const availabilitySlots = await this.db
      .select()
      .from(psychologistAvailability)
      .where(eq(psychologistAvailability.psychologistId, psychologistId))
      .orderBy(
        psychologistAvailability.dayOfWeek,
        psychologistAvailability.startTime,
      );

    // Get all bookings in the date range
    const bookings = await this.db
      .select({
        startDateTime: schedules.startDateTime,
        endDateTime: schedules.endDateTime,
      })
      .from(schedules)
      .innerJoin(usersSchedules, eq(schedules.id, usersSchedules.scheduleId))
      .innerJoin(users, eq(usersSchedules.userId, users.id))
      .where(
        and(
          eq(users.id, psychologistId),
          eq(schedules.type, 'counseling'),
          gte(schedules.startDateTime, startDate.toDate()),
          lte(schedules.startDateTime, endDate.toDate()),
        ),
      );

    const processedSlots: AvailabilitySlot[] = availabilitySlots.map((slot) => {
      const concurrentSessionsCount = bookings.filter((booking) => {
        const bookingStart = dayjs(booking.startDateTime);
        const bookingEnd = dayjs(booking.endDateTime);

        const dayOfWeekNumber =
          typeof slot.dayOfWeek === 'number'
            ? slot.dayOfWeek
            : Number(slot.dayOfWeek);
        const sampleDate = startDate.day(dayOfWeekNumber);
        const slotStart = sampleDate
          .hour(parseInt(slot.startTime.split(':')[0]))
          .minute(parseInt(slot.startTime.split(':')[1]));
        const slotEnd = sampleDate
          .hour(parseInt(slot.endTime.split(':')[0]))
          .minute(parseInt(slot.endTime.split(':')[1]));

        return bookingStart.isBefore(slotEnd) && bookingEnd.isAfter(slotStart);
      }).length;

      const hasCapacity = concurrentSessionsCount < maxConcurrentSessions;

      return {
        dayOfWeek:
          typeof slot.dayOfWeek === 'number'
            ? slot.dayOfWeek
            : Number(slot.dayOfWeek),
        startTime: slot.startTime,
        endTime: slot.endTime,
        isAvailable: hasCapacity,
        isBooked: !hasCapacity,
      };
    });

    let hasAvailabilityOnDate = false;
    let currentDate = startDate;
    while (
      currentDate.isBefore(endDate) ||
      currentDate.isSame(endDate, 'day')
    ) {
      if (
        await this.checkAvailabilityOnDate(
          psychologistId,
          currentDate.format('YYYY-MM-DD'),
          timezone,
        )
      ) {
        hasAvailabilityOnDate = true;
        break;
      }
      currentDate = currentDate.add(1, 'day');
    }

    const nextAvailableAt = await this.findNextAvailableDate(
      psychologistId,
      startDate.format('YYYY-MM-DD'),
      30,
      timezone,
    );

    return {
      psychologistId,
      hasAvailabilityOnDate,
      nextAvailableAt,
      availableSlots: processedSlots,
    };
  }

  /**
   * Check if psychologist has availability for specific time slot
   */
  async checkTimeSlotAvailability(
    psychologistId: string,
    date: string,
    startTime: string,
    endTime: string,
    timezone: string = 'Asia/Jakarta',
  ): Promise<boolean> {
    const targetDate = dayjs.tz(date, timezone);
    const dayOfWeek = targetDate.day();

    // Check if psychologist has availability slot for this day of week and time range
    const availability = await this.db
      .select()
      .from(psychologistAvailability)
      .where(
        and(
          eq(psychologistAvailability.psychologistId, psychologistId),
          eq(psychologistAvailability.dayOfWeek, dayOfWeek as any),
          lte(psychologistAvailability.startTime, startTime as any),
          gte(psychologistAvailability.endTime, endTime as any),
        ),
      );

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

    // Parse the requested time slot
    const requestedStart = targetDate
      .hour(parseInt(startTime.split(':')[0]))
      .minute(parseInt(startTime.split(':')[1]))
      .second(0);

    const requestedEnd = targetDate
      .hour(parseInt(endTime.split(':')[0]))
      .minute(parseInt(endTime.split(':')[1]))
      .second(0);

    // Count concurrent sessions during the requested time slot
    const concurrentSessions = await this.db
      .select()
      .from(schedules)
      .innerJoin(usersSchedules, eq(schedules.id, usersSchedules.scheduleId))
      .innerJoin(users, eq(usersSchedules.userId, users.id))
      .where(
        and(
          eq(users.id, psychologistId),
          eq(schedules.type, 'counseling'),
          // Check for time overlap: sessions that overlap with the requested slot
          lte(schedules.startDateTime, requestedEnd.toDate()),
          gte(schedules.endDateTime, requestedStart.toDate()),
        ),
      );

    return concurrentSessions.length < maxConcurrentSessions;
  }

  /**
   * Bulk check availability for multiple psychologists on a specific date
   */
  async bulkCheckAvailability(
    psychologistIds: string[],
    date: string,
    timezone: string = 'Asia/Jakarta',
  ): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};

    const checks = psychologistIds.map(async (id) => {
      const hasAvailability = await this.checkAvailabilityOnDate(
        id,
        date,
        timezone,
      );
      return { id, hasAvailability };
    });

    const resolvedChecks = await Promise.all(checks);

    resolvedChecks.forEach(({ id, hasAvailability }) => {
      results[id] = hasAvailability;
    });

    return results;
  }
}
