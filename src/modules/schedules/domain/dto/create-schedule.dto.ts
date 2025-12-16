import { z } from 'zod';

import { allowedOffsets } from './schedule-response.dto';
import { timeRegexRules } from '@/common/utils/regex.util';

export const createScheduleDto = z
  .object({
    agenda: z.string().max(255),
    dates: z
      .array(
        z.object({
          date: z.coerce.string().refine((val) => !isNaN(Date.parse(val)), {
            message: 'Invalid date format.',
          }),
          startTime: z.string().regex(timeRegexRules),
          endTime: z.string().regex(timeRegexRules),
          timezone: z.string().max(50).optional(), // Made optional - will use user's timezone if not provided
        }),
      )
      .min(1)
      .max(2),
    location: z
      .enum(['online', 'offline', 'organization', 'chat'], {
        message:
          'Invalid location type. Allowed values: online, offline, organization, chat.',
      })
      .optional(),
    customLocation: z
      .string()
      .max(255)
      .optional()
      .refine((val) => {
        if (val === undefined) return true;
        return val.trim().length > 0;
      }, 'Custom location cannot be empty if provided.'),
    description: z.string().optional(),
    participants: z
      .object({
        patientIds: z
          .array(z.string().uuid())
          .max(2, {
            message: 'You can only add up to 2 patients.',
          })
          .optional(),
        psychologistId: z.string().uuid(),
      })
      .optional(),
    notificationOffset: z
      .number()
      .refine((val) => allowedOffsets.includes(val), {
        message: `Invalid notification offset. Allowed values: ${allowedOffsets.join(', ')}.`,
      }),
    type: z.enum(['counseling', 'class', 'seminar', 'others'], {
      message: 'The agenda type that ur passing is not correct!',
    }),
  })
  .refine(
    (data) =>
      !(
        data.location &&
        data.customLocation &&
        data.customLocation.trim() !== ''
      ),
    {
      message: 'customLocation should not be filled when location is provided.',
      path: ['customLocation'],
    },
  );

export type CreateScheduleDto = z.infer<typeof createScheduleDto>;
