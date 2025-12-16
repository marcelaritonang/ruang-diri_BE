import { z } from 'zod';

export const cancelCounselingDto = z.object({
  reason: z.string().max(255).optional(),
});

export type CancelCounselingDto = z.infer<typeof cancelCounselingDto>;
