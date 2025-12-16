import { z } from 'zod';

import { daysAvailability } from '@/modules/psychologists/constants/psychologist.constant';
import { days } from '@nestjs/throttler';

export const psychologistQuerySchema = z.object({
  limit: z
    .any()
    .transform((val) => (typeof val === 'string' ? parseInt(val, 10) : val))
    .default(10),
  page: z
    .any()
    .transform((val) => (typeof val === 'string' ? parseInt(val, 10) : val))
    .default(1),
  search: z.string().optional(),
  location: z.string().optional(),
  // Date filtering
  date: z.string().optional(), // single date (YYYY-MM-DD)
  date_from: z.string().optional(), // date range start
  date_to: z.string().optional(), // date range end
  // Specialty filtering
  specialty_ids: z.array(z.string()).optional(),
  specialization: z.string().optional(), // specialization type filter
  // Experience filtering
  years_min: z
    .any()
    .transform((val) => (typeof val === 'string' ? parseInt(val, 10) : val))
    .optional(),
  // Session type filtering
  session_type: z.enum(['online', 'chat', 'offline']).optional(),
  // Legacy availability filtering (keep for backward compatibility)
  startTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .optional(), // HH:mm format
  endTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .optional(), // HH:mm format
  dayOfWeek: z.number().optional(),
  // Sorting
  sort: z
    .enum(['relevance', 'experience', 'price', 'availability'])
    .default('relevance'),
});

export const checkAvailabilityQuerySchema = z.object({
  psychologistId: z.string().uuid(),
  dayOfWeek: z.enum([
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
  ]),
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
});

export type PsychologistQuerySchema = z.infer<typeof psychologistQuerySchema>;
