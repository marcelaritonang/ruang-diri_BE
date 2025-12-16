import {
  Controller,
  Post,
  Delete,
  Body,
  UseGuards,
  Request,
  Logger,
  HttpCode,
  HttpStatus,
  Get,
  Query,
  Put,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { ISuccessResponse } from '@/common/utils/response.util';
import { ZodPipe } from '@/common/pipes/zod-validation.pipe';

import { SearchIndexService } from '../application/search-index.service';
import {
  UpsertSearchIndexSchema,
  QuerySearchIndexSchema,
  RemoveSearchIndexSchema,
  BulkRemoveSearchIndexSchema,
  UpdateSearchIndexSchema,
  UpsertSearchIndexDto,
  QuerySearchIndexDto,
  RemoveSearchIndexDto,
  BulkRemoveSearchIndexDto,
  UpdateSearchIndexDto,
  SearchResultDto,
} from '../domain/dto/search-index.dto';

@ApiTags('Search Index')
@Controller({
  path: 'search-index',
  version: '1',
})
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SearchIndexController {
  private readonly logger = new Logger(SearchIndexController.name);

  constructor(private readonly searchIndexService: SearchIndexService) {}

  private static createSuccessResponseSchema(dataSchema: any) {
    return {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'success' },
        message: { type: 'string' },
        data: dataSchema,
      },
    };
  }

  @Post('upsert')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Upsert token hashes for a message',
    description:
      'Store or update HMAC token hashes for searchable encryption. This endpoint should be called after sending a message to enable search functionality.',
  })
  @ApiResponse({
    status: 200,
    description: 'Token hashes upserted successfully',
    schema: SearchIndexController.createSuccessResponseSchema({
      type: 'object',
      properties: {
        messageId: {
          type: 'string',
          example: '123e4567-e89b-12d3-a456-426614174000',
        },
        tokenCount: { type: 'number', example: 15 },
      },
    }),
  })
  @ApiResponse({
    status: 403,
    description: 'User does not have access to this session',
  })
  @ApiResponse({
    status: 404,
    description:
      'Message not found or does not belong to the specified session',
  })
  async upsertTokenHashes(
    @Request() req: any,
    @Body(new ZodPipe(UpsertSearchIndexSchema)) dto: UpsertSearchIndexDto,
  ): Promise<ISuccessResponse> {
    const userId = req.user.userId;

    this.logger.log(
      `User ${userId} upserting ${dto.tokenHashes.length} token hashes for message ${dto.messageId}`,
    );

    return this.searchIndexService.upsertTokenHashes(userId, dto);
  }

  @Post('query')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Search messages using trapdoors',
    description:
      'Find messages that contain all the provided trapdoors (HMAC query hashes). Returns candidate message IDs that should be decrypted client-side for verification.',
  })
  @ApiResponse({
    status: 200,
    description: 'Search completed successfully',
    schema: SearchIndexController.createSuccessResponseSchema({
      type: 'object',
      properties: {
        messageIds: {
          type: 'array',
          items: { type: 'string' },
          example: [
            '123e4567-e89b-12d3-a456-426614174000',
            '123e4567-e89b-12d3-a456-426614174002',
          ],
        },
        total: { type: 'number', example: 42 },
        hasMore: { type: 'boolean', example: true },
      },
    }),
  })
  @ApiResponse({
    status: 403,
    description: 'User does not have access to the specified session',
  })
  async queryMessages(
    @Request() req: any,
    @Body(new ZodPipe(QuerySearchIndexSchema)) dto: QuerySearchIndexDto,
  ): Promise<ISuccessResponse<SearchResultDto>> {
    const userId = req.user.userId;

    this.logger.log(
      `User ${userId} searching with ${dto.trapdoors.length} trapdoors${dto.sessionId ? ` in session ${dto.sessionId}` : ''}`,
    );

    return this.searchIndexService.queryMessages(userId, dto);
  }

  @Delete('remove')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Remove token hashes for a message',
    description:
      'Remove all token hashes associated with a specific message. This should be called when a message is deleted.',
  })
  @ApiResponse({
    status: 200,
    description: 'Token hashes removed successfully',
    schema: SearchIndexController.createSuccessResponseSchema({
      type: 'object',
      properties: {
        messageId: {
          type: 'string',
          example: '123e4567-e89b-12d3-a456-426614174000',
        },
        removedCount: { type: 'number', example: 15 },
      },
    }),
  })
  @ApiResponse({
    status: 403,
    description: 'User does not have access to this message',
  })
  async removeTokenHashes(
    @Request() req: any,
    @Body(new ZodPipe(RemoveSearchIndexSchema)) dto: RemoveSearchIndexDto,
  ): Promise<ISuccessResponse> {
    const userId = req.user.userId;

    this.logger.log(
      `User ${userId} removing token hashes for message ${dto.messageId}`,
    );

    return this.searchIndexService.removeTokenHashes(userId, dto);
  }

  @Delete('bulk-remove')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Bulk remove token hashes for multiple messages',
    description:
      'Remove token hashes for multiple messages at once. Useful for cleanup operations.',
  })
  @ApiResponse({
    status: 200,
    description: 'Token hashes bulk removed successfully',
    schema: SearchIndexController.createSuccessResponseSchema({
      type: 'object',
      properties: {
        processedCount: { type: 'number', example: 5 },
        totalRemoved: { type: 'number', example: 75 },
      },
    }),
  })
  async bulkRemoveTokenHashes(
    @Request() req: any,
    @Body(new ZodPipe(BulkRemoveSearchIndexSchema))
    dto: BulkRemoveSearchIndexDto,
  ): Promise<ISuccessResponse> {
    const userId = req.user.userId;

    this.logger.log(
      `User ${userId} bulk removing token hashes for ${dto.messageIds.length} messages`,
    );

    return this.searchIndexService.bulkRemoveTokenHashes(userId, dto);
  }

  @Put('update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update token hashes for a message',
    description:
      'Replace existing token hashes for a message with new ones. This should be called when a message is edited.',
  })
  @ApiResponse({
    status: 200,
    description: 'Token hashes updated successfully',
    schema: SearchIndexController.createSuccessResponseSchema({
      type: 'object',
      properties: {
        messageId: {
          type: 'string',
          example: '123e4567-e89b-12d3-a456-426614174000',
        },
        previousCount: { type: 'number', example: 12 },
        newCount: { type: 'number', example: 18 },
      },
    }),
  })
  @ApiResponse({
    status: 404,
    description: 'Message not found or user does not have access',
  })
  async updateTokenHashes(
    @Request() req: any,
    @Body(new ZodPipe(UpdateSearchIndexSchema)) dto: UpdateSearchIndexDto,
  ): Promise<ISuccessResponse> {
    const userId = req.user.userId;

    this.logger.log(
      `User ${userId} updating token hashes for message ${dto.messageId}`,
    );

    return this.searchIndexService.updateTokenHashes(userId, dto);
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Get search index statistics',
    description:
      'Retrieve statistics about the search index. Useful for monitoring and debugging.',
  })
  @ApiResponse({
    status: 200,
    description: 'Search index statistics retrieved',
    schema: SearchIndexController.createSuccessResponseSchema({
      type: 'object',
      properties: {
        totalTokenHashes: { type: 'number', example: 15420 },
        uniqueMessages: { type: 'number', example: 1250 },
        uniqueUsers: { type: 'number', example: 85 },
        keyVersions: {
          type: 'array',
          items: { type: 'number' },
          example: [1, 2],
        },
      },
    }),
  })
  async getSearchIndexStats(@Request() req: any): Promise<ISuccessResponse> {
    const userId = req.user.userId;

    this.logger.log(`User ${userId} requesting search index statistics`);

    return this.searchIndexService.getSearchIndexStats();
  }

  @Delete('cleanup')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cleanup old token hashes',
    description:
      'Remove token hashes older than the specified number of days. This is a maintenance operation.',
  })
  @ApiResponse({
    status: 200,
    description: 'Old token hashes cleaned up successfully',
    schema: SearchIndexController.createSuccessResponseSchema({
      type: 'object',
      properties: {
        removedCount: { type: 'number', example: 1245 },
        cutoffDate: { type: 'string', example: '2024-06-01T00:00:00.000Z' },
      },
    }),
  })
  async cleanupOldTokenHashes(
    @Request() req: any,
    @Query('olderThanDays') olderThanDays?: string,
  ): Promise<ISuccessResponse> {
    const userId = req.user.userId;
    const days = olderThanDays ? parseInt(olderThanDays, 10) : 90;

    this.logger.log(
      `User ${userId} requesting cleanup of token hashes older than ${days} days`,
    );

    return this.searchIndexService.cleanupOldTokenHashes(days);
  }
}
