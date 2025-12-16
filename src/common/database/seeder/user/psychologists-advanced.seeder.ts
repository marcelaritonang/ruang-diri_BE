// import * as dotenv from 'dotenv';
// import * as bcrypt from 'bcryptjs';
// import { InferInsertModel } from 'drizzle-orm';
// import { Pool } from 'pg';
// import { drizzle } from 'drizzle-orm/node-postgres';
// import { v4 as uuidV4 } from 'uuid';
// import { eq } from 'drizzle-orm';

// import { env } from '@/config/env.config';
// import { users } from '@/modules/users/domain/users.schema';
// import {
//   psychologistProfiles,
//   psychologistAvailability,
// } from '@/modules/psychologists/psychologist-profile.schema';
// import { daysAvailability } from '@/modules/psychologists/constants/psychologist.constant';

// dotenv.config();

// interface PsychologistData {
//   licenseNumber: string;
//   specialization: string;
//   yearsOfExperience: number;
//   bio: string;
//   isExternal: boolean;
//   location: string;
//   address: string;
//   counselingMethods: string[];
//   user: {
//     email: string;
//     fullName: string;
//   };
//   schedule: Array<{
//     day: (typeof daysAvailability)[keyof typeof daysAvailability];
//     start: string;
//     end: string;
//   }>;
// }

// const psychologistsData: PsychologistData[] = [
//   {
//     licenseNumber: 'PSY001-2024',
//     specialization: 'Cognitive Behavioral Therapy',
//     yearsOfExperience: 8,
//     bio: 'Experienced psychologist specializing in CBT with focus on anxiety and depression. Passionate about helping individuals develop healthy coping mechanisms and thought pattern restructuring.',
//     isExternal: false,
//     location: 'Jakarta Pusat',
//     address: 'Jl. Depok Cinere, Jakarta Pusat 12980',
//     counselingMethods: ['online', 'offline', 'chat'],
//     user: {
//       email: 'mas.bram@ruangdiri.com',
//       fullName: 'Mas Bram',
//     },
//     schedule: [
//       { day: daysAvailability.monday, start: '09:00', end: '10:00' },
//       { day: daysAvailability.monday, start: '12:00', end: '13:00' },
//       { day: daysAvailability.tuesday, start: '09:00', end: '10:00' },
//       { day: daysAvailability.tuesday, start: '14:00', end: '15:00' },
//       { day: daysAvailability.wednesday, start: '09:00', end: '10:00' },
//       { day: daysAvailability.wednesday, start: '14:00', end: '15:00' },
//       { day: daysAvailability.thursday, start: '09:00', end: '10:00' },
//       { day: daysAvailability.thursday, start: '14:00', end: '15:00' },
//       { day: daysAvailability.friday, start: '09:00', end: '10:00' },
//       { day: daysAvailability.friday, start: '14:00', end: '15:00' },
//     ],
//   },
//   {
//     licenseNumber: 'PSY002-2024',
//     specialization: 'Child and Adolescent Psychology',
//     yearsOfExperience: 6,
//     bio: 'Dedicated child psychologist with expertise in developmental disorders, learning disabilities, ADHD, autism spectrum disorders, and behavioral issues in children and teenagers.',
//     isExternal: false,
//     location: 'Jakarta Selatan',
//     address:
//       'Wisma 77 Tower 2 Lt. 7, Jl. S. Letjen TB Simatupang Kav. 37, Jakarta Selatan 12540',
//     counselingMethods: ['online', 'offline', 'organization'],
//     user: {
//       email: 'dr.ahmad.child@ruangdiri.com',
//       fullName: 'Dr. Ahmad Fauzi, M.Psi., Psikolog',
//     },
//     schedule: [
//       { day: daysAvailability.monday, start: '10:00', end: '11:00' },
//       { day: daysAvailability.monday, start: '15:00', end: '16:00' },
//       { day: daysAvailability.wednesday, start: '10:00', end: '11:00' },
//       { day: daysAvailability.wednesday, start: '15:00', end: '16:00' },
//       { day: daysAvailability.friday, start: '10:00', end: '11:00' },
//       { day: daysAvailability.friday, start: '15:00', end: '16:00' },
//       { day: daysAvailability.saturday, start: '09:00', end: '10:00' },
//       { day: daysAvailability.saturday, start: '13:00', end: '14:00' },
//     ],
//   },
//   {
//     licenseNumber: 'PSY003-2024',
//     specialization: 'Clinical Psychology',
//     yearsOfExperience: 10,
//     bio: 'Senior clinical psychologist with extensive experience in trauma therapy, PTSD treatment, crisis intervention, and emergency psychological first aid. Certified in EMDR therapy.',
//     isExternal: true,
//     location: 'Bandung',
//     address: 'Jl. Dago No. 15, Bandung 40135',
//     counselingMethods: ['online', 'chat'],
//     user: {
//       email: 'dr.rita.clinical@ruangdiri.com',
//       fullName: 'Dr. Rita Sari, M.Psi., Psikolog',
//     },
//     schedule: [
//       { day: daysAvailability.tuesday, start: '11:00', end: '12:00' },
//       { day: daysAvailability.tuesday, start: '16:00', end: '17:00' },
//       { day: daysAvailability.thursday, start: '11:00', end: '12:00' },
//       { day: daysAvailability.thursday, start: '16:00', end: '17:00' },
//       { day: daysAvailability.saturday, start: '10:00', end: '11:00' },
//       { day: daysAvailability.saturday, start: '14:00', end: '15:00' },
//       { day: daysAvailability.sunday, start: '10:00', end: '11:00' },
//       { day: daysAvailability.sunday, start: '14:00', end: '15:00' },
//     ],
//   },
//   {
//     licenseNumber: 'PSY004-2024',
//     specialization: 'Workplace Psychology',
//     yearsOfExperience: 7,
//     bio: 'Workplace psychology specialist focusing on occupational stress management, burnout prevention, employee mental health, work-life balance.',
//     isExternal: false,
//     location: 'Jakarta Barat',
//     address:
//       'Puri Indah Financial Tower Lt. 10, Jl. Puri Indah Raya Blok U1, Jakarta Barat 11610',
//     counselingMethods: ['online', 'offline', 'chat'],
//     user: {
//       email: 'dr.budi.workplace@ruangdiri.com',
//       fullName: 'Dr. Budi Santoso, M.Psi., Psikolog',
//     },
//     schedule: [
//       { day: daysAvailability.monday, start: '08:00', end: '09:00' },
//       { day: daysAvailability.monday, start: '13:00', end: '14:00' },
//       { day: daysAvailability.monday, start: '19:00', end: '20:00' },
//       { day: daysAvailability.tuesday, start: '08:00', end: '09:00' },
//       { day: daysAvailability.tuesday, start: '13:00', end: '14:00' },
//       { day: daysAvailability.tuesday, start: '19:00', end: '20:00' },
//       { day: daysAvailability.wednesday, start: '08:00', end: '09:00' },
//       { day: daysAvailability.wednesday, start: '13:00', end: '14:00' },
//       { day: daysAvailability.wednesday, start: '19:00', end: '20:00' },
//       { day: daysAvailability.thursday, start: '08:00', end: '09:00' },
//       { day: daysAvailability.thursday, start: '13:00', end: '14:00' },
//       { day: daysAvailability.thursday, start: '19:00', end: '20:00' },
//       { day: daysAvailability.friday, start: '08:00', end: '09:00' },
//       { day: daysAvailability.friday, start: '13:00', end: '14:00' },
//     ],
//   },
//   {
//     licenseNumber: 'PSY005-2024',
//     specialization: 'Family and Couples Therapy',
//     yearsOfExperience: 9,
//     bio: 'Family therapist with expertise in relationship counseling, family dynamics, couples therapy, marital issues, parent-child relationships, and family crisis intervention.',
//     isExternal: true,
//     location: 'Surabaya',
//     address: 'Jl. Pemuda No. 45, Surabaya 60271',
//     counselingMethods: ['online', 'offline'],
//     user: {
//       email: 'dr.maya.family@ruangdiri.com',
//       fullName: 'Dr. Maya Kusuma, M.Psi., Psikolog',
//     },
//     schedule: [
//       { day: daysAvailability.tuesday, start: '14:00', end: '15:00' },
//       { day: daysAvailability.thursday, start: '14:00', end: '15:00' },
//       { day: daysAvailability.friday, start: '09:00', end: '10:00' },
//       { day: daysAvailability.friday, start: '13:00', end: '14:00' },
//       { day: daysAvailability.saturday, start: '08:00', end: '09:00' },
//       { day: daysAvailability.saturday, start: '13:00', end: '14:00' },
//       { day: daysAvailability.saturday, start: '18:00', end: '19:00' },
//       { day: daysAvailability.sunday, start: '09:00', end: '10:00' },
//       { day: daysAvailability.sunday, start: '13:00', end: '14:00' },
//       { day: daysAvailability.sunday, start: '17:00', end: '18:00' },
//     ],
//   },
//   {
//     licenseNumber: 'PSY006-2024',
//     specialization: 'Neuropsychology',
//     yearsOfExperience: 12,
//     bio: 'Neuropsychologist specializing in cognitive assessment, brain injury rehabilitation, dementia care, and neurological disorder support. Expert in neuropsychological testing and cognitive rehabilitation.',
//     isExternal: true,
//     location: 'Yogyakarta',
//     address: 'Jl. Malioboro No. 56, Yogyakarta 55213',
//     counselingMethods: ['online', 'offline'],
//     user: {
//       email: 'dr.andi.neuro@ruangdiri.com',
//       fullName: 'Dr. Andi Wijaya, M.Psi., Psikolog',
//     },
//     schedule: [
//       { day: daysAvailability.monday, start: '13:00', end: '14:00' },
//       { day: daysAvailability.wednesday, start: '13:00', end: '14:00' },
//       { day: daysAvailability.friday, start: '13:00', end: '14:00' },
//       { day: daysAvailability.saturday, start: '09:00', end: '10:00' },
//     ],
//   },
//   {
//     licenseNumber: 'PSY007-2024',
//     specialization: 'Addiction Psychology',
//     yearsOfExperience: 8,
//     bio: 'Addiction psychologist specializing in substance abuse treatment, behavioral addictions, recovery support, relapse prevention, and addiction counseling for individuals and families.',
//     isExternal: false,
//     location: 'Jakarta Timur',
//     address: 'Jl. Raya Bekasi KM 22, Jakarta Timur 13910',
//     counselingMethods: ['online', 'offline', 'chat'],
//     user: {
//       email: 'dr.lisa.addiction@ruangdiri.com',
//       fullName: 'Dr. Lisa Permata, M.Psi., Psikolog',
//     },
//     schedule: [
//       { day: daysAvailability.monday, start: '10:00', end: '11:00' },
//       { day: daysAvailability.tuesday, start: '10:00', end: '11:00' },
//       { day: daysAvailability.thursday, start: '10:00', end: '11:00' },
//       { day: daysAvailability.friday, start: '10:00', end: '11:00' },
//       { day: daysAvailability.saturday, start: '10:00', end: '11:00' },
//     ],
//   },
// ];

// async function validateData(): Promise<void> {
//   console.log('🔍 Validating psychologist data...');

//   const emails = new Set<string>();
//   const licenseNumbers = new Set<string>();

//   for (const psych of psychologistsData) {
//     // Check for duplicate emails
//     if (emails.has(psych.user.email)) {
//       throw new Error(`Duplicate email found: ${psych.user.email}`);
//     }
//     emails.add(psych.user.email);

//     // Check for duplicate license numbers
//     if (licenseNumbers.has(psych.licenseNumber)) {
//       throw new Error(`Duplicate license number found: ${psych.licenseNumber}`);
//     }
//     licenseNumbers.add(psych.licenseNumber);

//     // Validate email format
//     const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//     if (!emailRegex.test(psych.user.email)) {
//       throw new Error(`Invalid email format: ${psych.user.email}`);
//     }

//     // Validate schedule
//     for (const slot of psych.schedule) {
//       const validDays = Object.values(daysAvailability);
//       if (!validDays.includes(slot.day as any)) {
//         throw new Error(
//           `Invalid day of week: ${slot.day} for ${psych.user.fullName}. Valid days are: ${validDays.join(', ')}`,
//         );
//       }

//       const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
//       if (!timeRegex.test(slot.start) || !timeRegex.test(slot.end)) {
//         throw new Error(
//           `Invalid time format for ${psych.user.fullName}: ${slot.start}-${slot.end}`,
//         );
//       }
//     }
//   }

//   console.log('✅ Data validation passed');
// }

// async function clearExistingData(db: any): Promise<void> {
//   console.log('🧹 Checking for existing psychologist data...');

//   const existingUsers = await db
//     .select({ email: users.email, id: users.id })
//     .from(users)
//     .where(eq(users.role, 'psychologist'));

//   if (existingUsers.length > 0) {
//     console.log(`⚠️ Found ${existingUsers.length} existing psychologist(s):`);
//     existingUsers.forEach((user: any) => {
//       console.log(`   📧 ${user.email}`);
//     });

//     // Check for conflicts with our data
//     const emailsToSeed = psychologistsData.map(p => p.user.email);
//     const conflictingEmails = existingUsers
//       .filter((user: any) => emailsToSeed.includes(user.email))
//       .map((user: any) => user.email);

//     if (conflictingEmails.length > 0) {
//       console.log(`\n❌ The following emails from seeder data already exist in database:`);
//       conflictingEmails.forEach((email: string) => {
//         console.log(`   📧 ${email}`);
//       });
//       console.log(`\n💡 Please either:`);
//       console.log(`   1. Delete existing psychologists from database`);
//       console.log(`   2. Update seeder data with different emails`);
//       console.log(`   3. Skip conflicting entries\n`);

//       throw new Error(`Email conflicts detected. Cannot proceed with seeding.`);
//     }

//     console.log(
//       '✅ No email conflicts detected. Proceeding with seeding...\n',
//     );
//   }
// }

// async function main() {
//   console.log('🔄 Starting comprehensive psychologist seeding...');
//   console.log(`📊 Will create ${psychologistsData.length} psychologists\n`);

//   await validateData();

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
//     await clearExistingData(db);

//     const password = await bcrypt.hash('ruangdiri', 10);
//     console.log('🔐 Password hashed successfully\n');

//     let totalAvailabilitySlots = 0;

//     for (let i = 0; i < psychologistsData.length; i++) {
//       const psychData = psychologistsData[i];
//       const userId = uuidV4();

//       console.log(
//         `👨‍⚕️ Creating psychologist ${i + 1}/${psychologistsData.length}: ${psychData.user.fullName}`,
//       );

//       // Create user
//       const userData: InferInsertModel<typeof users> = {
//         id: userId,
//         email: psychData.user.email,
//         password,
//         fullName: psychData.user.fullName,
//         role: 'psychologist',
//         isActive: true,
//         isOnboarded: true,
//       };

//       await db.insert(users).values(userData);
//       console.log(`   ✅ User created: ${psychData.user.email}`);

//       // Create profile
//       const profileData: InferInsertModel<typeof psychologistProfiles> = {
//         userId,
//         licenseNumber: psychData.licenseNumber,
//         specialization: psychData.specialization,
//         yearsOfExperience: psychData.yearsOfExperience,
//         bio: psychData.bio,
//         isExternal: psychData.isExternal,
//         location: psychData.location,
//         address: psychData.address,
//         counselingMethod: JSON.stringify(psychData.counselingMethods),
//         createdAt: new Date(),
//         updatedAt: new Date(),
//       };

//       await db.insert(psychologistProfiles).values(profileData);
//       console.log(`   ✅ Profile created: ${psychData.specialization}`);

//       // Create availability
//       const availabilityData: InferInsertModel<
//         typeof psychologistAvailability
//       >[] = psychData.schedule.map((slot) => ({
//         id: uuidV4(),
//         psychologistId: userId,
//         dayOfWeek: slot.day as any,
//         // startTime: new Date(`2025-08-13T${slot.start}:00+07:00`),
//         // endTime: new Date(`2025-08-13T${slot.end}:00+07:00`),
//       }));

//       await db.insert(psychologistAvailability).values(availabilityData);
//       totalAvailabilitySlots += availabilityData.length;
//       console.log(
//         `   ✅ Availability created: ${availabilityData.length} slots`,
//       );
//       console.log(
//         `   📅 Schedule: ${psychData.schedule.map((s) => `${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][s.day]} ${s.start}-${s.end}`).join(', ')}\n`,
//       );
//     }

//     console.log('🎉 Psychologist seeding completed successfully!\n');
//     console.log('📊 Final Summary:');
//     console.log(`   👥 Psychologists: ${psychologistsData.length}`);
//     console.log(`   📅 Total availability slots: ${totalAvailabilitySlots}`);
//     console.log(
//       `   🏢 Internal psychologists: ${psychologistsData.filter((p) => !p.isExternal).length}`,
//     );
//     console.log(
//       `   🌐 External psychologists: ${psychologistsData.filter((p) => p.isExternal).length}`,
//     );
//     console.log(`   🔑 Default password: ruangdiri\n`);

//     console.log('🎯 Specializations:');
//     const specializations = [
//       ...new Set(psychologistsData.map((p) => p.specialization)),
//     ];
//     specializations.forEach((spec) => {
//       console.log(`   • ${spec}`);
//     });

//     console.log('\n📍 Locations:');
//     const locations = [...new Set(psychologistsData.map((p) => p.location))];
//     locations.forEach((loc) => {
//       console.log(`   • ${loc}`);
//     });
//   } catch (error) {
//     console.error('❌ Error seeding psychologist data:', error);
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
