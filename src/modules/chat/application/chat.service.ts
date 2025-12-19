import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Inject,
  Optional,
} from '@nestjs/common';

import { SuccessResponse } from '@/common/utils/response.util';
import { uploadImageToGCS } from '@/common/utils/image.util';
import { CloudStorageService } from '@/common/cloud-storage/cloud-storage.service';

import { Role } from '@/modules/auth/decorators/roles.decorator';
import { CounselingsRepository } from '@/modules/mental-health/infrastructure/counselings.repository';
import {
  statusAppointment,
  type IStatusAppointment,
} from '@/modules/mental-health/constants/counseling.constant';
import { ChatAutomationQueue } from '@/queue/chat/chat-automation.queue';
import { UsersRepository } from '@/modules/users/infrastructure/users.repository';

import { ChatRepository } from '../infrastructure/chat.repository';
import { AblyService } from './ably.service';
import type {
  ChatMessageDto,
  ChatFileUploadDto,
  GetChatHistoryDto,
  AblyTokenRequestDto,
} from '../domain/dto/chat.dto';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly chatRepository: ChatRepository,
    private readonly ablyService: AblyService,
    private readonly counselingsRepository: CounselingsRepository,
    @Optional() @Inject(ChatAutomationQueue)
    private readonly chatAutomationQueue: ChatAutomationQueue | null,
    private readonly usersRepository: UsersRepository,
    private readonly cloudStorageService: CloudStorageService,
  ) {}

  private async getUserTimezone(userId: string): Promise<string> {
    try {
      const user = await this.usersRepository.getUserProfile(userId);
      return user?.timezone || 'Asia/Jakarta';
    } catch (error) {
      this.logger.warn(
        `Failed to get timezone for user ${userId}, using default: ${error.message}`,
      );
      return 'Asia/Jakarta';
    }
  }

  async sendAutomatedMessage(
    sessionId: string,
    userFullname: string,
    content: string,
    messageType: 'initial' | 'start' | 'system' = 'system',
  ): Promise<void> {
    try {
      const session = await this.chatRepository.getChatSessionById(sessionId);
      if (!session) {
        throw new NotFoundException('Chat session not found');
      }

      // Save system message with system type
      await this.chatRepository.addMessage({
        sessionId,
        senderId: session.psychologistId,
        message: content,
        messageType: 'automated', // Always mark as automated type
        isAutomated: true,
      });

      // Publish to realtime with automated type
      await this.ablyService.publishMessage(sessionId, {
        senderId: session.psychologistId,
        senderFullname: userFullname,
        content,
        messageType: 'automated', // Render as automated, not from user
        timestamp: new Date(),
      });

      this.logger.log(
        `Sent automated message for session ${sessionId}: ${messageType}`,
      );
    } catch (error) {
      this.logger.error(`Error sending automated message: ${error.message}`);
      throw error;
    }
  }

  async enableChatForSession(sessionId: string): Promise<void> {
    try {
      await this.chatRepository.updateChatSession(sessionId, {
        status: 'active',
        isActive: true,
        startedAt: new Date(),
      });

      this.logger.log(`Chat enabled for session ${sessionId}`);
    } catch (error) {
      this.logger.error(`Error enabling chat for session: ${error.message}`);
      throw error;
    }
  }

  async getAttachmentsBySessionId(sessionId: string): Promise<any> {
    try {
      const attachments = await this.chatRepository.getAttachmentsWithSenderInfo(sessionId);

      // Generate signed URLs for attachments and profile pictures
      const attachmentsWithSignedUrls = await Promise.all(
        attachments.map(async (attachment: any) => {
          const result: any = { ...attachment };

          // Generate signed URL for attachment
          if (attachment.attachmentUrl) {
            result.attachmentSignedUrl = await this.cloudStorageService.getSignedUrl(
              attachment.attachmentUrl,
              { expiresIn: 60 },
            );
          }

          // Generate signed URL for sender profile picture
          if (attachment.sender?.profilePicture) {
            result.sender = {
              ...attachment.sender,
              profilePictureUrl: await this.cloudStorageService.getSignedUrl(
                attachment.sender.profilePicture,
                { expiresIn: 60 },
              ),
            };
          }

          return result;
        }),
      );

      return SuccessResponse.success(
        attachmentsWithSignedUrls,
        'Chat attachments retrieved successfully',
      );
    } catch (error) {
      this.logger.error(
        `Error fetching chat attachments: ${error.message}`,
      );
      throw error;
    }
  }

  async forceActivateSession(sessionId: string): Promise<void> {
    try {
      this.logger.log(`🔥 FORCE ACTIVATING: Session ${sessionId}`);

      const session = await this.chatRepository.getChatSessionById(sessionId);
      if (!session) {
        throw new NotFoundException('Chat session not found');
      }

      // Enable the session
      await this.enableChatForSession(sessionId);

      // Send welcome message
      const psychologist = await this.usersRepository.getUserProfile(
        session.psychologistId,
      );
      await this.sendAutomatedMessage(
        sessionId,
        psychologist?.fullName || 'Psikolog',
        'Sesi konseling dimulai! Silakan ceritakan apa yang ingin Anda bagikan hari ini. Saya siap mendengarkan',
        'start',
      );

      // Publish session status
      await this.ablyService.publishSessionStatus(sessionId, 'chat_enabled', [
        session.clientId,
        session.psychologistId,
      ]);

      // Publish notification
      await this.ablyService.publishNotification(sessionId, {
        type: 'session_started',
        title: 'Sesi Konseling Dimulai',
        message:
          'Sesi konseling Anda telah dimulai. Silakan mulai berinteraksi.',
        data: {
          sessionId,
          startedAt: new Date().toISOString(),
        },
      });

      this.logger.log(
        `🎯 FORCE ACTIVATION: Session ${sessionId} activated successfully`,
      );
    } catch (error) {
      this.logger.error(`💥 FORCE ACTIVATION ERROR: ${error.message}`);
      throw error;
    }
  }

  async checkAndActivateOverdueSessions(): Promise<void> {
    try {
      // Find sessions that should be active but aren't
      // This is a fallback in case the scheduled jobs failed
      const now = new Date();
      const overdueSessions =
        await this.chatRepository.findOverduePendingSessions(now);

      for (const session of overdueSessions) {
        this.logger.warn(
          `Found overdue session ${session.id} scheduled at ${session.scheduledAt}, activating now`,
        );

        // Enable the session
        await this.enableChatForSession(session.id);

        // Send the welcome message
        const psychologist = await this.usersRepository.getUserProfile(
          session.psychologistId,
        );
        await this.sendAutomatedMessage(
          session.id,
          psychologist?.fullName || 'Psikolog',
          'Sesi konseling dimulai! Silakan ceritakan apa yang ingin Anda bagikan hari ini. Saya siap mendengarkan',
          'start',
        );

        // Publish session status
        await this.ablyService.publishSessionStatus(
          session.id,
          'chat_enabled',
          [session.clientId, session.psychologistId],
        );

        // Schedule auto-end
        const endTime = new Date(
          new Date(session.scheduledAt).getTime() + 60 * 60 * 1000,
        ); // 1 hour from start
        const userTimezone = await this.getUserTimezone(session.clientId);
        if (this.chatAutomationQueue) {
          await this.chatAutomationQueue.scheduleAutoEndAt(
            session.id,
            psychologist?.fullName || 'Psikolog',
            endTime,
            userTimezone,
          );
        } else {
          this.logger.warn(`Queue not available - skipping auto-end schedule for session ${session.id}`);
        }
      }

      if (overdueSessions.length > 0) {
        this.logger.log(`Activated ${overdueSessions.length} overdue sessions`);
      }
    } catch (error) {
      this.logger.error(`Error checking overdue sessions: ${error.message}`);
    }
  }

  async getChatSessionStatus(
    userId: string,
    sessionId: string,
  ): Promise<SuccessResponse> {
    try {
      const isParticipant =
        await this.chatRepository.isUserParticipantInSession(userId, sessionId);

      if (!isParticipant) {
        throw new ForbiddenException(
          'You are not a participant in this session',
        );
      }

      const session = await this.chatRepository.getChatSessionById(sessionId);

      if (!session) {
        throw new NotFoundException('Chat session not found');
      }

      return SuccessResponse.success(
        {
          sessionId: session.id,
          status: session.status,
          isActive: session.isActive,
          scheduledAt: session.scheduledAt,
          startedAt: session.startedAt,
          endedAt: session.endedAt,
          clientId: session.clientId,
          psychologistId: session.psychologistId,
          counselingId: session.counselingId,
        },
        'Chat session status retrieved successfully',
      );
    } catch (error) {
      this.logger.error(`Error getting chat session status: ${error.message}`);
      throw error;
    }
  }

  async autoEndSession(sessionId: string, userFullname: string): Promise<void> {
    try {
      this.logger.log(
        `🎯 AUTO-END: Starting auto-end process for session ${sessionId}`,
      );

      // Read fresh session status to ensure it's still valid
      const session = await this.chatRepository.getChatSessionById(sessionId);

      if (!session) {
        this.logger.warn(`AUTO-END: Session ${sessionId} not found`);
        return;
      }

      if (session.status !== 'active') {
        this.logger.warn(
          `AUTO-END: Session ${sessionId} is not active (status: ${session.status}). Skipping auto-end.`,
        );
        return;
      }

      // End the session
      const updatedSession = await this.chatRepository.updateChatSession(
        sessionId,
        {
          status: 'ended', // Status changes to 'ended'
          endedAt: new Date(),
          isActive: false,
        },
      );

      // Automation only triggers when status truly changes to 'ended'
      // Send system message for session closure
      await this.chatRepository.addMessage({
        sessionId,
        senderId: session.psychologistId,
        message:
          'Sesi konseling telah berakhir. Terima kasih telah berbagi dengan saya hari ini. Jaga diri dengan baik ya! 💙',
        messageType: 'automated', // Always automated type
        isAutomated: true,
      });

      await this.ablyService.publishMessage(sessionId, {
        senderId: session.psychologistId,
        senderFullname: userFullname,
        content:
          'Sesi konseling telah berakhir. Terima kasih telah berbagi dengan saya hari ini. Jaga diri dengan baik ya! 💙',
        messageType: 'automated', // Render as automated
        timestamp: new Date(),
      });

      await this.ablyService.publishSessionStatus(sessionId, 'completed', [
        session.clientId,
        session.psychologistId,
      ]);

      await this.ablyService.publishNotification(sessionId, {
        type: 'session_ended',
        title: 'Sesi Konseling Berakhir',
        message:
          'Sesi konseling Anda telah berakhir. Terima kasih atas partisipasinya.',
        data: {
          sessionId,
          endedAt: new Date().toISOString(),
          reason: 'auto_end',
        },
      });

      if (session.counselingId) {
        await this.counselingsRepository.updateCounselingStatus(
          session.counselingId,
          statusAppointment.COMPLETED,
        );
        this.logger.log(
          `Updated counseling ${session.counselingId} status to completed`,
        );
      }

      this.logger.log(
        `🎯 AUTO-END: Session ${sessionId} auto-ended successfully`,
      );
    } catch (error) {
      this.logger.error(
        `💥 AUTO-END ERROR: Failed to auto-end session ${sessionId}: ${error.message}`,
      );
      throw error;
    }
  }

  async createCounselingChatSession(
    clientId: string,
    psychologistId: string,
    counselingId: string,
    scheduledAt: Date,
  ): Promise<SuccessResponse> {
    try {
      const activeSessions = await this.chatRepository.getUserActiveSessions(
        clientId,
        'client',
      );

      if (activeSessions.length > 0) {
        throw new BadRequestException(
          'You already have an active chat session',
        );
      }

      // IMPORTANT: Psychologist capacity check is disabled for now
      // const psychologistSessions =
      //   await this.chatRepository.getPsychologistActiveSessions(psychologistId);

      // if (psychologistSessions.length >= 2) {
      //   throw new BadRequestException(
      //     'Psychologist is currently at capacity. Please try another psychologist.',
      //   );
      // }

      const existingActiveSession =
        await this.chatRepository.findActiveSessionBetweenParticipants(
          clientId,
          psychologistId,
        );

      if (existingActiveSession) {
        return SuccessResponse.success(
          {
            sessionId: existingActiveSession.id,
            psychologistId,
            status: existingActiveSession.status,
            isExisting: true,
          },
          'Existing active chat session found for counseling',
        );
      }

      const lastSession =
        await this.chatRepository.findLastSessionBetweenParticipants(
          clientId,
          psychologistId,
        );

      let session: any;

      if (
        lastSession &&
        (lastSession.status === 'completed' || lastSession.status === 'ended')
      ) {
        session = await this.chatRepository.updateChatSession(lastSession.id, {
          counselingId,
          status: 'pending',
          isActive: false,
          scheduledAt,
          startedAt: null,
          endedAt: null,
        });

        this.logger.log(
          `Reactivated existing chat session ${session.id} for counseling ${counselingId} with continuity (previous status: ${lastSession.status})`,
        );
      } else {
        session = await this.chatRepository.createChatSession({
          clientId,
          psychologistId,
          counselingId,
          status: 'pending',
          isActive: false,
          scheduledAt,
          startedAt: null,
        });

        this.logger.log(
          `Created new counseling chat session ${session.id} for counseling ${counselingId}`,
        );
      }

      return SuccessResponse.success(
        {
          sessionId: session.id,
          psychologistId,
          counselingId,
          status: session.status,
          scheduledAt,
          isExisting: !!lastSession,
        },
        lastSession
          ? 'Existing chat session reactivated for counseling with continuity'
          : 'Counseling chat session created successfully',
      );
    } catch (error) {
      this.logger.error(
        `Error creating counseling chat session: ${error.message}`,
      );
      throw error;
    }
  }

  async endChatSession(
    userId: string,
    sessionId: string,
  ): Promise<SuccessResponse> {
    try {
      const isParticipant =
        await this.chatRepository.isUserParticipantInSession(userId, sessionId);

      if (!isParticipant) {
        throw new ForbiddenException(
          'You are not a participant in this session',
        );
      }

      const session = await this.chatRepository.getChatSessionById(sessionId);

      if (!session) {
        throw new NotFoundException('Chat session not found');
      }

      if (session.status !== 'active') {
        throw new BadRequestException(`Chat session is already ended.`);
      }

      const updatedSession = await this.chatRepository.updateChatSession(
        sessionId,
        {
          status: 'completed',
          endedAt: new Date(),
          isActive: false,
        },
      );

      if (this.chatAutomationQueue) {
        await this.chatAutomationQueue.removeAutoEnd(sessionId);
        this.logger.log(
          `Cancelled auto-end job for manually ended session ${sessionId}`,
        );
      } else {
        this.logger.warn(`Queue not available - skipping auto-end removal for session ${sessionId}`);
      }

      await this.ablyService.publishSessionStatus(sessionId, 'completed', [
        session.clientId,
        session.psychologistId,
      ]);

      await this.ablyService.publishNotification(sessionId, {
        type: 'session_ended',
        title: 'Sesi Konseling Berakhir',
        message: 'Sesi konseling telah diakhiri oleh salah satu peserta.',
        data: {
          sessionId,
          endedAt: new Date().toISOString(),
          reason: 'manual_end',
          endedBy: userId,
        },
      });

      if (session.counselingId) {
        await this.counselingsRepository.updateCounselingStatus(
          session.counselingId,
          'completed' as IStatusAppointment,
        );
        this.logger.log(
          `Updated counseling ${session.counselingId} status to completed`,
        );
      }

      this.logger.log(`Chat session ${sessionId} ended by user ${userId}`);

      return SuccessResponse.success(
        updatedSession,
        'Chat session ended successfully',
      );
    } catch (error) {
      this.logger.error(`Error ending chat session: ${error.message}`);
      throw error;
    }
  }

  async generateAblyToken(
    userId: string,
    tokenRequest: AblyTokenRequestDto,
  ): Promise<SuccessResponse> {
    try {
      const { sessionId } = tokenRequest;

      const isParticipant =
        await this.chatRepository.isUserParticipantInSession(userId, sessionId);
      if (!isParticipant) {
        throw new ForbiddenException(
          'You are not a participant in this chat session',
        );
      }

      const session = await this.chatRepository.getChatSessionById(sessionId);
      if (!session) {
        throw new NotFoundException('Chat session not found');
      }

      this.logger.log(
        `🔍 TOKEN DEBUG: Session ${sessionId} - Status: ${session.status}, IsActive: ${session.isActive}, ScheduledAt: ${session.scheduledAt}`,
      );

      // Initialize user presence as 'present' when they connect to the session
      await this.chatRepository.updateUserPresence(
        sessionId,
        userId,
        'present',
      );
      this.logger.log(
        `User ${userId} connected to session ${sessionId} - presence set to 'present'`,
      );

      if (
        session.status === 'pending' &&
        !session.isActive &&
        session.scheduledAt &&
        new Date() >= new Date(session.scheduledAt)
      ) {
        await this.enableChatForSession(sessionId);

        const psychologist = await this.usersRepository.getUserProfile(
          session.psychologistId,
        );
        await this.sendAutomatedMessage(
          sessionId,
          psychologist?.fullName || 'Psikolog',
          'Sesi konseling dimulai! Silakan ceritakan apa yang ingin Anda bagikan hari ini. Saya siap mendengarkan',
          'start',
        );

        await this.ablyService.publishSessionStatus(sessionId, 'chat_enabled', [
          session.clientId,
          session.psychologistId,
        ]);

        await this.ablyService.publishNotification(sessionId, {
          type: 'session_started',
          title: 'Sesi Konseling Dimulai',
          message:
            'Sesi konseling Anda telah dimulai. Silakan mulai berinteraksi.',
          data: { sessionId, startedAt: new Date().toISOString() },
        });

        const endTime = new Date(
          new Date(session.scheduledAt).getTime() + 60 * 60 * 1000,
        );
        const userTimezone = await this.getUserTimezone(session.clientId);
        if (this.chatAutomationQueue) {
          try {
            await this.chatAutomationQueue.scheduleAutoEndAt(
              sessionId,
              psychologist?.fullName || 'Psikolog',
              endTime,
              userTimezone,
            );
          } catch (error) {
            this.logger.warn(
              `Failed to schedule auto-end for session ${sessionId}: ${error.message}`,
            );
          }
        } else {
          this.logger.warn(`Queue not available - skipping auto-end schedule for session ${sessionId}`);
        }

        const updatedSession =
          await this.chatRepository.getChatSessionById(sessionId);
        if (updatedSession) {
          session.status = updatedSession.status;
          session.isActive = updatedSession.isActive;
        }
      }

      if (!['pending', 'active'].includes(session.status)) {
        throw new BadRequestException(
          `Chat session is ${session.status}. Cannot generate token.`,
        );
      }

      const tokenData = await this.ablyService.generateToken(userId, sessionId);

      this.logger.log(
        `Generated Ably token for user ${userId} in session ${sessionId}`,
      );

      const response = {
        token: tokenData.token,
        sessionId: tokenData.sessionId,
        channels: { chat: tokenData.channels.chat },
        expiresAt: tokenData.expiresAt,
      };

      return SuccessResponse.success(
        response,
        'Ably token generated successfully',
      );
    } catch (error) {
      this.logger.error(`Error generating Ably token: ${error.message}`);
      throw error;
    }
  }

  async sendMessage(
    user: { userId: string; userFullname: string },
    messageDto: ChatMessageDto,
  ): Promise<SuccessResponse> {
    try {
      const { sessionId, message, messageType } = messageDto;

      let trimmedMessage = message;

      if (messageType === 'text') {
        trimmedMessage = message?.trim();
        if (!trimmedMessage) {
          throw new BadRequestException('You cannot send an empty message');
        }
      }

      const isParticipant =
        await this.chatRepository.isUserParticipantInSession(
          user.userId,
          sessionId,
        );

      if (!isParticipant) {
        throw new ForbiddenException(
          'You are not a participant in this chat session',
        );
      }

      const session = await this.chatRepository.getChatSessionById(sessionId);

      if (!session) {
        throw new NotFoundException('Session not found');
      }

      if (session.status !== 'active') {
        throw new ForbiddenException(
          'Session is not active, cannot send message',
        );
      }

      const messageContent =
        messageType === 'text' ? trimmedMessage || '' : message || '';

      const chatMessage = await this.chatRepository.addMessage({
        sessionId,
        senderId: user.userId,
        message: messageContent,
        messageType,
      });

      await this.ablyService.publishMessage(sessionId, {
        senderId: user.userId,
        senderFullname: user.userFullname,
        content: messageContent,
        messageType,
        timestamp: chatMessage.createdAt,
        messageId: chatMessage.id,
      });

      await this.ablyService.publishDeliveryReceipt(
        sessionId,
        chatMessage.id,
        user.userId,
        chatMessage.createdAt,
      );

      const otherParticipantId =
        session.clientId === user.userId
          ? session.psychologistId
          : session.clientId;

      const unreadCount = await this.chatRepository.getUnreadMessageCount(
        sessionId,
        otherParticipantId,
      );

      await this.ablyService.publishUnreadCountUpdate(
        sessionId,
        otherParticipantId,
        unreadCount,
      );

      // Get and publish total unread count for the other participant
      const totalUnreadData = await this.getTotalUnreadCount(
        otherParticipantId,
        session.clientId === otherParticipantId ? 'client' : 'psychologist',
      );

      await this.ablyService.publishTotalUnreadCountUpdate(
        sessionId,
        otherParticipantId,
        (totalUnreadData as any).data.totalUnread,
      );

      if (messageType === 'text' && messageContent.trim()) {
        await this.ablyService.publishNotification(sessionId, {
          type: 'new_message',
          title: `Pesan baru dari ${user.userFullname}`,
          message:
            messageContent.length > 50
              ? messageContent.substring(0, 50) + '...'
              : messageContent,
          data: {
            messageId: chatMessage.id,
            senderId: user.userId,
            senderName: user.userFullname,
          },
          targetUserId: otherParticipantId,
        });
      }

      this.logger.log(
        `Message sent by user ${user.userFullname} in session ${sessionId}`,
      );

      return SuccessResponse.success(
        {
          ...chatMessage,
          message: messageContent,
        },
        'Message sent successfully',
      );
    } catch (error) {
      this.logger.error(`Error sending message: ${error.message}`);
      throw error;
    }
  }

  async getChatHistory(
    userId: string,
    historyDto: GetChatHistoryDto,
  ): Promise<SuccessResponse> {
    try {
      const { sessionId, cursor, limit } = historyDto;

      const isParticipant =
        await this.chatRepository.isUserParticipantInSession(userId, sessionId);

      if (!isParticipant) {
        throw new ForbiddenException(
          'You are not a participant in this chat session',
        );
      }

      const history = await this.chatRepository.getChatHistory(
        sessionId,
        cursor,
        limit,
      );

      // Generate signed URLs for attachments
      if (history.data) {
        history.data = await Promise.all(
          history.data.map(async (message: any) => {
            const result: any = { ...message };
            
            // Generate signed URL for attachment if it exists
            if (message.attachmentUrl) {
              result.attachmentSignedUrl = await this.cloudStorageService.getSignedUrl(
                message.attachmentUrl,
                { expiresIn: 60 }, // 60 minutes
              );
            }
            
            // Generate signed URL for sender profile picture if it exists
            if (message.sender?.profilePicture) {
              result.sender = {
                ...message.sender,
                profilePictureUrl: await this.cloudStorageService.getSignedUrl(
                  message.sender.profilePicture,
                  { expiresIn: 60 },
                ),
              };
            }
            
            return result;
          }),
        );
      }

      this.logger.log(
        `Retrieved chat history for session ${sessionId} (cursor: ${cursor || 'none'})`,
      );

      return SuccessResponse.success(
        history,
        'Chat history retrieved successfully',
      );
    } catch (error) {
      this.logger.error(`Error retrieving chat history: ${error.message}`);
      throw error;
    }
  }

  async getUserActiveSessions(
    userId: string,
    role: Role,
  ): Promise<SuccessResponse> {
    try {
      const sessions = await this.chatRepository.getUserActiveSessions(
        userId,
        role,
      );

      return SuccessResponse.success(
        sessions,
        'Active sessions retrieved successfully',
      );
    } catch (error) {
      this.logger.error(`Error retrieving active sessions: ${error.message}`);
      throw error;
    }
  }

  async markMessagesAsRead(
    userId: string,
    sessionId: string,
  ): Promise<SuccessResponse> {
    try {
      const isParticipant =
        await this.chatRepository.isUserParticipantInSession(userId, sessionId);

      if (!isParticipant) {
        throw new ForbiddenException(
          'You are not a participant in this chat session',
        );
      }

      const unreadMessages = await this.chatRepository.getUnreadMessages(
        sessionId,
        userId,
      );

      await this.chatRepository.markMessagesAsRead(sessionId, userId);

      // Check if the current user is present before sending read receipts
      const currentUserPresence = await this.chatRepository.getUserPresence(
        sessionId,
        userId,
      );

      // Only send read receipts if the user is present (not away)
      const shouldSendReadReceipts =
        !currentUserPresence || currentUserPresence.status === 'present';

      if (shouldSendReadReceipts) {
        const user = await this.usersRepository.getUserProfile(userId);
        for (const message of unreadMessages) {
          await this.ablyService.publishMessageReadStatus(
            sessionId,
            userId,
            user?.fullName || 'Unknown User',
            message.id,
            new Date(),
          );
        }

        if (unreadMessages.length > 0) {
          const messageIds = unreadMessages.map((msg) => msg.id);
          await this.ablyService.publishReadReceipt(
            sessionId,
            messageIds,
            userId,
            user?.fullName,
            new Date(),
          );
        }

        this.logger.log(
          `Published read receipts for ${unreadMessages.length} messages by user ${userId} in session ${sessionId}`,
        );
      } else {
        this.logger.log(
          `Skipped read receipts for user ${userId} in session ${sessionId} - user is away`,
        );
      }

      await this.ablyService.publishUnreadCountUpdate(sessionId, userId, 0);

      // Get and publish updated total unread count for the user
      const userProfile = await this.usersRepository.getUserProfile(userId);
      const userRole = userProfile?.role as Role;
      const totalUnreadData = await this.getTotalUnreadCount(userId, userRole);

      await this.ablyService.publishTotalUnreadCountUpdate(
        sessionId,
        userId,
        (totalUnreadData as any).data.totalUnread,
      );

      this.logger.log(
        `Marked ${unreadMessages.length} messages as read for user ${userId} in session ${sessionId}`,
      );

      return SuccessResponse.success(
        { readCount: unreadMessages.length },
        'Messages marked as read',
      );
    } catch (error) {
      this.logger.error(`Error marking messages as read: ${error.message}`);
      throw error;
    }
  }

  async handleTypingIndicator(
    userId: string,
    userFullName: string,
    sessionId: string,
    isTyping: boolean,
  ): Promise<void> {
    const isParticipant = await this.chatRepository.isUserParticipantInSession(
      userId,
      sessionId,
    );

    if (!isParticipant) {
      throw new ForbiddenException(
        'You are not a participant in this chat session',
      );
    }

    await this.ablyService.publishTypingIndicator(
      sessionId,
      userFullName,
      userId,
      isTyping,
    );
  }

  async sendFileMessage(
    user: { userId: string; userFullname: string },
    fileDto: ChatFileUploadDto,
    file: Express.Multer.File,
    cloudStorageService: CloudStorageService, // ADD THIS PARAMETER
  ): Promise<SuccessResponse> {
    try {
      const { sessionId, text, messageType } = fileDto;

      const isParticipant =
        await this.chatRepository.isUserParticipantInSession(
          user.userId,
          sessionId,
        );

      if (!isParticipant) {
        throw new ForbiddenException(
          'You are not a participant in this chat session',
        );
      }

      const session = await this.chatRepository.getChatSessionById(sessionId);

      if (!session || session.status !== 'active') {
        throw new BadRequestException('Chat session is not active');
      }

      // Upload file to GCS and get relative path
      const filePath = await uploadImageToGCS(
        file,
        'chat-attachments',
        cloudStorageService,
      );

      const chatMessage = await this.chatRepository.addMessage({
        sessionId,
        senderId: user.userId,
        message: text || file.originalname,
        messageType,
        attachmentUrl: filePath, // Store relative path: "chat-attachments/file-123.jpg"
        attachmentType: file.mimetype,
        attachmentName: file.originalname,
        attachmentSize: file.size,
      });

      // Generate signed URL for realtime publishing
      const signedUrl = await cloudStorageService.getSignedUrl(filePath, {
        expiresIn: 60,
      });

      await this.ablyService.publishMessage(sessionId, {
        senderId: user.userId,
        senderFullname: user.userFullname,
        content: text || file.originalname,
        messageType,
        timestamp: chatMessage.createdAt,
        attachmentUrl: signedUrl, // Publish signed URL for immediate access
        attachmentType: file.mimetype,
        attachmentName: file.originalname,
      });

      await this.ablyService.publishDeliveryReceipt(
        sessionId,
        chatMessage.id,
        user.userId,
        chatMessage.createdAt,
      );

      await this.ablyService.publishFileUpload(sessionId, {
        senderId: user.userId,
        senderFullname: user.userFullname,
        fileName: file.originalname,
        fileUrl: signedUrl, // Use signed URL
        fileType: file.mimetype,
        fileSize: file.size,
      });

      const otherParticipantId =
        session.clientId === user.userId
          ? session.psychologistId
          : session.clientId;

      const unreadCount = await this.chatRepository.getUnreadMessageCount(
        sessionId,
        otherParticipantId,
      );

      await this.ablyService.publishUnreadCountUpdate(
        sessionId,
        otherParticipantId,
        unreadCount,
      );

      // Get and publish total unread count for the other participant
      const otherUserProfile =
        await this.usersRepository.getUserProfile(otherParticipantId);
      const otherUserRole = otherUserProfile?.role as Role;
      const totalUnreadData = await this.getTotalUnreadCount(
        otherParticipantId,
        otherUserRole,
      );

      await this.ablyService.publishTotalUnreadCountUpdate(
        sessionId,
        otherParticipantId,
        (totalUnreadData as any).data.totalUnread,
      );

      await this.ablyService.publishNotification(sessionId, {
        type: 'file_received',
        title: `File baru dari ${user.userFullname}`,
        message: `${file.originalname} (${(file.size / 1024 / 1024).toFixed(1)} MB)`,
        data: {
          messageId: chatMessage.id,
          senderId: user.userId,
          senderName: user.userFullname,
          fileName: file.originalname,
          fileSize: file.size,
          fileType: file.mimetype,
        },
        targetUserId: otherParticipantId,
      });

      this.logger.log(
        `File message sent by user ${user.userFullname} in session ${sessionId}: ${file.originalname}`,
      );

      // Return response with signed URL
      return SuccessResponse.success(
        {
          ...chatMessage,
          attachmentSignedUrl: signedUrl, // Include signed URL in response
        },
        'File message sent successfully',
      );
    } catch (error) {
      this.logger.error(`Error sending file message: ${error.message}`);
      throw error;
    }
  }

  async getUnreadMessageCount(
    userId: string,
    sessionId: string,
  ): Promise<SuccessResponse> {
    try {
      const isParticipant =
        await this.chatRepository.isUserParticipantInSession(userId, sessionId);

      if (!isParticipant) {
        throw new ForbiddenException(
          'You are not a participant in this chat session',
        );
      }

      const unreadCount = await this.chatRepository.getUnreadMessageCount(
        sessionId,
        userId,
      );

      return SuccessResponse.success(
        { unreadCount },
        'Unread message count retrieved successfully',
      );
    } catch (error) {
      this.logger.error(`Error getting unread message count: ${error.message}`);
      throw error;
    }
  }

  async getTotalUnreadCount(
    userId: string,
    role: Role,
  ): Promise<SuccessResponse> {
    try {
      const unreadCounts =
        await this.chatRepository.getUnreadMessageCountsForUser(userId, role);

      const totalUnread = Object.values(unreadCounts).reduce(
        (sum, count) => sum + count,
        0,
      );

      return SuccessResponse.success(
        {
          totalUnread,
          sessionUnreadCounts: unreadCounts,
        },
        'Total unread count retrieved successfully',
      );
    } catch (error) {
      this.logger.error(`Error getting total unread count: ${error.message}`);
      throw error;
    }
  }

  async searchChatHistories(
    userId: string,
    searchQuery?: string,
    limit: number = 20,
    page: number = 1,
  ): Promise<SuccessResponse> {
    try {
      const offset = (page - 1) * limit;

      const result = await this.chatRepository.searchChatHistories(
        userId,
        searchQuery,
        limit,
        offset,
      );

      // Generate signed URLs for profile pictures and attachments
      const dataWithSignedUrls = await Promise.all(
        result.data.map(async (session: any) => {
          const enhancedSession: any = { ...session };

          // Client profile picture
          if (session.client?.profilePicture) {
            enhancedSession.client = {
              ...session.client,
              profilePictureUrl: await this.cloudStorageService.getSignedUrl(
                session.client.profilePicture,
                { expiresIn: 60 },
              ),
            };
          }

          // Psychologist profile picture
          if (session.psychologist?.profilePicture) {
            enhancedSession.psychologist = {
              ...session.psychologist,
              profilePictureUrl: await this.cloudStorageService.getSignedUrl(
                session.psychologist.profilePicture,
                { expiresIn: 60 },
              ),
            };
          }

          // Last message sender profile picture
          if (session.lastMessage?.senderProfilePicture) {
            enhancedSession.lastMessage = {
              ...session.lastMessage,
              senderProfilePictureUrl: await this.cloudStorageService.getSignedUrl(
                session.lastMessage.senderProfilePicture,
                { expiresIn: 60 },
              ),
            };
          }

          // Last message attachment
          if (session.lastMessage?.attachmentUrl) {
            enhancedSession.lastMessage = {
              ...enhancedSession.lastMessage,
              attachmentSignedUrl: await this.cloudStorageService.getSignedUrl(
                session.lastMessage.attachmentUrl,
                { expiresIn: 60 },
              ),
            };
          }

          return enhancedSession;
        }),
      );

      return SuccessResponse.success(
        {
          data: dataWithSignedUrls,
          pagination: {
            total: result.total,
            page,
            limit,
            totalPages: Math.ceil(result.total / limit),
          },
        },
        'Chat histories searched successfully',
      );
    } catch (error) {
      this.logger.error(`Error searching chat histories: ${error.message}`);
      throw error;
    }
  }

  async updateUserPresence(
    sessionId: string,
    userId: string,
    userFullname: string,
    status: 'present' | 'away',
  ): Promise<SuccessResponse> {
    try {
      const isParticipant =
        await this.chatRepository.isUserParticipantInSession(userId, sessionId);

      if (!isParticipant) {
        throw new ForbiddenException(
          'You are not a participant in this chat session',
        );
      }

      const session = await this.chatRepository.getChatSessionById(sessionId);
      if (!session) {
        throw new NotFoundException('Chat session not found');
      }

      if (!session.isActive || session.status !== 'active') {
        throw new BadRequestException('Chat session is not active');
      }

      await this.chatRepository.updateUserPresence(sessionId, userId, status);

      await this.ablyService.publishUserPresence(
        sessionId,
        userId,
        userFullname,
        status,
      );

      this.logger.log(
        `User ${userId} updated presence to ${status} in session ${sessionId}`,
      );

      return SuccessResponse.success(null, `Presence updated to ${status}`);
    } catch (error) {
      this.logger.error(`Error updating user presence: ${error.message}`);
      throw error;
    }
  }

  async getChannelHistory(
    userId: string,
    sessionId: string,
    limit: number = 10,
  ): Promise<SuccessResponse> {
    try {
      const isParticipant =
        await this.chatRepository.isUserParticipantInSession(userId, sessionId);

      if (!isParticipant) {
        throw new ForbiddenException(
          'You are not a participant in this chat session',
        );
      }

      const history = await this.ablyService.getChannelHistory(
        sessionId,
        limit,
      );

      this.logger.log(
        `Retrieved ${history.length} channel history items for session ${sessionId}`,
      );

      return SuccessResponse.success(
        history,
        'Channel history retrieved successfully',
      );
    } catch (error) {
      this.logger.error(`Error retrieving channel history: ${error.message}`);
      throw error;
    }
  }

  async generatePresignedUploadUrl(
    userId: string,
    sessionId: string,
    fileInfo: {
      fileId: string;
      contentType: string;
      fileSize: number;
    },
  ): Promise<SuccessResponse> {
    try {
      const isParticipant =
        await this.chatRepository.isUserParticipantInSession(userId, sessionId);

      if (!isParticipant) {
        throw new ForbiddenException(
          'You are not a participant in this chat session',
        );
      }

      const session = await this.chatRepository.getChatSessionById(sessionId);
      if (!session) {
        throw new NotFoundException('Chat session not found');
      }

      if (!session.isActive || session.status !== 'active') {
        throw new BadRequestException('Chat session is not active');
      }

      // Categorize content type
      const contentTypeCategory = fileInfo.contentType.startsWith('image/')
        ? 'image'
        : fileInfo.contentType.startsWith('video/')
          ? 'video'
          : fileInfo.contentType.startsWith('audio/')
            ? 'audio'
            : 'document';

      // Categorize file size (in bytes)
      const sizeCategory =
        fileInfo.fileSize < 1024 * 1024 // < 1MB
          ? 'small'
          : fileInfo.fileSize < 10 * 1024 * 1024 // < 10MB
            ? 'medium'
            : 'large';

      const uploadUrl = await this.ablyService.generatePresignedUploadUrl(
        fileInfo.fileId,
        contentTypeCategory,
        sizeCategory,
      );

      this.logger.log(
        `Generated presigned upload URL for file ${fileInfo.fileId} in session ${sessionId}`,
      );

      return SuccessResponse.success(
        {
          uploadUrl,
          fileId: fileInfo.fileId,
          contentTypeCategory,
          sizeCategory,
          expiresIn: '1 hour', // Standard expiration
        },
        'Presigned upload URL generated successfully',
      );
    } catch (error) {
      this.logger.error(
        `Error generating presigned upload URL: ${error.message}`,
      );
      throw error;
    }
  }
}
