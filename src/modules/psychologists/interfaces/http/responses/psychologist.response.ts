import { z } from 'zod';

export const psychologistCardResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  titles: z.string().optional(),
  avatar: z.string().nullable(),
  primarySpecialty: z.string(),
  specialties: z.array(z.string()),
  yearsOfPractice: z.number(),
  licenseNumber: z.string().nullable(),
  isActive: z.boolean(),
  hasAvailability: z.boolean(),
  nextAvailableAt: z.string().nullable(),
  sessionTypes: z.array(z.enum(['online', 'chat', 'offline'])),
  pricePerSession: z.number().nullable(),
  location: z.string().nullable(),
  address: z.string().nullable(),
});

export const psychologistListResponseSchema = z.object({
  data: z.array(psychologistCardResponseSchema),
  metadata: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    hasNext: z.boolean(),
    hasPrev: z.boolean(),
  }),
});

export type PsychologistCardResponse = z.infer<
  typeof psychologistCardResponseSchema
>;
export type PsychologistListResponse = z.infer<
  typeof psychologistListResponseSchema
>;
