import { z } from 'zod';

import { timeRegexRules } from '@/common/utils/regex.util';

export const rescheduleCounselingDto = z.object({
  date: z.coerce.string().refine((val) => !isNaN(new Date(val).getTime()), {
    message: 'Invalid date format.',
  }),
  startTime: z.string().regex(timeRegexRules, {
    message: 'Start time must be in HH:MM format.',
  }),
  endTime: z.string().regex(timeRegexRules, {
    message: 'End time must be in HH:MM format.',
  }),
  timezone: z.string().optional(),
  notes: z.string().max(255).optional(),
});

export type RescheduleCounselingDto = z.infer<typeof rescheduleCounselingDto>;
