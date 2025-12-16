import { z } from 'zod';

export const createChatSessionDto = z.object({
  psychologistId: z.string().uuid('Invalid psychologist ID format'),
});

export const createCounselingChatSessionDto = z.object({
  counselingId: z.string().uuid('Invalid counseling ID format'),
  scheduledAt: z.coerce.date(),
});

export const chatMessageDto = z.object({
  sessionId: z.string().uuid('Invalid session ID format'),
  message: z
    .string()
    .min(1, 'Text cannot be empty')
    .max(4096, 'Text too long')
    .optional(),
  messageType: z.enum(['text', 'image', 'file']).default('text'),
});

export const chatFileUploadDto = z.object({
  sessionId: z.string().uuid('Invalid session ID format'),
  text: z.string().max(500, 'Caption too long').optional(),
  messageType: z.enum(['image', 'file']),
});

export const getChatHistoryDto = z.object({
  sessionId: z.string().uuid('Invalid session ID format'),
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(50).default(20),
});

export const ablyTokenRequestDto = z.object({
  sessionId: z.string().uuid('Invalid session ID format'),
});

export const getChatHistoriesDto = z.object({
  search: z.string().optional(),
  limit: z.coerce.number().min(1).max(50).default(20),
  page: z.coerce.number().min(1).default(1),
});

export const updateUserPresenceDto = z.object({
  status: z.enum(['present', 'away']),
});

export const markMessageAsReadDto = z.object({
  messageId: z.string().uuid('Invalid message ID format'),
});

export const typingIndicatorDto = z.object({
  sessionId: z.string().uuid('Invalid session ID format'),
  isTyping: z.boolean(),
});

export const markMultipleMessagesAsReadDto = z.object({
  messageIds: z.array(z.string().uuid('Invalid message ID format')).min(1),
});

export const getMessageReadStatusDto = z.object({
  messageIds: z.array(z.string().uuid('Invalid message ID format')).optional(),
});

export const publishUserActivityDto = z.object({
  activity: z.object({
    type: z.enum(['active', 'away']),
    lastActive: z.coerce.date().optional(),
    metadata: z.record(z.any()).optional(),
  }),
});

export type CreateChatSessionDto = z.infer<typeof createChatSessionDto>;
export type CreateCounselingChatSessionDto = z.infer<
  typeof createCounselingChatSessionDto
>;
export type ChatMessageDto = z.infer<typeof chatMessageDto>;
export type ChatFileUploadDto = z.infer<typeof chatFileUploadDto>;
export type GetChatHistoryDto = z.infer<typeof getChatHistoryDto>;
export type GetChatHistoriesDto = z.infer<typeof getChatHistoriesDto>;
export type AblyTokenRequestDto = z.infer<typeof ablyTokenRequestDto>;
export type UpdateUserPresenceDto = z.infer<typeof updateUserPresenceDto>;
export type MarkMessageAsReadDto = z.infer<typeof markMessageAsReadDto>;
export type TypingIndicatorDto = z.infer<typeof typingIndicatorDto>;
export type MarkMultipleMessagesAsReadDto = z.infer<
  typeof markMultipleMessagesAsReadDto
>;
export type GetMessageReadStatusDto = z.infer<typeof getMessageReadStatusDto>;
export type PublishUserActivityDto = z.infer<typeof publishUserActivityDto>;
