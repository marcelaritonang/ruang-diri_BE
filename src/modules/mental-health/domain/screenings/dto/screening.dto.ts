import { z } from 'zod';

export const createScreeningDto = z.object({
  answers: z.array(z.number().int().min(0).max(3)).length(21, {
    message: 'DASS-21 assessment requires exactly 21 answers',
  }),
});

export type CreateScreeningDto = z.infer<typeof createScreeningDto>;

export const screeningResultSchema = z.object({
  id: z.string(),
  userId: z.string(),
  date: z.date(),
  screeningStatus: z.enum(['stable', 'at_risk', 'monitored', 'not_screened']),
  depressionScore: z.number(),
  anxietyScore: z.number(),
  stressScore: z.number(),
  depressionCategory: z.string(),
  anxietyCategory: z.string(),
  stressCategory: z.string(),
  overallRisk: z.string(),
  answers: z.array(z.number()),
  notes: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type ScreeningResult = z.infer<typeof screeningResultSchema>;

export const getScreeningsQuery = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  userId: z.string().uuid().optional(),
  status: z.enum(['stable', 'at_risk', 'monitored', 'not_screened']).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  riskLevel: z
    .enum([
      'Stabil',
      'Ringan',
      'Sedang',
      'Mengkhawatirkan',
      'Sangat Mengkhawatirkan',
    ])
    .optional(),
});

export type GetScreeningsQuery = z.infer<typeof getScreeningsQuery>;

export const screeningAnalyticsSchema = z.object({
  totalScreenings: z.number(),
  riskDistribution: z.object({
    stable: z.number(),
    atRisk: z.number(),
    monitored: z.number(),
  }),
  categoryAverages: z.object({
    depression: z.number(),
    anxiety: z.number(),
    stress: z.number(),
  }),
  monthlyTrends: z.array(
    z.object({
      month: z.string(),
      count: z.number(),
      averageRisk: z.number(),
    }),
  ),
});

export type ScreeningAnalytics = z.infer<typeof screeningAnalyticsSchema>;
