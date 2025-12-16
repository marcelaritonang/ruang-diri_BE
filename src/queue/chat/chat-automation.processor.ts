import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';

import { QUEUE_JOB } from '../queue.config';
import { ChatService } from '@/modules/chat/application/chat.service';
import { AblyService } from '@/modules/chat/application/ably.service';

@Injectable()
@Processor(QUEUE_JOB.CHAT_AUTOMATION)
export class ChatAutomationProcessor extends WorkerHost {
  private readonly logger = new Logger(ChatAutomationProcessor.name);

  constructor(
    private readonly chatService: ChatService,
    private readonly ablyService: AblyService,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(
      `Processing job: ${job.name} for session: ${job.data.sessionId}`,
    );

    switch (job.name) {
      case 'send-initial-message':
        return this.handleInitialMessage(
          job.data.sessionId,
          job.data.userFullname,
        );
      case 'enable-chat':
        return this.handleEnableChat(job.data.sessionId, job.data.userFullname);
      case 'auto-end-session':
        return this.handleAutoEnd(job.data.sessionId, job.data.userFullname);
      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
    }
  }

  private async handleInitialMessage(
    sessionId: string,
    userFullname: string,
  ): Promise<void> {
    try {
      this.logger.log(
        `Sending initial automated message for session ${sessionId}`,
      );

      await this.chatService.sendAutomatedMessage(
        sessionId,
        userFullname,
        'Halo! Saya akan segera memulai sesi konseling kita. Mohon tunggu sebentar, ya!',
        'initial',
      );

      this.logger.log(`Initial message sent for session ${sessionId}`);
    } catch (error) {
      this.logger.error(
        `Failed to send initial message for session ${sessionId}:`,
        error,
      );
      throw error;
    }
  }

  private async handleEnableChat(
    sessionId: string,
    userFullname: string,
  ): Promise<void> {
    try {
      this.logger.log(`Enabling chat for session ${sessionId}`);

      await this.chatService.sendAutomatedMessage(
        sessionId,
        userFullname,
        'Sesi konseling dimulai! Silakan ceritakan apa yang ingin Anda bagikan hari ini. Saya siap mendengarkan',
        'start',
      );

      await this.chatService.enableChatForSession(sessionId);

      await this.ablyService.publishSessionStatus(
        sessionId,
        'chat_enabled',
        [],
      );

      this.logger.log(`Chat enabled for session ${sessionId}`);
    } catch (error) {
      this.logger.error(
        `Failed to enable chat for session ${sessionId}:`,
        error,
      );
      throw error;
    }
  }

  private async handleAutoEnd(
    sessionId: string,
    userFullname: string,
  ): Promise<void> {
    try {
      this.logger.log(
        `🚨 AUTO-END JOB: Executing auto-end job for session ${sessionId} at ${new Date().toISOString()}`,
      );

      await this.chatService.autoEndSession(sessionId, userFullname);

      this.logger.log(
        `✅ AUTO-END JOB: Session ${sessionId} auto-ended successfully`,
      );
    } catch (error) {
      this.logger.error(
        `💥 AUTO-END JOB ERROR: Failed to auto-end session ${sessionId}:`,
        error,
      );
      throw error;
    }
  }
}
