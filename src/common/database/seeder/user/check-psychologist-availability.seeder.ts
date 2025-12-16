import { eq } from 'drizzle-orm';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';

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

const dayNames = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

async function main() {
  console.log('📊 Checking psychologist availability schedules...\n');

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
    },
  });

  try {
    // Get all psychologists with their availability
    const psychologists = await db
      .select({
        userId: users.id,
        email: users.email,
        fullName: users.fullName,
        specialization: psychologistProfiles.specialization,
        isExternal: psychologistProfiles.isExternal,
        location: psychologistProfiles.location,
      })
      .from(users)
      .innerJoin(
        psychologistProfiles,
        eq(users.id, psychologistProfiles.userId),
      )
      .where(eq(users.role, 'psychologist'));

    if (psychologists.length === 0) {
      console.log('❌ No psychologists found in database');
      return;
    }

    console.log(`✅ Found ${psychologists.length} psychologists\n`);

    let totalAvailabilitySlots = 0;

    for (const psych of psychologists) {
      console.log(`👨‍⚕️ ${psych.fullName}`);
      console.log(`   📧 ${psych.email}`);
      console.log(`   🏷️ ${psych.specialization}`);
      console.log(
        `   📍 ${psych.location} ${psych.isExternal ? '(External)' : '(Internal)'}`,
      );

      // Get availability for this psychologist
      const availability = await db
        .select({
          dayOfWeek: psychologistAvailability.dayOfWeek,
          startTime: psychologistAvailability.startTime,
          endTime: psychologistAvailability.endTime,
        })
        .from(psychologistAvailability)
        .where(eq(psychologistAvailability.psychologistId, psych.userId))
        .orderBy(
          psychologistAvailability.dayOfWeek,
          psychologistAvailability.startTime,
        );

      if (availability.length === 0) {
        console.log('   ❌ No availability scheduled');
      } else {
        console.log(`   📅 Available slots (${availability.length}):`);

        // Group by day
        const scheduleByDay = availability.reduce(
          (acc, slot) => {
            const day = slot.dayOfWeek as unknown as number;
            if (!acc[day]) acc[day] = [];

            const startTime = slot.startTime;
            const endTime = slot.endTime;

            acc[day].push(`${startTime}-${endTime}`);
            return acc;
          },
          {} as Record<number, string[]>,
        );

        Object.entries(scheduleByDay)
          .sort(([a], [b]) => Number(a) - Number(b))
          .forEach(([day, slots]) => {
            console.log(`      ${dayNames[Number(day)]}: ${slots.join(', ')}`);
          });

        totalAvailabilitySlots += availability.length;
      }

      console.log(''); // Empty line
    }

    console.log('📊 Summary:');
    console.log(`   👥 Total psychologists: ${psychologists.length}`);
    console.log(
      `   🏢 Internal: ${psychologists.filter((p) => !p.isExternal).length}`,
    );
    console.log(
      `   🌐 External: ${psychologists.filter((p) => p.isExternal).length}`,
    );
    console.log(`   📅 Total availability slots: ${totalAvailabilitySlots}`);
    console.log(
      `   📊 Average slots per psychologist: ${(totalAvailabilitySlots / psychologists.length).toFixed(1)}`,
    );

    // Show specializations
    console.log('\n🎯 Specializations:');
    const specializations = [
      ...new Set(psychologists.map((p) => p.specialization)),
    ];
    specializations.forEach((spec) => {
      const count = psychologists.filter(
        (p) => p.specialization === spec,
      ).length;
      console.log(`   • ${spec} (${count})`);
    });

    // Show locations
    console.log('\n📍 Locations:');
    const locations = [...new Set(psychologists.map((p) => p.location))];
    locations.forEach((loc) => {
      const count = psychologists.filter((p) => p.location === loc).length;
      console.log(`   • ${loc} (${count})`);
    });
  } catch (error) {
    console.error('❌ Error checking availability:', error);
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
