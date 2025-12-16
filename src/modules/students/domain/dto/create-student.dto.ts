import { z } from 'zod';

export const StudentProfileUploadSchema = z.object({
  full_name: z.string(),
  nis: z.string().min(1, { message: 'NIS tidak boleh kosong' }),
  gender: z.enum(['male', 'female']),
  grade: z.string().optional(),
  classroom: z.string().optional(),
  screening_status: z
    .enum(['not_screened', 'at_risk', 'monitored', 'stable'])
    .optional(),
  counseling_status: z.boolean().optional(),
  iq_score: z.coerce.number().optional(),
  guardian_name: z.string().optional(),
  guardian_contact: z.string().optional(),
  birth_date: z.string().optional(),
  birth_place: z.string().optional(),
  iq_category: z
    .enum([
      'below_average',
      'average',
      'above_average',
      'superior',
      'very_superior',
      'borderline',
    ])
    .optional(),
  screening_date: z.coerce.date().optional(),
  counseling_date: z.coerce.date().optional(),
  mental_health_status_updated_at: z.coerce.date().optional(),
});

export type StudentProfileUploadDto = z.infer<
  typeof StudentProfileUploadSchema
>;
