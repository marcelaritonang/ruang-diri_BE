// import * as dotenv from 'dotenv';
// import { eq } from 'drizzle-orm';
// import { Pool } from 'pg';
// import { drizzle } from 'drizzle-orm/node-postgres';

// import { env } from '@/config/env.config';
// import { users } from '@/modules/users/domain/users.schema';
// import {
//   psychologistProfiles,
//   psychologistAvailability,
// } from '@/modules/psychologists/psychologist-profile.schema';

// dotenv.config();

// async function main() {
//   console.log(
//     '🔍 Directly querying psychologist availability from database...\n',
//   );

//   const pool = new Pool({
//     host: env.DB_HOST,
//     port: Number(env.DB_PORT),
//     user: env.DB_USERNAME,
//     password: env.DB_PASSWORD,
//     database: env.DB_NAME,
//     ssl: false,
//   });

//   const db = drizzle(pool, {
//     schema: {
//       users,
//       psychologistProfiles,
//       psychologistAvailability,
//     },
//   });

//   try {
//     // 1. Check all psychologists
//     console.log('📊 All psychologists in database:');
//     const allPsychologists = await db
//       .select({
//         userId: psychologistProfiles.userId,
//         email: users.email,
//         fullName: users.fullName,
//         specialization: psychologistProfiles.specialization,
//       })
//       .from(psychologistProfiles)
//       .innerJoin(users, eq(psychologistProfiles.userId, users.id));

//     console.log(`Found ${allPsychologists.length} psychologists:`);
//     allPsychologists.forEach((psych, index) => {
//       console.log(
//         `  ${index + 1}. ${psych.fullName} (${psych.email}) - ID: ${psych.userId}`,
//       );
//     });

//     // 2. Check all availability records
//     console.log('\n📅 All availability records in database:');
//     const allAvailability = await db.select().from(psychologistAvailability);

//     console.log(`Found ${allAvailability.length} availability records:`);
//     allAvailability.forEach((avail, index) => {
//       console.log(`  ${index + 1}. Psychologist ID: ${avail.psychologistId}`);
//       console.log(
//         `     Day: ${avail.dayOfWeek}, Start: ${avail.startTime}, End: ${avail.endTime}`,
//       );
//     });

//     // 3. Check availability per psychologist
//     console.log('\n🔗 Availability by psychologist:');
//     for (const psych of allPsychologists) {
//       const availability = await db
//         .select()
//         .from(psychologistAvailability)
//         .where(eq(psychologistAvailability.psychologistId, psych.userId));

//       console.log(`\n👨‍⚕️ ${psych.fullName} (${psych.userId}):`);
//       if (availability.length === 0) {
//         console.log('   ❌ No availability records found');
//       } else {
//         console.log(`   ✅ ${availability.length} availability slots:`);
//         availability.forEach((slot, index) => {
//           console.log(
//             `     ${index + 1}. Day ${slot.dayOfWeek}: ${slot.startTime?.toISOString()} - ${slot.endTime?.toISOString()}`,
//           );
//         });
//       }
//     }

//     // 4. Raw SQL query to double-check
//     console.log('\n🔧 Raw SQL verification:');
//     const rawResult = await pool.query(`
//       SELECT
//         u.full_name,
//         u.email,
//         pp.user_id as psychologist_id,
//         pa.id as availability_id,
//         pa.day_of_week,
//         pa.start_time,
//         pa.end_time
//       FROM users u
//       INNER JOIN psychologist_profiles pp ON u.id = pp.user_id
//       LEFT JOIN psychologist_availability pa ON pp.user_id = pa.psychologist_id
//       WHERE u.role = 'psychologist'
//       ORDER BY u.full_name, pa.day_of_week, pa.start_time
//     `);

//     console.log(`Raw query returned ${rawResult.rows.length} rows:`);
//     rawResult.rows.forEach((row, index) => {
//       console.log(
//         `  ${index + 1}. ${row.full_name} - Day: ${row.day_of_week}, Time: ${row.start_time} - ${row.end_time}`,
//       );
//     });
//   } catch (error) {
//     console.error('❌ Error querying database:', error);
//     throw error;
//   } finally {
//     await pool.end();
//     console.log('\n🔌 Database connection closed');
//   }
// }

// main().catch((err) => {
//   console.error('💥 Fatal error:', err);
//   process.exit(1);
// });
