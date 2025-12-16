import { InferInsertModel, eq } from 'drizzle-orm';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { v4 as uuidV4 } from 'uuid';

import { env } from '@/config/env.config';
import { users } from '@/modules/users/domain/users.schema';
import {
  psychologistProfiles,
  psychologistAvailability,
} from '@/modules/psychologists/psychologist-profile.schema';
import { daysAvailability } from '@/modules/psychologists/constants/psychologist.constant';

if (env.NODE_ENV !== 'production') {
  const dotenv = require('dotenv');
  dotenv.config({
    path: `${process.cwd()}/.env.${env.NODE_ENV ?? 'development'}`,
  });
}

// Toggle this based on your availability column types
// true means start_time and end_time are TIMESTAMP or TIMESTAMPTZ
// false means they are TIME
const AVAIL_USES_TIMESTAMP = false;

// Helpers to format time value
const TZ_OFFSET = '+07:00';
const toPgTime = (hhmm: string) => `${hhmm}:00`;
const toDateTime = (hhmm: string) =>
  new Date(`1970-01-01T${hhmm}:00${TZ_OFFSET}`);

interface AvailabilitySlot {
  day: (typeof daysAvailability)[keyof typeof daysAvailability];
  start: string;
  end: string;
}

// New availability slots to add (16:00-17:00 and 17:00-18:00)
const newAvailabilitySlots: AvailabilitySlot[] = [
  { day: daysAvailability.monday, start: '16:00', end: '17:00' },
  { day: daysAvailability.monday, start: '17:00', end: '18:00' },
  { day: daysAvailability.tuesday, start: '16:00', end: '17:00' },
  { day: daysAvailability.tuesday, start: '17:00', end: '18:00' },
  { day: daysAvailability.wednesday, start: '16:00', end: '17:00' },
  { day: daysAvailability.wednesday, start: '17:00', end: '18:00' },
  { day: daysAvailability.thursday, start: '16:00', end: '17:00' },
  { day: daysAvailability.thursday, start: '17:00', end: '18:00' },
  { day: daysAvailability.friday, start: '16:00', end: '17:00' },
  { day: daysAvailability.friday, start: '17:00', end: '18:00' },
];

async function main() {
  console.log(
    '🔄 Adding new availability slots (16:00-17:00 and 17:00-18:00) to a random psychologist...',
  );

  const pool = new Pool({
    host: env.DB_HOST,
    port: Number(env.DB_PORT),
    user: env.DB_USERNAME,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    ssl: false,
  });

  const db = drizzle(pool, {
    schema: { users, psychologistProfiles, psychologistAvailability },
  });

  try {
    // Get all existing psychologists with availability
    const existingPsychologists = await db
      .select({
        userId: users.id,
        email: users.email,
        fullName: users.fullName,
        specialization: psychologistProfiles.specialization,
        isExternal: psychologistProfiles.isExternal,
      })
      .from(users)
      .innerJoin(
        psychologistProfiles,
        eq(users.id, psychologistProfiles.userId),
      )
      .where(eq(users.role, 'psychologist'));

    if (existingPsychologists.length === 0) {
      console.log('❌ No existing psychologists found in database');
      return;
    }

    console.log(
      `✅ Found ${existingPsychologists.length} existing psychologists:`,
    );
    existingPsychologists.forEach((psych, index) => {
      console.log(
        `   ${index + 1}. ${psych.fullName} (${psych.email}) - ${psych.specialization}`,
      );
    });

    // Check which psychologists already have availability
    const existingAvailability = await db
      .select({
        psychologistId: psychologistAvailability.psychologistId,
      })
      .from(psychologistAvailability);

    const withAvailability = new Set(
      existingAvailability.map((a) => a.psychologistId),
    );

    const psychologistsWithAvailability = existingPsychologists.filter(
      (psych) => withAvailability.has(psych.userId),
    );

    if (psychologistsWithAvailability.length === 0) {
      console.log(
        '❌ No psychologists with existing availability found. Please run the main availability seeder first.',
      );
      return;
    }

    // Select a random psychologist from those with availability
    const randomIndex = Math.floor(
      Math.random() * psychologistsWithAvailability.length,
    );
    const selectedPsychologist = psychologistsWithAvailability[randomIndex];

    console.log(
      `\n🎯 Selected random psychologist: ${selectedPsychologist.fullName} (${selectedPsychologist.email})`,
    );

    // Check if the psychologist already has availability at these times
    const existingTimes = await db
      .select({
        dayOfWeek: psychologistAvailability.dayOfWeek,
        startTime: psychologistAvailability.startTime,
        endTime: psychologistAvailability.endTime,
      })
      .from(psychologistAvailability)
      .where(
        eq(
          psychologistAvailability.psychologistId,
          selectedPsychologist.userId,
        ),
      );

    console.log(
      `\n📋 Current availability for ${selectedPsychologist.fullName}:`,
    );
    existingTimes.forEach((time) => {
      const dayIndex = typeof time.dayOfWeek === 'number' ? time.dayOfWeek : 0;
      const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][
        dayIndex
      ];
      console.log(`   ${dayName}: ${time.startTime} - ${time.endTime}`);
    });

    console.log(
      `\n📅 Adding new availability slots (16:00-17:00 and 17:00-18:00):`,
    );
    newAvailabilitySlots.forEach((slot) => {
      const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][
        slot.day
      ];
      console.log(`   ${dayName}: ${slot.start} - ${slot.end}`);
    });

    // Build availability data
    const availabilityData: InferInsertModel<
      typeof psychologistAvailability
    >[] = newAvailabilitySlots.map((slot) => ({
      id: uuidV4(),
      psychologistId: selectedPsychologist.userId,
      dayOfWeek: slot.day as any,
      startTime: AVAIL_USES_TIMESTAMP
        ? (toDateTime(slot.start) as any)
        : (toPgTime(slot.start) as any),
      endTime: AVAIL_USES_TIMESTAMP
        ? (toDateTime(slot.end) as any)
        : (toPgTime(slot.end) as any),
    }));

    // Insert new availability slots
    await db.insert(psychologistAvailability).values(availabilityData);

    console.log(
      `\n🎉 Successfully added ${availabilityData.length} new availability slots!`,
    );
    console.log('📊 Summary:');
    console.log(`   👨‍⚕️ Psychologist: ${selectedPsychologist.fullName}`);
    console.log(`   📧 Email: ${selectedPsychologist.email}`);
    console.log(`   🕒 New slots added: ${availabilityData.length}`);
    console.log('   ⏰ Time slots: 16:00-17:00 and 17:00-18:00 (Mon-Fri)');
  } catch (error) {
    console.error('❌ Error adding single availability:', error);
    throw error;
  } finally {
    await pool.end();
    console.log('\n🔌 Database connection closed');
  }
}

main().catch((err) => {
  console.error('💥 Fatal error:', err);
  process.exit(1);
});
