import { z } from 'zod';

export const allowedOffsets = [60, 720, 1440, 4320];

export const scheduleParam = z.object({
  id: z.string(),
});

export const getSchedulesQuery = z.object({
  from: z.coerce.string().refine((value) => !isNaN(Date.parse(value)), {
    message: 'Invalid date format for "from" parameter',
  }),
  to: z.coerce.string().refine((value) => !isNaN(Date.parse(value)), {
    message: 'Invalid date format for "to" parameter',
  }),
});

export const scheduleAttachmentsParam = z.object({
  scheduleId: z.string().uuid(),
});

export type ScheduleParamDto = z.infer<typeof scheduleParam>;
export type ScheduleQueryDto = z.infer<typeof getSchedulesQuery>;

export type ScheduleAttachmentsParamDto = z.infer<
  typeof scheduleAttachmentsParam
>;
