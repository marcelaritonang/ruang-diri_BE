import { z } from 'zod';

export const counselingsQuery = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  type: z.enum(['online', 'chat', 'offline']).optional(),
  clientType: z.enum(['client', 'school', 'employee']).optional(),
});

export type CounselingsQueryDto = z.infer<typeof counselingsQuery>;
