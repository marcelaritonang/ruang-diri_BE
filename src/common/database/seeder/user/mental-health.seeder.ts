// import * as dotenv from 'dotenv';
// import { Pool } from 'pg';
// import { drizzle } from 'drizzle-orm/node-postgres';
// import { InferInsertModel, eq } from 'drizzle-orm';
// import { env } from '@/config/env.config';

// import {
//   studentProfiles,
//   employeeProfiles,
//   users,
//   screenings,
//   counselings,
// } from '@/common/database/database-schema';

// dotenv.config();

// function getRandomScreeningStatus():
//   | 'at_risk'
//   | 'monitored'
//   | 'stable'
//   | 'not_screened' {
//   const statuses = ['at_risk', 'monitored', 'stable', 'not_screened'] as const;
//   return statuses[Math.floor(Math.random() * statuses.length)];
// }

// function getRandomDateWithinThisMonth(): Date {
//   const now = new Date();
//   const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
//   const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
//   const randomTime =
//     startOfMonth.getTime() +
//     Math.random() * (endOfMonth.getTime() - startOfMonth.getTime());
//   return new Date(randomTime);
// }

// async function main() {
//   console.log('🔄 Seeding screenings and counselings...');

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
//       studentProfiles,
//       employeeProfiles,
//       users,
//       screenings,
//       counselings,
//     },
//   });

//   try {
//     // Clear existing records
//     await db.delete(screenings);
//     await db.delete(counselings);
//     console.log('🧹 Cleared existing screening and counseling records');

//     // Get student and employee users
//     const [studentUsers, employeeUsers] = await Promise.all([
//       db
//         .select({ userId: studentProfiles.userId })
//         .from(studentProfiles)
//         .innerJoin(users, eq(users.id, studentProfiles.userId))
//         .where(eq(users.role, 'student')),
//       db
//         .select({ userId: employeeProfiles.userId })
//         .from(employeeProfiles)
//         .innerJoin(users, eq(users.id, employeeProfiles.userId))
//         .where(eq(users.role, 'employee')),
//     ]);

//     const screeningEntries: InferInsertModel<typeof screenings>[] = [];
//     const counselingEntries: InferInsertModel<typeof counselings>[] = [];

//     for (const student of studentUsers) {
//       const count = 2 + Math.floor(Math.random() * 2);
//       for (let i = 0; i < count; i++) {
//         screeningEntries.push({
//           userId: student.userId,
//           actorType: 'student',
//           screeningStatus: getRandomScreeningStatus(),
//           date: getRandomDateWithinThisMonth(),
//         });

//         if (Math.random() < 0.5) {
//           counselingEntries.push({
//             userId: student.userId,
//             actorType: 'student',
//             date: getRandomDateWithinThisMonth(),
//             notes: 'Sample counseling notes',
//           });
//         }
//       }
//     }

//     for (const employee of employeeUsers) {
//       const count = 2 + Math.floor(Math.random() * 2);
//       for (let i = 0; i < count; i++) {
//         screeningEntries.push({
//           userId: employee.userId,
//           actorType: 'employee',
//           screeningStatus: getRandomScreeningStatus(),
//           date: getRandomDateWithinThisMonth(),
//         });

//         if (Math.random() < 0.5) {
//           counselingEntries.push({
//             userId: employee.userId,
//             actorType: 'employee',
//             date: getRandomDateWithinThisMonth(),
//             notes: 'Sample counseling notes',
//             // method: 'online', // Assuming counseling method is required
//             // psychologistId: employee.userId, // Assuming employee is also a psychologist
//           });
//         }
//       }
//     }

//     await db.insert(screenings).values(screeningEntries);
//     await db.insert(counselings).values(counselingEntries);

//     console.log(
//       `✅ Seeded ${screeningEntries.length} screenings and ${counselingEntries.length} counselings`,
//     );
//   } catch (error) {
//     console.error('❌ Error seeding data:', error);
//     throw error;
//   } finally {
//     await pool.end();
//     console.log('🔌 Database connection closed');
//   }
// }

// main().catch((err) => {
//   console.error('Fatal error:', err);
//   process.exit(1);
// });
