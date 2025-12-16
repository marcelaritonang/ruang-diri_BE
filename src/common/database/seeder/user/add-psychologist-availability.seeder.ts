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

// Default availability schedules for different types of psychologists
const availabilityTemplates: Record<string, AvailabilitySlot[]> = {
  default: [
    { day: daysAvailability.monday, start: '09:00', end: '10:00' },
    { day: daysAvailability.monday, start: '14:00', end: '15:00' },
    { day: daysAvailability.tuesday, start: '09:00', end: '10:00' },
    { day: daysAvailability.tuesday, start: '14:00', end: '15:00' },
    { day: daysAvailability.wednesday, start: '09:00', end: '10:00' },
    { day: daysAvailability.wednesday, start: '14:00', end: '15:00' },
    { day: daysAvailability.thursday, start: '09:00', end: '10:00' },
    { day: daysAvailability.thursday, start: '14:00', end: '15:00' },
    { day: daysAvailability.friday, start: '09:00', end: '10:00' },
    { day: daysAvailability.friday, start: '14:00', end: '15:00' },
  ],
  fullTime: [
    { day: daysAvailability.monday, start: '08:00', end: '09:00' },
    { day: daysAvailability.monday, start: '10:00', end: '11:00' },
    { day: daysAvailability.monday, start: '13:00', end: '14:00' },
    { day: daysAvailability.monday, start: '15:00', end: '16:00' },
    { day: daysAvailability.tuesday, start: '08:00', end: '09:00' },
    { day: daysAvailability.tuesday, start: '10:00', end: '11:00' },
    { day: daysAvailability.tuesday, start: '13:00', end: '14:00' },
    { day: daysAvailability.tuesday, start: '15:00', end: '16:00' },
    { day: daysAvailability.wednesday, start: '08:00', end: '09:00' },
    { day: daysAvailability.wednesday, start: '10:00', end: '11:00' },
    { day: daysAvailability.wednesday, start: '13:00', end: '14:00' },
    { day: daysAvailability.wednesday, start: '15:00', end: '16:00' },
    { day: daysAvailability.thursday, start: '08:00', end: '09:00' },
    { day: daysAvailability.thursday, start: '10:00', end: '11:00' },
    { day: daysAvailability.thursday, start: '13:00', end: '14:00' },
    { day: daysAvailability.thursday, start: '15:00', end: '16:00' },
    { day: daysAvailability.friday, start: '08:00', end: '09:00' },
    { day: daysAvailability.friday, start: '10:00', end: '11:00' },
    { day: daysAvailability.friday, start: '13:00', end: '14:00' },
    { day: daysAvailability.friday, start: '15:00', end: '16:00' },
  ],
  partTime: [
    { day: daysAvailability.monday, start: '10:00', end: '11:00' },
    { day: daysAvailability.monday, start: '15:00', end: '16:00' },
    { day: daysAvailability.wednesday, start: '10:00', end: '11:00' },
    { day: daysAvailability.wednesday, start: '15:00', end: '16:00' },
    { day: daysAvailability.friday, start: '10:00', end: '11:00' },
    { day: daysAvailability.friday, start: '15:00', end: '16:00' },
  ],
  weekend: [
    { day: daysAvailability.friday, start: '18:00', end: '19:00' },
    { day: daysAvailability.friday, start: '19:00', end: '20:00' },
    { day: daysAvailability.saturday, start: '09:00', end: '10:00' },
    { day: daysAvailability.saturday, start: '10:00', end: '11:00' },
    { day: daysAvailability.saturday, start: '13:00', end: '14:00' },
    { day: daysAvailability.saturday, start: '14:00', end: '15:00' },
    { day: daysAvailability.sunday, start: '09:00', end: '10:00' },
    { day: daysAvailability.sunday, start: '10:00', end: '11:00' },
    { day: daysAvailability.sunday, start: '13:00', end: '14:00' },
  ],
};

async function main() {
  console.log('🔄 Adding availability to existing psychologists...');

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
    // Get all existing psychologists
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

    console.log('\n🔍 Checking existing availability...');

    // Collect psychologists that already have any availability row
    const existingAvailability = await db
      .select({
        psychologistId: psychologistAvailability.psychologistId,
      })
      .from(psychologistAvailability);

    const withAvailability = new Set(
      existingAvailability.map((a) => a.psychologistId),
    );

    const needingAvailability = existingPsychologists.filter(
      (psych) => !withAvailability.has(psych.userId),
    );

    if (needingAvailability.length === 0) {
      console.log('✅ All psychologists already have availability schedules');
      return;
    }

    console.log(
      `\n📅 Adding availability for ${needingAvailability.length} psychologists:\n`,
    );

    let totalSlotsAdded = 0;

    for (let i = 0; i < needingAvailability.length; i++) {
      const psych = needingAvailability[i];

      console.log(
        `👨‍⚕️ ${i + 1}/${needingAvailability.length}: ${psych.fullName}`,
      );

      // Pick template
      let template = 'default';
      const spec = psych.specialization?.toLowerCase() || '';

      if (spec.includes('child') || spec.includes('family')) {
        template = 'partTime';
      } else if (spec.includes('workplace') || spec.includes('clinical')) {
        template = 'fullTime';
      } else if (psych.isExternal) {
        template = 'weekend';
      }

      const scheduleTemplate = availabilityTemplates[template];

      // Build rows
      const availabilityData: InferInsertModel<
        typeof psychologistAvailability
      >[] = scheduleTemplate.map((slot) => ({
        id: uuidV4(),
        psychologistId: psych.userId,
        dayOfWeek: slot.day as any,
        startTime: AVAIL_USES_TIMESTAMP
          ? (toDateTime(slot.start) as any)
          : (toPgTime(slot.start) as any),
        endTime: AVAIL_USES_TIMESTAMP
          ? (toDateTime(slot.end) as any)
          : (toPgTime(slot.end) as any),
      }));

      await db.insert(psychologistAvailability).values(availabilityData);

      totalSlotsAdded += availabilityData.length;

      console.log(
        `   ✅ Added ${availabilityData.length} slots (${template} template)`,
      );
      console.log(
        `   📅 Schedule: ${scheduleTemplate
          .map(
            (s) =>
              `${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][s.day]} ${s.start}-${s.end}`,
          )
          .join(', ')}\n`,
      );
    }

    console.log('🎉 Availability seeding completed successfully!\n');
    console.log('📊 Summary:');
    console.log(
      `   👥 Total psychologists in database: ${existingPsychologists.length}`,
    );
    console.log(
      `   ✅ Psychologists with existing availability: ${withAvailability.size}`,
    );
    console.log(
      `   📅 Psychologists updated with new availability: ${needingAvailability.length}`,
    );
    console.log(`   🕒 Total new availability slots added: ${totalSlotsAdded}`);

    console.log('\n📋 Template types used:');
    console.log('   • default, Mon to Fri 9 to 10 and 14 to 15');
    console.log('   • fullTime, Mon to Fri multiple slots 8 to 16');
    console.log('   • partTime, Mon Wed Fri 10 to 11 and 15 to 16');
    console.log('   • weekend, Friday evening and weekend focus');
  } catch (error) {
    console.error('❌ Error adding availability:', error);
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
