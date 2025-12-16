import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';

import {
  SuccessResponse,
  type ISuccessResponse,
} from '@/common/utils/response.util';

import { ChatRepository } from '../infrastructure/chat.repository';
import { SearchIndexRepository } from '../infrastructure/search-index.repository';
import type {
  UpsertSearchIndexDto,
  QuerySearchIndexDto,
  RemoveSearchIndexDto,
  SearchResultDto,
  BulkRemoveSearchIndexDto,
  UpdateSearchIndexDto,
} from '../domain/dto/search-index.dto';

@Injectable()
export class SearchIndexService {
  private readonly logger = new Logger(SearchIndexService.name);

  constructor(
    private readonly searchIndexRepository: SearchIndexRepository,
    private readonly chatRepository: ChatRepository,
  ) {}

  /**
   * Upsert token hashes for a message.
   * This validates that the user has access to the message before upserting.
   */
  async upsertTokenHashes(
    userId: string,
    dto: UpsertSearchIndexDto,
  ): Promise<ISuccessResponse> {
    try {
      // Validate that the user has access to this session
      const hasAccess = await this.chatRepository.isUserParticipantInSession(
        userId,
        dto.sessionId,
      );

      if (!hasAccess) {
        throw new ForbiddenException(
          'User does not have access to this session',
        );
      }

      // Validate that the message exists and belongs to the session
      const message = await this.chatRepository.getChatHistory(
        dto.sessionId,
        undefined,
        1000,
      );
      const messageExists = message.data?.some(
        (msg: any) => msg.id === dto.messageId,
      );

      if (!messageExists) {
        throw new NotFoundException(
          'Message not found or does not belong to the specified session',
        );
      }

      // Validate token hashes (basic validation)
      this.validateTokenHashes(dto.tokenHashes);

      // Upsert token hashes
      await this.searchIndexRepository.upsertTokenHashes(
        dto.messageId,
        dto.sessionId,
        userId,
        dto.tokenHashes,
        dto.keyVersion || 1,
      );

      this.logger.log(
        `Successfully upserted ${dto.tokenHashes.length} token hashes for message ${dto.messageId}`,
      );

      return SuccessResponse.success(
        {
          messageId: dto.messageId,
          tokenCount: dto.tokenHashes.length,
        },
        'Token hashes upserted successfully',
      );
    } catch (error) {
      this.logger.error(
        `Failed to upsert token hashes for message ${dto.messageId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Search for messages using trapdoors (query hashes).
   * Returns candidate message IDs that match all trapdoors.
   */
  async queryMessages(
    userId: string,
    dto: QuerySearchIndexDto,
  ): Promise<ISuccessResponse<SearchResultDto>> {
    try {
      // If sessionId is provided, validate user access
      if (dto.sessionId) {
        const hasAccess = await this.chatRepository.isUserParticipantInSession(
          userId,
          dto.sessionId,
        );

        if (!hasAccess) {
          throw new ForbiddenException(
            'User does not have access to this session',
          );
        }
      }

      // Validate trapdoors
      this.validateTokenHashes(dto.trapdoors);

      // Query the search index
      const searchResult = await this.searchIndexRepository.queryByTrapdoors(
        userId,
        dto.trapdoors,
        {
          sessionId: dto.sessionId,
          keyVersion: dto.keyVersion || 1,
          limit: dto.limit || 20,
          offset: dto.offset || 0,
        },
      );

      const resultDto: SearchResultDto = {
        messageIds: searchResult.messageIds,
        total: searchResult.total,
        hasMore: searchResult.hasMore,
      };

      this.logger.log(
        `Search query returned ${searchResult.messageIds.length} messages out of ${searchResult.total} total matches`,
      );

      return SuccessResponse.success(
        resultDto,
        'Search completed successfully',
      );
    } catch (error) {
      this.logger.error('Failed to query messages:', error);
      throw error;
    }
  }

  /**
   * Remove token hashes for a specific message.
   * This validates that the user has access to the message before removing.
   */
  async removeTokenHashes(
    userId: string,
    dto: RemoveSearchIndexDto,
  ): Promise<ISuccessResponse> {
    try {
      // Get message details to validate access
      const sessions = await this.chatRepository.getUserActiveSessions(
        userId,
        'client' as any,
      );
      const psychSessions = await this.chatRepository.getUserActiveSessions(
        userId,
        'psychologist' as any,
      );
      const allSessions = [...sessions, ...psychSessions];

      // Check if user has access to any session containing this message
      let hasAccess = false;
      for (const session of allSessions) {
        const history = await this.chatRepository.getChatHistory(
          session.id,
          undefined,
          1000,
        );
        const messageExists = history.data?.some(
          (msg: any) => msg.id === dto.messageId,
        );
        if (messageExists) {
          hasAccess = true;
          break;
        }
      }

      if (!hasAccess) {
        throw new ForbiddenException(
          'User does not have access to this message',
        );
      }

      // Remove token hashes
      await this.searchIndexRepository.removeTokenHashes(dto.messageId);

      this.logger.log(
        `Successfully removed token hashes for message ${dto.messageId}`,
      );

      return SuccessResponse.success(
        { messageId: dto.messageId },
        'Token hashes removed successfully',
      );
    } catch (error) {
      this.logger.error(
        `Failed to remove token hashes for message ${dto.messageId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Bulk remove token hashes for multiple messages.
   */
  async bulkRemoveTokenHashes(
    userId: string,
    dto: BulkRemoveSearchIndexDto,
  ): Promise<ISuccessResponse> {
    try {
      // For bulk operations, we'll validate access for each message
      // In a production environment, you might want to optimize this
      for (const messageId of dto.messageIds) {
        await this.removeTokenHashes(userId, { messageId });
      }

      this.logger.log(
        `Successfully bulk removed token hashes for ${dto.messageIds.length} messages`,
      );

      return SuccessResponse.success(
        { messageCount: dto.messageIds.length },
        'Token hashes bulk removed successfully',
      );
    } catch (error) {
      this.logger.error('Failed to bulk remove token hashes:', error);
      throw error;
    }
  }

  /**
   * Update token hashes for a message (remove old ones and insert new ones).
   */
  async updateTokenHashes(
    userId: string,
    dto: UpdateSearchIndexDto,
  ): Promise<ISuccessResponse> {
    try {
      // First, get the message to determine its session
      const sessions = await this.chatRepository.getUserActiveSessions(
        userId,
        'client' as any,
      );
      const psychSessions = await this.chatRepository.getUserActiveSessions(
        userId,
        'psychologist' as any,
      );
      const allSessions = [...sessions, ...psychSessions];

      let sessionId: string | null = null;
      for (const session of allSessions) {
        const history = await this.chatRepository.getChatHistory(
          session.id,
          undefined,
          1000,
        );
        const messageExists = history.data?.some(
          (msg: any) => msg.id === dto.messageId,
        );
        if (messageExists) {
          sessionId = session.id;
          break;
        }
      }

      if (!sessionId) {
        throw new NotFoundException(
          'Message not found or user does not have access',
        );
      }

      // Validate token hashes
      this.validateTokenHashes(dto.tokenHashes);

      // Update token hashes (this will replace existing ones)
      await this.searchIndexRepository.upsertTokenHashes(
        dto.messageId,
        sessionId,
        userId,
        dto.tokenHashes,
        dto.keyVersion || 1,
      );

      this.logger.log(
        `Successfully updated token hashes for message ${dto.messageId}`,
      );

      return SuccessResponse.success(
        {
          messageId: dto.messageId,
          tokenCount: dto.tokenHashes.length,
        },
        'Token hashes updated successfully',
      );
    } catch (error) {
      this.logger.error(
        `Failed to update token hashes for message ${dto.messageId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get search index statistics (admin/debug endpoint).
   */
  async getSearchIndexStats(): Promise<ISuccessResponse> {
    try {
      const stats = await this.searchIndexRepository.getSearchIndexStats();

      this.logger.log('Retrieved search index statistics');

      return SuccessResponse.success(
        stats,
        'Search index statistics retrieved',
      );
    } catch (error) {
      this.logger.error('Failed to get search index stats:', error);
      throw error;
    }
  }

  /**
   * Cleanup old token hashes (maintenance endpoint).
   */
  async cleanupOldTokenHashes(
    olderThanDays: number = 90,
  ): Promise<ISuccessResponse> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const removedCount =
        await this.searchIndexRepository.cleanupOldTokenHashes(cutoffDate);

      this.logger.log(`Cleaned up ${removedCount} old token hashes`);

      return SuccessResponse.success(
        {
          removedCount,
          cutoffDate: cutoffDate.toISOString(),
        },
        'Old token hashes cleaned up successfully',
      );
    } catch (error) {
      this.logger.error('Failed to cleanup old token hashes:', error);
      throw error;
    }
  }

  /**
   * Validate token hashes format and constraints.
   */
  private validateTokenHashes(tokenHashes: string[]): void {
    if (tokenHashes.length === 0) {
      throw new BadRequestException('At least one token hash is required');
    }

    if (tokenHashes.length > 1000) {
      throw new BadRequestException('Too many token hashes (max: 1000)');
    }

    for (const hash of tokenHashes) {
      if (!hash || typeof hash !== 'string') {
        throw new BadRequestException('Invalid token hash format');
      }

      if (hash.length < 32 || hash.length > 128) {
        throw new BadRequestException(
          'Token hash length must be between 32 and 128 characters',
        );
      }

      // Optional: Validate hex format (if using hex-encoded HMAC)
      if (!/^[a-fA-F0-9]+$/.test(hash)) {
        throw new BadRequestException(
          'Token hash must be a valid hexadecimal string',
        );
      }
    }
  }
}
