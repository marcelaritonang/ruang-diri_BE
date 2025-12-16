import { z } from 'zod';

import { timeRegexRules } from '@/common/utils/regex.util';

import { allowedOffsets } from './schedule-response.dto';

export const updateScheduleDto = z
  .object({
    agenda: z.string().max(255).optional(),
    dates: z
      .array(
        z.object({
          date: z.coerce.string().refine((val) => !isNaN(Date.parse(val)), {
            message: 'Invalid date format.',
          }),
          startTime: z.string().regex(timeRegexRules),
          endTime: z.string().regex(timeRegexRules),
          timezone: z.string().max(50).optional(),
        }),
      )
      .min(1, { message: 'At least one date is required.' })
      .max(2, { message: 'A maximum of two dates are allowed.' })
      .optional(),
    location: z
      .enum(['online', 'offline', 'organization'], {
        message:
          'Invalid location type. Allowed values: online, offline, organization.',
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
    description: z
      .string()
      .optional()
      .refine((val) => {
        if (!val) return true;

        return val?.length <= 255;
      }),
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
      })
      .optional(),
    type: z
      .enum(['counseling', 'class', 'seminar', 'others'], {
        message: 'The agenda type that ur passing is not correct!',
      })
      .optional(),
    zoomJoinUrl: z.string().max(1024).optional(),
    zoomStartUrl: z.string().max(1024).optional(),
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

export type UpdateScheduleDto = z.infer<typeof updateScheduleDto>;
