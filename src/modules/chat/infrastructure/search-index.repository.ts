import { Injectable, Logger } from '@nestjs/common';
import { eq, and, inArray, sql, desc, asc } from 'drizzle-orm';

import { DrizzleService } from '@/common/drizzle/drizzle.service';

import {
  messageSearchIndex,
  type MessageSearchIndex,
  type CreateMessageSearchIndex,
} from '../domain/message-search-index.schema';

export interface SearchQueryResult {
  messageIds: string[];
  total: number;
  hasMore: boolean;
}

@Injectable()
export class SearchIndexRepository {
  private readonly logger = new Logger(SearchIndexRepository.name);

  constructor(private drizzle: DrizzleService) {}

  private get db() {
    return this.drizzle.db;
  }

  /**
   * Insert or update token hashes for a message.
   * This will replace existing token hashes for the message.
   */
  async upsertTokenHashes(
    messageId: string,
    sessionId: string,
    userId: string,
    tokenHashes: string[],
    keyVersion: number = 1,
  ): Promise<void> {
    try {
      // Start a transaction to ensure atomicity
      await this.db.transaction(async (tx) => {
        // First, remove existing token hashes for this message
        await tx
          .delete(messageSearchIndex)
          .where(eq(messageSearchIndex.messageId, messageId));

        // Then insert new token hashes
        if (tokenHashes.length > 0) {
          const insertData: CreateMessageSearchIndex[] = tokenHashes.map(
            (tokenHash) => ({
              messageId,
              sessionId,
              userId,
              tokenHash,
              keyVersion,
            }),
          );

          await tx.insert(messageSearchIndex).values(insertData);
        }
      });

      this.logger.log(
        `Upserted ${tokenHashes.length} token hashes for message ${messageId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to upsert token hashes for message ${messageId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Search for messages containing ALL of the provided trapdoors (AND operation).
   * Returns message IDs ordered by recency.
   */
  async queryByTrapdoors(
    userId: string,
    trapdoors: string[],
    options: {
      sessionId?: string;
      keyVersion?: number;
      limit?: number;
      offset?: number;
    } = {},
  ): Promise<SearchQueryResult> {
    try {
      const { sessionId, keyVersion = 1, limit = 20, offset = 0 } = options;

      if (trapdoors.length === 0) {
        return { messageIds: [], total: 0, hasMore: false };
      }

      // Build base conditions
      const baseConditions = [
        eq(messageSearchIndex.userId, userId),
        eq(messageSearchIndex.keyVersion, keyVersion),
        inArray(messageSearchIndex.tokenHash, trapdoors),
      ];

      if (sessionId) {
        baseConditions.push(eq(messageSearchIndex.sessionId, sessionId));
      }

      // Query to find messages that contain ALL trapdoors
      // We use a HAVING clause to ensure all trapdoors are present
      const searchQuery = this.db
        .select({
          messageId: messageSearchIndex.messageId,
          count: sql<number>`count(distinct ${messageSearchIndex.tokenHash})`,
        })
        .from(messageSearchIndex)
        .where(and(...baseConditions))
        .groupBy(messageSearchIndex.messageId)
        .having(
          sql`count(distinct ${messageSearchIndex.tokenHash}) = ${trapdoors.length}`,
        );

      // Get total count
      const countResult = await this.db
        .select({ count: sql<number>`count(*)` })
        .from(searchQuery.as('search_results'));

      const total = countResult[0]?.count || 0;

      if (total === 0) {
        return { messageIds: [], total: 0, hasMore: false };
      }

      // Get paginated results ordered by message creation time (most recent first)
      const results = await this.db
        .select({
          messageId: messageSearchIndex.messageId,
          maxCreatedAt: sql<Date>`max(${messageSearchIndex.createdAt})`,
        })
        .from(messageSearchIndex)
        .where(and(...baseConditions))
        .groupBy(messageSearchIndex.messageId)
        .having(
          sql`count(distinct ${messageSearchIndex.tokenHash}) = ${trapdoors.length}`,
        )
        .orderBy(sql`max(${messageSearchIndex.createdAt}) desc`)
        .limit(limit)
        .offset(offset);

      const messageIds = results.map((r) => r.messageId);
      const hasMore = offset + limit < total;

      this.logger.log(
        `Search query found ${messageIds.length} messages out of ${total} total matches`,
      );

      return {
        messageIds,
        total,
        hasMore,
      };
    } catch (error) {
      this.logger.error('Failed to query by trapdoors:', error);
      throw error;
    }
  }

  /**
   * Remove all token hashes for a specific message
   */
  async removeTokenHashes(messageId: string): Promise<void> {
    try {
      const result = await this.db
        .delete(messageSearchIndex)
        .where(eq(messageSearchIndex.messageId, messageId))
        .returning({ id: messageSearchIndex.id });

      this.logger.log(
        `Removed ${result.length} token hashes for message ${messageId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to remove token hashes for message ${messageId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Bulk remove token hashes for multiple messages
   */
  async bulkRemoveTokenHashes(messageIds: string[]): Promise<void> {
    if (messageIds.length === 0) return;

    try {
      const result = await this.db
        .delete(messageSearchIndex)
        .where(inArray(messageSearchIndex.messageId, messageIds))
        .returning({ id: messageSearchIndex.id });

      this.logger.log(
        `Bulk removed ${result.length} token hashes for ${messageIds.length} messages`,
      );
    } catch (error) {
      this.logger.error('Failed to bulk remove token hashes:', error);
      throw error;
    }
  }

  /**
   * Remove all token hashes for a specific session
   */
  async removeSessionTokenHashes(sessionId: string): Promise<void> {
    try {
      const result = await this.db
        .delete(messageSearchIndex)
        .where(eq(messageSearchIndex.sessionId, sessionId))
        .returning({ id: messageSearchIndex.id });

      this.logger.log(
        `Removed ${result.length} token hashes for session ${sessionId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to remove token hashes for session ${sessionId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Remove all token hashes for a specific user (useful for user deletion)
   */
  async removeUserTokenHashes(userId: string): Promise<void> {
    try {
      const result = await this.db
        .delete(messageSearchIndex)
        .where(eq(messageSearchIndex.userId, userId))
        .returning({ id: messageSearchIndex.id });

      this.logger.log(
        `Removed ${result.length} token hashes for user ${userId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to remove token hashes for user ${userId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get token hash count for a specific message (useful for debugging)
   */
  async getTokenHashCount(messageId: string): Promise<number> {
    try {
      const result = await this.db
        .select({ count: sql<number>`count(*)` })
        .from(messageSearchIndex)
        .where(eq(messageSearchIndex.messageId, messageId));

      return result[0]?.count || 0;
    } catch (error) {
      this.logger.error(
        `Failed to get token hash count for message ${messageId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Cleanup old token hashes (for maintenance)
   * Removes token hashes older than the specified date
   */
  async cleanupOldTokenHashes(olderThan: Date): Promise<number> {
    try {
      const result = await this.db
        .delete(messageSearchIndex)
        .where(sql`${messageSearchIndex.createdAt} < ${olderThan}`)
        .returning({ id: messageSearchIndex.id });

      this.logger.log(
        `Cleaned up ${result.length} old token hashes older than ${olderThan.toISOString()}`,
      );

      return result.length;
    } catch (error) {
      this.logger.error('Failed to cleanup old token hashes:', error);
      throw error;
    }
  }

  /**
   * Get statistics about the search index
   */
  async getSearchIndexStats(): Promise<{
    totalTokenHashes: number;
    uniqueMessages: number;
    uniqueUsers: number;
    keyVersions: number[];
  }> {
    try {
      const [totalResult, messagesResult, usersResult, keyVersionsResult] =
        await Promise.all([
          this.db
            .select({ count: sql<number>`count(*)` })
            .from(messageSearchIndex),
          this.db
            .select({
              count: sql<number>`count(distinct ${messageSearchIndex.messageId})`,
            })
            .from(messageSearchIndex),
          this.db
            .select({
              count: sql<number>`count(distinct ${messageSearchIndex.userId})`,
            })
            .from(messageSearchIndex),
          this.db
            .select({ keyVersion: messageSearchIndex.keyVersion })
            .from(messageSearchIndex)
            .groupBy(messageSearchIndex.keyVersion)
            .orderBy(asc(messageSearchIndex.keyVersion)),
        ]);

      return {
        totalTokenHashes: totalResult[0]?.count || 0,
        uniqueMessages: messagesResult[0]?.count || 0,
        uniqueUsers: usersResult[0]?.count || 0,
        keyVersions: keyVersionsResult.map((r) => r.keyVersion),
      };
    } catch (error) {
      this.logger.error('Failed to get search index stats:', error);
      throw error;
    }
  }
}
