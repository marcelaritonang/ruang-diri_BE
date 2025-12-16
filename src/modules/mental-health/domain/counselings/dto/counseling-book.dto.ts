import { z } from 'zod';

import { arrCounselingMethods } from '@/modules/psychologists/constants/psychologist.constant';
import { timeRegexRules } from '@/common/utils/regex.util';

export const counselingBookingDto = z.object({
  psychologistId: z.string().uuid().optional(),
  method: z.enum(arrCounselingMethods),
  notes: z.string().max(255).optional(),
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
});

export type CounselingsBookingDto = z.infer<typeof counselingBookingDto>;
