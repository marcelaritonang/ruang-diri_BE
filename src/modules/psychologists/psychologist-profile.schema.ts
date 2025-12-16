import {
  pgTable,
  varchar,
  integer,
  boolean,
  uuid,
  timestamp,
  index,
  unique,
  jsonb,
  time,
} from 'drizzle-orm/pg-core';
import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from 'drizzle-zod';
import { z } from 'zod';

import { users, type User } from '@/modules/users/domain/users.schema';

import {
  counselingMethods,
  daysAvailability,
} from '@/modules/psychologists/constants/psychologist.constant';

export const expertiseAreas = [
  // Psikolog Klinis Dewasa
  'Stress, Burnout, & Kecemasan',
  'Gangguan mood (depresi, bipolar)',
  'Gangguan Kecemasan',
  'Fobia Spesifik (sosial, ketinggian, keramaian)',
  'Permasalahan dalam Mengelola Emosi',
  'Gangguan Pola Makan',
  'Duka dan Kehilangan (Grief)',
  'Kesulitan Beradaptasi dengan Perubahan Hidup (perceraian, pindah kerja)',
  'Masalah Citra Diri (Body Image Issues)',
  'Kekerasan Dalam Rumah Tangga',
  'Kekerasan Berbasis Gender',
  'Masalah hubungan interpersonal (konflik pernikahan/keluarga)',
  'Masalah terkait stres kerja & penyesuaian hidup',
  'Gangguan kecemasan umum, fobia, serangan panik',
  'Trauma, PTSD',

  // Psikolog Klinis Anak
  'Gangguan Spektrum Autisme (ASD)',
  'Kesulitan Belajar',
  'Gangguan Perkembangan Bahasa',
  'Gangguan Koordinasi Perkembangan',
  'Keterlambatan Perkembangan',
  'Masalah Belajar dan Konsentrasi',
  'Gangguan Perilaku (tantrum, agresi, kenakalan, dsb)',
  'Fobia Spesifik (takut gelap, takut dokter, dsb)',
  'Perundungan (Bullying)',
  'Kesulitan Interaksi Sosial & Penyesuaian Diri',
  'Dampak Perceraian Orang Tua',
  'Kekerasan Dalam Rumah Tangga',
  'Kecanduan Gawai atau Internet',
  'Kematangan Sekolah',
  'Kesulitan Dalam Pengelolaan Perasaan',
  'Kesulitan Interaksi Sosial & Penyesuaian Diri (Anak-Remaja)',
  'Masalah Emosional (depresi, harga diri rendah)',
  'Identifikasi Anak Berkebutuhan Khusus',

  // Psikolog Pendidikan
  'Masalah Akademik dan Belajar',
  'Pemetaan Minat dan Bakat (Anak-Dewasa)',
  'Kesulitan Akademik Spesifik (membaca, menulis, berhitung)',
  'Masalah Belajar dan Konsentrasi',
  'Perundungan (Bullying)',
  'Kesulitan Interaksi Sosial dan Penyesuaian Diri (Anak-Dewasa)',
  'Kesulitan Dalam Pengelolaan Perasaan',
  'Perencanaan Karier',
  'Kecanduan Gawai atau Internet',
  'Kematangan Sekolah',
  'Program Pembelajaran Individual (PPI)',
  'Keberbakatan (Giftedness)',
  'Gangguan Perilaku (tantrum, agresi, kenakalan, dsb)',
  'Keberbakatan & Twice Exceptional (2e)',
  'Kesulitan Belajar',
  'Identifikasi Anak Berkebutuhan Khusus',
] as const;

export const specializationTypes = [
  'Klinis Dewasa',
  'Klinis Anak',
  'Pendidikan',
  'Umum',
] as const;

export const psychologistProfiles = pgTable(
  'psychologist_profiles',
  {
    userId: uuid('user_id')
      .references(() => users.id)
      .primaryKey(),
    specialization: varchar('specialization', { length: 255 }),
    yearsOfExperience: integer('years_of_experience'),
    bio: varchar('bio', { length: 500 }),
    isExternal: boolean('is_external').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
    location: varchar('location', { length: 255 }),
    address: varchar('address', { length: 255 }),
    counselingMethod: jsonb('counseling_method')
      .notNull()
      .default(JSON.stringify(counselingMethods)),
    sippNumber: varchar('sipp_number', { length: 100 }),
    registrationNumber: varchar('registration_number', { length: 100 }),
    typeOfPractice: varchar('type_of_practice', { length: 100 }),
    fieldOfExpertise: jsonb('field_of_expertise'), // Changed to jsonb to store multiple areas
    licenseValidUntil: timestamp('license_valid_until'),
    practiceStartDate: timestamp('practice_start_date'),
    pricePerSession: integer('price_per_session').default(0), // Fixed price per session in IDR
    maxConcurrentSessions: integer('max_concurrent_sessions').default(2), // Maximum concurrent sessions psychologist can handle
  },
  (table) => [
    index('idx_psychologist_specialization').on(table.specialization),
    index('idx_psychologist_is_external').on(table.isExternal),
    index('idx_psychologist_location').on(table.location),
    index('idx_psychologist_address').on(table.address),
    index('idx_psychologist_counseling_method').on(table.counselingMethod),
    index('idx_psychologist_field_of_expertise').on(table.fieldOfExpertise),
    index('idx_psychologist_license_valid_until').on(table.licenseValidUntil),
    index('idx_psychologist_practice_start_date').on(table.practiceStartDate),
    index('idx_psychologist_created_at').on(table.createdAt),

    unique('unique_psychologist_user_id').on(table.userId),
  ],
);

export const psychologistAvailability = pgTable(
  'psychologist_availability',
  {
    id: uuid('id').primaryKey(),
    psychologistId: uuid('psychologist_id')
      .references(() => psychologistProfiles.userId)
      .notNull(),
    dayOfWeek: integer('day_of_week').$type<typeof daysAvailability>(),
    startTime: time('start_time').notNull(),
    endTime: time('end_time').notNull(),
  },
  (table) => [
    index('idx_psychologist_availability_psychologist_id').on(
      table.psychologistId,
    ),
    index('idx_psychologist_availability_day_of_week').on(table.dayOfWeek),
    index('idx_psychologist_availability_start_time').on(table.startTime),
    index('idx_psychologist_availability_end_time').on(table.endTime),
    index('idx_psychologist_day').on(table.psychologistId, table.dayOfWeek),
    index('idx_psychologist_availability_day_start_end').on(
      table.dayOfWeek,
      table.startTime,
      table.endTime,
    ),

    unique('uniq_psychologist_day_start_end').on(
      table.psychologistId,
      table.dayOfWeek,
      table.startTime,
      table.endTime,
    ),
  ],
);

export const PsychologistProfileSelectSchema =
  createSelectSchema(psychologistProfiles);
export const PsychologistProfileInsertSchema =
  createInsertSchema(psychologistProfiles);
export const PsychologistProfileUpdateSchema =
  createUpdateSchema(psychologistProfiles);

export type PsychologistProfile = z.infer<
  typeof PsychologistProfileSelectSchema
>;
export type CreatePsychologistProfile = z.infer<
  typeof PsychologistProfileInsertSchema
>;
export type UpdatePsychologistProfile = z.infer<
  typeof PsychologistProfileUpdateSchema
>;

export type Psychologists = User & PsychologistProfile;

export type SpecializationType = (typeof specializationTypes)[number];
export type ExpertiseArea = (typeof expertiseAreas)[number];
