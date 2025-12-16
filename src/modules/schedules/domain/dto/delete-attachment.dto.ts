import { z } from 'zod';

export const deleteAttachmentDto = z.object({
  attachmentId: z.string().uuid('Invalid attachment ID format'),
});

export type DeleteAttachmentDto = z.infer<typeof deleteAttachmentDto>;
