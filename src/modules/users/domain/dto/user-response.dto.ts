import { userRoleEnumSchema } from '../users.schema';

import { z } from 'zod';

export const usersQuery = z.object({
  limit: z.coerce.number().min(1).max(100).default(10),
  page: z.coerce.number().min(1).default(1),
  search: z.string().optional(),
  role: z.enum(userRoleEnumSchema.options).optional(),
});

export type UsersQueryDto = z.infer<typeof usersQuery>;
