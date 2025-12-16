import { z } from 'zod';

export const genderTypeEnumSchema = z.enum(['male', 'female']);

export const screeningTypeEnumSchema = z.enum([
  'stable',
  'at_risk',
  'monitored',
  'not_screened',
]);

export const iqCategoryEnumSchema = z.enum([
  'below_average',
  'average',
  'above_average',
  'superior',
  'very_superior',
  'borderline',
]);

export const GetStudentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().default(''),
  classroom: z.string().default(''),
  grade: z.string().default(''),
  gender: z.enum(['female', 'male', '']).default(''),
  screeningStatus: z
    .enum(['stable', 'at_risk', 'monitored', 'not_screened', ''])
    .default(''),
  counselingStatus: z.enum(['1', '0', '']).default(''),
  sortBy: z.enum(['name', 'nis', 'iqScore', '']).default(''),
  sortOrder: z.enum(['asc', 'desc', '']).default(''),
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
});

export type GenderType = z.infer<typeof genderTypeEnumSchema>;
export type ScreeningType = z.infer<typeof screeningTypeEnumSchema>;
export type IQCategory = z.infer<typeof iqCategoryEnumSchema>;

export type GetStudentsQuery = z.infer<typeof GetStudentsQuerySchema>;
