#!/usr/bin/env tsx

import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/postgres-js';
import { and, eq, gte, lte } from 'drizzle-orm';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';

// Import schemas
import { users } from '../src/modules/users/domain/users.schema';
import { psychologistProfiles } from '../src/modules/psychologists/psychologist-profile.schema';
import { psychologistAvailability } from '../src/modules/psychologists/psychologist-profile.schema';
import { daysAvailability } from '../src/modules/psychologists/constants/psychologist.constant';
import { schedules } from '../src/modules/schedules/domain/schedules.schema';
import { usersSchedules } from '../src/modules/schedules/domain/schedules.schema';

// Environment config
const env = {
  DB_HOST: process.env.DB_HOST || 'localhost',
  DB_PORT: process.env.DB_PORT || '5432',
  DB_USERNAME: process.env.DB_USERNAME || 'postgres',
  DB_PASSWORD: process.env.DB_PASSWORD || '',
  DB_NAME: process.env.DB_NAME || 'ruang_diri',
};

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

interface DiagnosticResult {
  psychologistId: string;
  fullName: string;
  targetDate: string;
  dayOfWeek: number;
  maxConcurrentSessions: number;
  requestedTimeSlot: {
    startTime: string;
    endTime: string;
  };
  availabilitySlots: Array<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  }>;
  existingBookings: Array<{
    startDateTime: Date;
    endDateTime: Date;
  }>;
  hasAvailabilityOnDay: boolean;
  currentConcurrentSessions: number;
  hasCapacityForNewSession: boolean;
  isSlotAvailable: boolean;
  debugInfo: {
    dayMapping: Record<string, any>;
    timeComparisons: Array<{
      availableSlot: string;
      requestedSlot: string;
      overlaps: boolean;
      concurrentSessions: number;
      hasCapacity: boolean;
      reason: string;
    }>;
  };
}

async function diagnosePsychologistAvailability(
  psychologistId: string,
  targetDate: string,
  requestedStartTime: string,
  requestedEndTime: string,
  timezone: string = 'Asia/Jakarta',
): Promise<DiagnosticResult> {
  const pool = new Pool({
    host: env.DB_HOST,
    port: Number(env.DB_PORT),
    user: env.DB_USERNAME,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    ssl: false,
  });

  const db = drizzle(pool, {
    schema: {
      users,
      psychologistProfiles,
      psychologistAvailability,
      schedules,
      usersSchedules,
    },
  });

  try {
    // Get psychologist details
    const psychologist = await db
      .select({
        id: users.id,
        fullName: users.fullName,
      })
      .from(users)
      .where(eq(users.id, psychologistId))
      .limit(1);

    if (psychologist.length === 0) {
      throw new Error(`Psychologist with ID ${psychologistId} not found`);
    }

    // Get psychologist's concurrent session capacity
    const psychProfile = await db
      .select({
        maxConcurrentSessions: psychologistProfiles.maxConcurrentSessions,
      })
      .from(psychologistProfiles)
      .where(eq(psychologistProfiles.userId, psychologistId))
      .limit(1);

    const maxConcurrentSessions = psychProfile[0]?.maxConcurrentSessions || 2;

    const date = dayjs.tz(targetDate, timezone);
    const dayOfWeek = date.day(); // 0 = Sunday, 1 = Monday, etc.

    // Convert to the daysAvailability format
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

    // Get all availability slots for this psychologist on this day
    const availabilitySlots = await db
      .select({
        dayOfWeek: psychologistAvailability.dayOfWeek,
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

    // Get existing bookings for this date
    const dateStart = dayjs.tz(targetDate, timezone).startOf('day').toDate();
    const dateEnd = dayjs.tz(targetDate, timezone).endOf('day').toDate();

    const existingBookings = await db
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

    // Check if requested time slot is available
    const requestedSlotStart = dayjs.tz(
      `${targetDate} ${requestedStartTime}`,
      timezone,
    );
    const requestedSlotEnd = dayjs.tz(
      `${targetDate} ${requestedEndTime}`,
      timezone,
    );

    const timeComparisons: DiagnosticResult['debugInfo']['timeComparisons'] =
      [];
    let isSlotAvailable = false;
    let currentConcurrentSessions = 0;

    for (const slot of availabilitySlots) {
      const availableSlotStart = dayjs.tz(
        `${targetDate} ${slot.startTime}`,
        timezone,
      );
      const availableSlotEnd = dayjs.tz(
        `${targetDate} ${slot.endTime}`,
        timezone,
      );

      // Check if requested slot fits within available slot
      const fitsWithinSlot =
        (requestedSlotStart.isSame(availableSlotStart) ||
          requestedSlotStart.isAfter(availableSlotStart)) &&
        (requestedSlotEnd.isSame(availableSlotEnd) ||
          requestedSlotEnd.isBefore(availableSlotEnd));

      // Count concurrent sessions during this time slot
      const concurrentSessionsCount = existingBookings.filter((booking) => {
        const bookingStart = dayjs(booking.startDateTime);
        const bookingEnd = dayjs(booking.endDateTime);

        return (
          requestedSlotStart.isBefore(bookingEnd) &&
          requestedSlotEnd.isAfter(bookingStart)
        );
      }).length;

      const hasCapacity = concurrentSessionsCount < maxConcurrentSessions;
      const slotAvailable = fitsWithinSlot && hasCapacity;

      timeComparisons.push({
        availableSlot: `${slot.startTime}-${slot.endTime}`,
        requestedSlot: `${requestedStartTime}-${requestedEndTime}`,
        overlaps: fitsWithinSlot,
        concurrentSessions: concurrentSessionsCount,
        hasCapacity,
        reason: !fitsWithinSlot
          ? 'Requested slot does not fit within available slot'
          : !hasCapacity
            ? `At capacity (${concurrentSessionsCount}/${maxConcurrentSessions})`
            : 'Available',
      });

      if (slotAvailable) {
        isSlotAvailable = true;
      }

      if (fitsWithinSlot) {
        currentConcurrentSessions = concurrentSessionsCount;
      }
    }

    const result: DiagnosticResult = {
      psychologistId,
      fullName: psychologist[0].fullName || 'Unknown',
      targetDate,
      dayOfWeek,
      maxConcurrentSessions,
      requestedTimeSlot: {
        startTime: requestedStartTime,
        endTime: requestedEndTime,
      },
      availabilitySlots: availabilitySlots.map((slot) => ({
        dayOfWeek: typeof slot.dayOfWeek === 'number' ? slot.dayOfWeek : 0,
        startTime: slot.startTime,
        endTime: slot.endTime,
      })),
      existingBookings: existingBookings.map((booking) => ({
        startDateTime: booking.startDateTime,
        endDateTime: booking.endDateTime,
      })),
      hasAvailabilityOnDay: availabilitySlots.length > 0,
      currentConcurrentSessions,
      hasCapacityForNewSession:
        currentConcurrentSessions < maxConcurrentSessions,
      isSlotAvailable,
      debugInfo: {
        dayMapping: {
          originalDayOfWeek: dayOfWeek,
          mappedDay,
          dayNames: {
            0: 'Sunday',
            1: 'Monday',
            2: 'Tuesday',
            3: 'Wednesday',
            4: 'Thursday',
            5: 'Friday',
            6: 'Saturday',
          },
        },
        timeComparisons,
      },
    };

    await pool.end();
    return result;
  } catch (error) {
    await pool.end();
    throw error;
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 4) {
    console.log(`
Usage: tsx scripts/diagnose-psychologist-availability.ts <psychologist_id> <date> <start_time> <end_time> [timezone]

Example: 
tsx scripts/diagnose-psychologist-availability.ts c1778759-1a24-4407-9c3f-ab618afe2f3c 2025-09-19 16:00:00 17:00:00 Asia/Jakarta

Arguments:
  - psychologist_id: The UUID of the psychologist
  - date: Target date in YYYY-MM-DD format
  - start_time: Start time in HH:mm:ss format  
  - end_time: End time in HH:mm:ss format
  - timezone: Optional timezone (default: Asia/Jakarta)
`);
    process.exit(1);
  }

  const [
    psychologistId,
    targetDate,
    startTime,
    endTime,
    timezone = 'Asia/Jakarta',
  ] = args;

  console.log(`🔍 Diagnosing psychologist availability...`);
  console.log(`📋 Parameters:`);
  console.log(`   - Psychologist ID: ${psychologistId}`);
  console.log(`   - Date: ${targetDate}`);
  console.log(`   - Time: ${startTime} - ${endTime}`);
  console.log(`   - Timezone: ${timezone}`);
  console.log('');

  try {
    const result = await diagnosePsychologistAvailability(
      psychologistId,
      targetDate,
      startTime,
      endTime,
      timezone,
    );

    console.log(
      `👨‍⚕️ Psychologist: ${result.fullName} (${result.psychologistId})`,
    );
    console.log(
      `📅 Target Date: ${result.targetDate} (${result.debugInfo.dayMapping.dayNames[result.dayOfWeek]})`,
    );
    console.log(
      `🕒 Requested Time: ${result.requestedTimeSlot.startTime} - ${result.requestedTimeSlot.endTime}`,
    );
    console.log(`👥 Max Concurrent Sessions: ${result.maxConcurrentSessions}`);
    console.log('');

    console.log(`📊 Day Mapping Debug:`);
    console.log(
      `   - Original Day of Week: ${result.dayOfWeek} (${result.debugInfo.dayMapping.dayNames[result.dayOfWeek]})`,
    );
    console.log(
      `   - Mapped Day Value: ${result.debugInfo.dayMapping.mappedDay}`,
    );
    console.log('');

    console.log(
      `📋 Availability Slots on ${result.debugInfo.dayMapping.dayNames[result.dayOfWeek]}:`,
    );
    if (result.availabilitySlots.length === 0) {
      console.log(`   ❌ No availability slots configured for this day`);
    } else {
      result.availabilitySlots.forEach((slot, index) => {
        console.log(
          `   ${index + 1}. ${slot.startTime} - ${slot.endTime} (Day ${slot.dayOfWeek})`,
        );
      });
    }
    console.log('');

    console.log(`📅 Existing Bookings on ${result.targetDate}:`);
    if (result.existingBookings.length === 0) {
      console.log(`   ✅ No existing bookings found`);
    } else {
      result.existingBookings.forEach((booking, index) => {
        const start = dayjs(booking.startDateTime).tz(timezone);
        const end = dayjs(booking.endDateTime).tz(timezone);
        console.log(
          `   ${index + 1}. ${start.format('HH:mm:ss')} - ${end.format('HH:mm:ss')} (${start.format('YYYY-MM-DD HH:mm:ss Z')} - ${end.format('YYYY-MM-DD HH:mm:ss Z')})`,
        );
      });
    }
    console.log('');

    console.log(`🔍 Time Slot Analysis:`);
    if (result.debugInfo.timeComparisons.length === 0) {
      console.log(`   ❌ No available slots to compare against`);
    } else {
      result.debugInfo.timeComparisons.forEach((comparison, index) => {
        const status =
          comparison.overlaps && comparison.hasCapacity ? '✅' : '❌';
        console.log(
          `   ${index + 1}. Available: ${comparison.availableSlot} vs Requested: ${comparison.requestedSlot}`,
        );
        console.log(
          `      ${status} ${comparison.reason} (${comparison.concurrentSessions}/${result.maxConcurrentSessions} sessions)`,
        );
      });
    }
    console.log('');

    console.log(`📊 Final Results:`);
    console.log(
      `   - Has Availability on Day: ${result.hasAvailabilityOnDay ? '✅ Yes' : '❌ No'}`,
    );
    console.log(
      `   - Current Concurrent Sessions: ${result.currentConcurrentSessions}/${result.maxConcurrentSessions}`,
    );
    console.log(
      `   - Has Capacity for New Session: ${result.hasCapacityForNewSession ? '✅ Yes' : '❌ No'}`,
    );
    console.log(
      `   - Is Requested Slot Available: ${result.isSlotAvailable ? '✅ Yes' : '❌ No'}`,
    );
    console.log('');

    if (!result.isSlotAvailable) {
      console.log(`💡 Recommendations:`);
      if (!result.hasAvailabilityOnDay) {
        console.log(
          `   - The psychologist has no availability slots configured for ${result.debugInfo.dayMapping.dayNames[result.dayOfWeek]}`,
        );
        console.log(
          `   - Check the psychologist_availability table for day ${result.debugInfo.dayMapping.mappedDay}`,
        );
      } else if (result.debugInfo.timeComparisons.every((c) => !c.overlaps)) {
        console.log(
          `   - The requested time slot doesn't fit within any available slots`,
        );
        console.log(
          `   - Available slots: ${result.availabilitySlots.map((s) => `${s.startTime}-${s.endTime}`).join(', ')}`,
        );
      } else if (!result.hasCapacityForNewSession) {
        console.log(
          `   - The psychologist has reached maximum concurrent sessions (${result.maxConcurrentSessions})`,
        );
        console.log(
          `   - Current concurrent sessions: ${result.currentConcurrentSessions}`,
        );
      }
    } else {
      console.log(`🎉 The requested time slot is available!`);
      console.log(
        `   - Psychologist can handle ${result.maxConcurrentSessions - result.currentConcurrentSessions} more concurrent session(s)`,
      );
    }
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

export { diagnosePsychologistAvailability };
