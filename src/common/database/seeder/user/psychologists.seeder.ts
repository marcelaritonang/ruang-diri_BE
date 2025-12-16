// import * as dotenv from 'dotenv';
// import * as bcrypt from 'bcryptjs';
// import { InferInsertModel } from 'drizzle-orm';
// import { Pool } from 'pg';
// import { drizzle } from 'drizzle-orm/node-postgres';
// import { v4 as uuidV4 } from 'uuid';

// import { env } from '@/config/env.config';
// import { users } from '@/modules/users/domain/users.schema';
// import {
//   psychologistProfiles,
//   psychologistAvailability,
// } from '@/modules/psychologists/psychologist-profile.schema';

// import dayjs from 'dayjs';

// dotenv.config();

// async function main() {
//   console.log('🔄 Seeding psychologist data...');

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

//   const generateId = () => uuidV4();

//   try {
//     // Generate psychologist profiles
//     const psychProfiles: InferInsertModel<typeof psychologistProfiles>[] = [
//       {
//         userId: generateId(),
//         licenseNumber: 'PSY001-2024',
//         specialization: 'Cognitive Behavioral Therapy',
//         yearsOfExperience: 8,
//         bio: 'Experienced psychologist specializing in CBT with focus on anxiety and depression. Passionate about helping individuals develop healthy coping mechanisms.',
//         isExternal: false,
//         createdAt: new Date(),
//         updatedAt: new Date(),
//         location: 'Jakarta Pusat',
//         address: 'Jl. MH Thamrin No. 10, Jakarta Pusat',
//         counselingMethod: JSON.stringify(['online', 'offline', 'chat']),
//       },
//       {
//         userId: generateId(),
//         licenseNumber: 'PSY002-2024',
//         specialization: 'Child and Adolescent Psychology',
//         yearsOfExperience: 6,
//         bio: 'Dedicated child psychologist with expertise in developmental disorders, learning disabilities, and behavioral issues in children and teens.',
//         isExternal: false,
//         createdAt: new Date(),
//         updatedAt: new Date(),
//         location: 'Jakarta Selatan',
//         address: 'Jl. Sudirman No. 25, Jakarta Selatan',
//         counselingMethod: JSON.stringify(['online', 'offline', 'organization']),
//       },
//       {
//         userId: generateId(),
//         licenseNumber: 'PSY003-2024',
//         specialization: 'Clinical Psychology',
//         yearsOfExperience: 10,
//         bio: 'Clinical psychologist with extensive experience in trauma therapy, PTSD treatment, and crisis intervention.',
//         isExternal: true,
//         createdAt: new Date(),
//         updatedAt: new Date(),
//         location: 'Bandung',
//         address: 'Jl. Dago No. 15, Bandung',
//         counselingMethod: JSON.stringify(['online', 'chat']),
//       },
//       {
//         userId: generateId(),
//         licenseNumber: 'PSY004-2024',
//         specialization: 'Workplace Psychology',
//         yearsOfExperience: 7,
//         bio: 'Workplace psychology specialist focusing on stress management, burnout prevention, and employee mental health.',
//         isExternal: false,
//         createdAt: new Date(),
//         updatedAt: new Date(),
//         location: 'Jakarta Barat',
//         address: 'Jl. Kebon Jeruk No. 30, Jakarta Barat',
//         counselingMethod: JSON.stringify([
//           'online',
//           'offline',
//           'organization',
//           'chat',
//         ]),
//       },
//       {
//         userId: generateId(),
//         licenseNumber: 'PSY005-2024',
//         specialization: 'Family and Couples Therapy',
//         yearsOfExperience: 9,
//         bio: 'Family therapist with expertise in relationship counseling, family dynamics, and couples therapy.',
//         isExternal: true,
//         createdAt: new Date(),
//         updatedAt: new Date(),
//         location: 'Surabaya',
//         address: 'Jl. Pemuda No. 45, Surabaya',
//         counselingMethod: JSON.stringify(['online', 'offline']),
//       },
//     ];

//     await db.insert(psychologistProfiles).values(psychProfiles);

//     const password = await bcrypt.hash('ruangdiri', 10);

//     const psychologistUsers: InferInsertModel<typeof users>[] = [
//       {
//         id: psychProfiles[0].userId,
//         email: 'dr.sarah.cbt@ruangdiri.com',
//         password,
//         fullName: 'Dr. Sarah Wijaya, M.Psi',
//         role: 'psychologist',
//         isActive: true,
//         isOnboarded: true,
//       },
//       {
//         id: psychProfiles[1].userId,
//         email: 'dr.ahmad.child@ruangdiri.com',
//         password,
//         fullName: 'Dr. Ahmad Fauzi, M.Psi',
//         role: 'psychologist',
//         isActive: true,
//         isOnboarded: true,
//       },
//       {
//         id: psychProfiles[2].userId,
//         email: 'dr.rita.clinical@ruangdiri.com',
//         password,
//         fullName: 'Dr. Rita Sari, M.Psi',
//         role: 'psychologist',
//         isActive: true,
//         isOnboarded: true,
//       },
//       {
//         id: psychProfiles[3].userId,
//         email: 'dr.budi.workplace@ruangdiri.com',
//         password,
//         fullName: 'Dr. Budi Santoso, M.Psi',
//         role: 'psychologist',
//         isActive: true,
//         isOnboarded: true,
//       },
//       {
//         id: psychProfiles[4].userId,
//         email: 'dr.maya.family@ruangdiri.com',
//         password,
//         fullName: 'Dr. Maya Kusuma, M.Psi',
//         role: 'psychologist',
//         isActive: true,
//         isOnboarded: true,
//       },
//     ];

//     await db.insert(users).values(psychologistUsers);

//     // Generate comprehensive availability schedules
//     const availability: InferInsertModel<typeof psychologistAvailability>[] =
//       [];

//     // Dr. Sarah Wijaya - CBT Specialist (Available Mon-Fri, morning and afternoon shifts)
//     const sarahSchedule = [
//       // Monday
//       { day: 1, start: '09:00', end: '12:00' },
//       { day: 1, start: '14:00', end: '17:00' },
//       // Tuesday
//       { day: 2, start: '09:00', end: '12:00' },
//       { day: 2, start: '14:00', end: '17:00' },
//       // Wednesday
//       { day: 3, start: '09:00', end: '12:00' },
//       { day: 3, start: '14:00', end: '17:00' },
//       // Thursday
//       { day: 4, start: '09:00', end: '12:00' },
//       { day: 4, start: '14:00', end: '17:00' },
//       // Friday
//       { day: 5, start: '09:00', end: '12:00' },
//       { day: 5, start: '14:00', end: '16:00' },
//     ];

//     sarahSchedule.forEach((slot) => {
//       availability.push({
//         id: generateId(),
//         psychologistId: psychProfiles[0].userId,
//         dayOfWeek: slot.day as any,
//         startTime: dayjs()
//           .set('hour', 5)
//           .set('minute', 55)
//           .set('second', 15)
//           .toISOString(),
//         endTime: dayjs()
//           .set('hour', 5)
//           .set('minute', 55)
//           .set('second', 15)
//           .toISOString(),
//       });
//     });

//     // Dr. Ahmad Fauzi - Child Psychology (Available Mon, Wed, Fri, Sat)
//     const ahmadSchedule = [
//       // Monday
//       { day: 1, start: '10:00', end: '13:00' },
//       { day: 1, start: '15:00', end: '18:00' },
//       // Wednesday
//       { day: 3, start: '10:00', end: '13:00' },
//       { day: 3, start: '15:00', end: '18:00' },
//       // Friday
//       { day: 5, start: '10:00', end: '13:00' },
//       { day: 5, start: '15:00', end: '18:00' },
//       // Saturday
//       { day: 6, start: '09:00', end: '12:00' },
//       { day: 6, start: '13:00', end: '16:00' },
//     ];

//     ahmadSchedule.forEach((slot) => {
//       availability.push({
//         id: generateId(),
//         psychologistId: psychProfiles[1].userId,
//         dayOfWeek: slot.day as any,
//         startTime: dayjs()
//           .set('hour', 5)
//           .set('minute', 55)
//           .set('second', 15)
//           .toISOString(),
//         endTime: dayjs()
//           .set('hour', 5)
//           .set('minute', 55)
//           .set('second', 15)
//           .toISOString(),
//       });
//     });

//     // Dr. Rita Sari - Clinical Psychology (Available Tue, Thu, Sat, Sun - External)
//     const ritaSchedule = [
//       // Tuesday
//       { day: 2, start: '11:00', end: '14:00' },
//       { day: 2, start: '16:00', end: '19:00' },
//       // Thursday
//       { day: 4, start: '11:00', end: '14:00' },
//       { day: 4, start: '16:00', end: '19:00' },
//       // Saturday
//       { day: 6, start: '10:00', end: '13:00' },
//       { day: 6, start: '14:00', end: '17:00' },
//       // Sunday
//       { day: 0, start: '10:00', end: '13:00' },
//       { day: 0, start: '14:00', end: '17:00' },
//     ];

//     ritaSchedule.forEach((slot) => {
//       availability.push({
//         id: generateId(),
//         psychologistId: psychProfiles[2].userId,
//         dayOfWeek: slot.day as any,
//         startTime: dayjs()
//           .set('hour', 5)
//           .set('minute', 55)
//           .set('second', 15)
//           .toISOString(),
//         endTime: dayjs()
//           .set('hour', 5)
//           .set('minute', 55)
//           .set('second', 15)
//           .toISOString(),
//       });
//     });

//     const budiSchedule = [
//       // Monday
//       { day: 1, start: '08:00', end: '12:00' },
//       { day: 1, start: '13:00', end: '17:00' },
//       { day: 1, start: '19:00', end: '21:00' },
//       // Tuesday
//       { day: 2, start: '08:00', end: '12:00' },
//       { day: 2, start: '13:00', end: '17:00' },
//       { day: 2, start: '19:00', end: '21:00' },
//       // Wednesday
//       { day: 3, start: '08:00', end: '12:00' },
//       { day: 3, start: '13:00', end: '17:00' },
//       { day: 3, start: '19:00', end: '21:00' },
//       // Thursday
//       { day: 4, start: '08:00', end: '12:00' },
//       { day: 4, start: '13:00', end: '17:00' },
//       { day: 4, start: '19:00', end: '21:00' },
//       // Friday
//       { day: 5, start: '08:00', end: '12:00' },
//       { day: 5, start: '13:00', end: '17:00' },
//     ];

//     budiSchedule.forEach((slot) => {
//       availability.push({
//         id: generateId(),
//         psychologistId: psychProfiles[3].userId,
//         dayOfWeek: slot.day as any,
//         startTime: dayjs()
//           .set('hour', 5)
//           .set('minute', 55)
//           .set('second', 15)
//           .toISOString(),
//         endTime: dayjs()
//           .set('hour', 5)
//           .set('minute', 55)
//           .set('second', 15)
//           .toISOString(),
//       });
//     });

//     const mayaSchedule = [
//       // Tuesday
//       { day: 2, start: '14:00', end: '18:00' },
//       // Thursday
//       { day: 4, start: '14:00', end: '18:00' },
//       // Friday
//       { day: 5, start: '09:00', end: '12:00' },
//       { day: 5, start: '13:00', end: '16:00' },
//       // Saturday
//       { day: 6, start: '08:00', end: '12:00' },
//       { day: 6, start: '13:00', end: '17:00' },
//       { day: 6, start: '18:00', end: '20:00' },
//       // Sunday
//       { day: 0, start: '09:00', end: '12:00' },
//       { day: 0, start: '13:00', end: '16:00' },
//       { day: 0, start: '17:00', end: '19:00' },
//     ];

//     mayaSchedule.forEach((slot) => {
//       availability.push({
//         id: generateId(),
//         psychologistId: psychProfiles[4].userId,
//         dayOfWeek: slot.day as any,
//         startTime: dayjs()
//           .set('hour', 5)
//           .set('minute', 55)
//           .set('second', 15)
//           .toISOString(),
//         endTime: dayjs()
//           .set('hour', 5)
//           .set('minute', 55)
//           .set('second', 15)
//           .toISOString(),
//       });
//     });

//     await db.insert(psychologistAvailability).values(availability);

//     console.log('\n📊 Psychologist Seeding Summary:');
//     console.log(`✅ Created ${psychologistUsers.length} psychologist users`);
//     console.log(`✅ Created ${psychProfiles.length} psychologist profiles`);
//     console.log(`✅ Created ${availability.length} availability slots`);

//     console.log('\n👥 Psychologists Created:');
//     psychologistUsers.forEach((user, index) => {
//       const profile = psychProfiles[index];
//       const userAvailability = availability.filter(
//         (a) => a.psychologistId === user.id,
//       );
//       console.log(`  📋 ${user.fullName}`);
//       console.log(`     📧 Email: ${user.email}`);
//       console.log(`     🎯 Specialization: ${profile.specialization}`);
//       console.log(`     📍 Location: ${profile.location}`);
//       console.log(`     ⏰ Availability slots: ${userAvailability.length}`);
//       console.log(
//         `     🏢 Type: ${profile.isExternal ? 'External' : 'Internal'}`,
//       );
//       console.log(
//         `     💼 Methods: ${JSON.parse(profile.counselingMethod as string).join(', ')}`,
//       );
//       console.log(`     🔑 Password: ruangdiri`);
//       console.log('');
//     });

//     console.log('✅ Psychologist data seeded successfully!');
//   } catch (error) {
//     console.error('❌ Error seeding psychologist data:', error);
//     throw error;
//   } finally {
//     await pool.end();
//     console.log('🔌 Database connection closed');
//   }
// }

// main().catch((err) => {
//   console.error('❌ Fatal error:', err);
//   process.exit(1);
// });
