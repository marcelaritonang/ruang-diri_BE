import * as Ably from 'ably';

import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { env } from '@/config/env.config';
import { ChatRepository } from '../infrastructure/chat.repository';

@Injectable()
export class AblyService {
  private readonly logger = new Logger(AblyService.name);
  private readonly client: Ably.Rest;

  constructor(
    private readonly configService: ConfigService,
    private readonly chatRepository: ChatRepository,
  ) {
    const apiKey =
      env.ABLY_API_KEY || this.configService.get<string>('ABLY_API_KEY');

    if (!apiKey) {
      throw new Error('ABLY_API_KEY is required');
    }

    this.client = new Ably.Rest({ key: apiKey });
  }

  private channel(sessionId: string) {
    return this.client.channels.get(`chat:session:${sessionId}`);
  }

  async generateToken(
    userId: string,
    sessionId: string,
    capability?: Ably.CapabilityOp,
  ): Promise<{
    token: Ably.TokenRequest;
    sessionId: string;
    channels: { chat: string };
    expiresAt: Date;
  }> {
    try {
      const session = await this.chatRepository.getChatSessionById(sessionId);

      if (session?.status === 'pending') {
        throw new BadRequestException(`Session ${sessionId} is still pending`);
      }

      if (!session) {
        throw new BadRequestException(`Session ${sessionId} not found`);
      }

      if (!session.scheduledAt) {
        throw new BadRequestException(
          `Session ${sessionId} does not have a scheduledAt time`,
        );
      }

      const defaultCapability = {
        [`chat:session:${sessionId}`]: ['publish', 'subscribe'],
      } as unknown as Ably.CapabilityOp;

      const ttlMs = 15 * 60 * 1000;
      const baseTime = new Date(session.scheduledAt);
      const expiresAt = new Date(baseTime.getTime() + ttlMs);

      const tokenRequest: Ably.TokenParams = {
        clientId: userId,
        capability: capability || defaultCapability,
        ttl: ttlMs,
      };

      const token = await this.client.auth.createTokenRequest(tokenRequest);

      this.logger.log(
        `Generated Ably token for user ${userId} in session ${sessionId}`,
      );
      this.logger.debug(`Token expires at: ${expiresAt.toISOString()}`);
      this.logger.debug(
        `Session scheduled at: ${session.scheduledAt?.toISOString() || 'null'}`,
      );

      return {
        token,
        sessionId,
        channels: {
          chat: `chat:session:${sessionId}`,
        },
        expiresAt,
      };
    } catch (error) {
      this.logger.error(
        `Failed to generate Ably token for user ${userId}:`,
        error,
      );
      throw error;
    }
  }

  async publishMessage(
    sessionId: string,
    message: {
      senderId: string;
      senderFullname: string;
      content: string;
      messageType: string;
      timestamp: Date;
      attachmentUrl?: string;
      attachmentType?: string;
      attachmentName?: string;
      isEncrypted?: boolean;
      encryptionType?: string;
      messageId?: string;
    },
  ): Promise<void> {
    try {
      const publishData = {
        senderId: message.senderId,
        senderFullname: message.senderFullname,
        content: message.content,
        messageType: message.messageType,
        timestamp: message.timestamp.toISOString(),
        ...(message.attachmentUrl && { attachmentUrl: message.attachmentUrl }),
        ...(message.attachmentType && {
          attachmentType: message.attachmentType,
        }),
        ...(message.attachmentName && {
          attachmentName: message.attachmentName,
        }),
        ...(message.isEncrypted && {
          isEncrypted: message.isEncrypted,
          encryptionType: message.encryptionType,
          messageId: message.messageId,
        }),
      };

      await this.channel(sessionId).publish('message', publishData);

      this.logger.log(
        `Published ${message.isEncrypted ? 'encrypted ' : ''}message to session ${sessionId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to publish message to session ${sessionId}:`,
        error,
      );
      throw error;
    }
  }

  async publishTypingIndicator(
    sessionId: string,
    userFullName: string,
    userId: string,
    isTyping: boolean,
  ): Promise<void> {
    try {
      await this.channel(sessionId).publish('typing', {
        userId,
        userFullName,
        isTyping,
        timestamp: new Date().toISOString(),
      });

      this.logger.log(
        `Published typing indicator for user ${userId} in session ${sessionId}`,
      );
    } catch (error) {
      this.logger.error(`Failed to publish typing indicator:`, error);
      throw error;
    }
  }

  async publishSessionStatus(
    sessionId: string,
    status: string,
    participants: string[],
  ): Promise<void> {
    try {
      await this.channel(sessionId).publish('session_status', {
        status,
        participants,
        timestamp: new Date().toISOString(),
      });

      this.logger.log(
        `Published session status ${status} for session ${sessionId}`,
      );
    } catch (error) {
      this.logger.error(`Failed to publish session status:`, error);
      throw error;
    }
  }

  async getChannelHistory(
    sessionId: string,
    limit: number = 10,
  ): Promise<Ably.Message[]> {
    try {
      const history = await this.channel(sessionId).history({ limit });
      return history.items;
    } catch (error) {
      this.logger.error(
        `Failed to get channel history for session ${sessionId}:`,
        error,
      );
      throw error;
    }
  }

  async publishUnreadCountUpdate(
    sessionId: string,
    userId: string,
    unreadCount: number,
  ): Promise<void> {
    try {
      await this.channel(sessionId).publish('unread_count_update', {
        userId,
        unreadCount,
        timestamp: new Date().toISOString(),
      });

      this.logger.log(
        `Published unread count update for user ${userId} in session ${sessionId}: ${unreadCount}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to publish unread count update for session ${sessionId}:`,
        error,
      );
      throw error;
    }
  }

  async publishTotalUnreadCountUpdate(
    sessionId: string,
    userId: string,
    totalUnreadCount: number,
  ): Promise<void> {
    try {
      await this.channel(sessionId).publish('total_unread_count', {
        userId,
        totalUnreadCount,
        timestamp: new Date().toISOString(),
      });

      this.logger.log(
        `Published total unread count update for user ${userId} in session ${sessionId}: ${totalUnreadCount}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to publish total unread count update for user ${userId} in session ${sessionId}:`,
        error,
      );
      throw error;
    }
  }

  async publishUserPresence(
    sessionId: string,
    userId: string,
    userFullname: string,
    status: 'present' | 'away',
    data?: Record<string, any>,
  ): Promise<void> {
    try {
      await this.channel(sessionId).publish('user_presence', {
        userId,
        userFullname,
        status,
        lastSeen: new Date().toISOString(),
        ...data,
        timestamp: new Date().toISOString(),
      });

      this.logger.log(
        `Published presence update for user ${userId} in session ${sessionId}: ${status}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to publish presence update for user ${userId} in session ${sessionId}:`,
        error,
      );
      throw error;
    }
  }

  async publishMessageReadStatus(
    sessionId: string,
    userId: string,
    userFullname: string,
    messageId: string,
    readAt: Date,
  ): Promise<void> {
    try {
      await this.channel(sessionId).publish('message_read', {
        userId,
        userFullname,
        messageId,
        readAt: readAt.toISOString(),
        timestamp: new Date().toISOString(),
      });

      this.logger.log(
        `Published message read status for message ${messageId} by user ${userId} in session ${sessionId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to publish message read status for session ${sessionId}:`,
        error,
      );
      throw error;
    }
  }

  async generatePresignedUploadUrl(
    fileId: string,
    contentTypeCategory: string,
    sizeCategory: string,
  ): Promise<string> {
    try {
      const uploadUrl = `https://uploads.example.com/e2e-files/${fileId}?category=${contentTypeCategory}&size=${sizeCategory}`;
      this.logger.log(`Generated presigned upload URL for file ${fileId}`);
      return uploadUrl;
    } catch (error) {
      this.logger.error(
        `Failed to generate presigned upload URL for file ${fileId}:`,
        error,
      );
      throw error;
    }
  }

  async publishDeliveryReceipt(
    sessionId: string,
    messageId: string,
    userId: string,
    deliveredAt: Date,
  ): Promise<void> {
    try {
      await this.channel(sessionId).publish('delivery_receipt', {
        messageId,
        userId,
        deliveredAt: deliveredAt.toISOString(),
        timestamp: new Date().toISOString(),
      });

      this.logger.log(
        `Published delivery receipt for message ${messageId} by user ${userId} in session ${sessionId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to publish delivery receipt for session ${sessionId}:`,
        error,
      );
      throw error;
    }
  }

  async publishReadReceipt(
    sessionId: string,
    messageIds: string[],
    userId: string,
    userFullname: string,
    readAt: Date,
  ): Promise<void> {
    try {
      await this.channel(sessionId).publish('read_receipt', {
        messageIds,
        userId,
        userFullname,
        readAt: readAt.toISOString(),
        timestamp: new Date().toISOString(),
      });

      this.logger.log(
        `Published read receipt for ${messageIds.length} messages by user ${userId} in session ${sessionId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to publish read receipt for session ${sessionId}:`,
        error,
      );
      throw error;
    }
  }

  async publishFileUpload(
    sessionId: string,
    fileData: {
      senderId: string;
      senderFullname: string;
      fileName: string;
      fileUrl: string;
      fileType: string;
      fileSize: number;
    },
  ): Promise<void> {
    try {
      await this.channel(sessionId).publish('file_upload', {
        ...fileData,
        timestamp: new Date().toISOString(),
      });

      this.logger.log(
        `Published file upload notification for session ${sessionId}: ${fileData.fileName}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to publish file upload notification for session ${sessionId}:`,
        error,
      );
      throw error;
    }
  }

  async publishNotification(
    sessionId: string,
    notification: {
      type: string;
      title: string;
      message: string;
      data?: Record<string, any>;
      targetUserId?: string;
    },
  ): Promise<void> {
    try {
      await this.channel(sessionId).publish('notification', {
        ...notification,
        timestamp: new Date().toISOString(),
      });

      this.logger.log(
        `Published notification for session ${sessionId}: ${notification.type}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to publish notification for session ${sessionId}:`,
        error,
      );
      throw error;
    }
  }
}
