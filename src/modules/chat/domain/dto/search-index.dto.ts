import { z } from 'zod';

export const UpsertSearchIndexSchema = z.object({
  messageId: z.string().uuid('Invalid message ID format'),
  sessionId: z.string().uuid('Invalid session ID format'),
  tokenHashes: z.array(z.string().min(1, 'Token hash cannot be empty')),
  keyVersion: z.number().int().min(1).default(1).optional(),
});

export const QuerySearchIndexSchema = z.object({
  trapdoors: z.array(z.string().min(1, 'Trapdoor cannot be empty')),
  sessionId: z.string().uuid('Invalid session ID format').optional(),
  keyVersion: z.number().int().min(1).default(1).optional(),
  limit: z.number().int().min(1).max(100).default(20).optional(),
  offset: z.number().int().min(0).default(0).optional(),
});

export const RemoveSearchIndexSchema = z.object({
  messageId: z.string().uuid('Invalid message ID format'),
});

export const BulkRemoveSearchIndexSchema = z.object({
  messageIds: z.array(z.string().uuid('Invalid message ID format')),
});

export const UpdateSearchIndexSchema = z.object({
  messageId: z.string().uuid('Invalid message ID format'),
  tokenHashes: z.array(z.string().min(1, 'Token hash cannot be empty')),
  keyVersion: z.number().int().min(1).default(1).optional(),
});

export const SearchResultSchema = z.object({
  messageIds: z.array(z.string().uuid()),
  total: z.number().int().min(0),
  hasMore: z.boolean(),
});

export type UpsertSearchIndexDto = z.infer<typeof UpsertSearchIndexSchema>;
export type QuerySearchIndexDto = z.infer<typeof QuerySearchIndexSchema>;
export type RemoveSearchIndexDto = z.infer<typeof RemoveSearchIndexSchema>;
export type BulkRemoveSearchIndexDto = z.infer<
  typeof BulkRemoveSearchIndexSchema
>;
export type UpdateSearchIndexDto = z.infer<typeof UpdateSearchIndexSchema>;
export type SearchResultDto = z.infer<typeof SearchResultSchema>;
