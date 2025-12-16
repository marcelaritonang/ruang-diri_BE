import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';

import type { Queue, Job } from 'bullmq';

import { computeDelayMs } from '@/common/utils/date.util';
import { NotificationGateway } from '@/gateway/notifications/notification.gateway';

import { QUEUE_JOB } from '../queue.config';

@Injectable()
export class ChatAutomationQueue {
  private readonly logger = new Logger(ChatAutomationQueue.name);

  constructor(
    @InjectQueue(QUEUE_JOB.CHAT_AUTOMATION) private readonly queue: Queue,
    private readonly notificationGateway: NotificationGateway,
  ) {}

  async scheduleInitialMessage(
    sessionId: string,
    userFullname: string,
    scheduledAt: Date,
    tzName = 'Asia/Jakarta',
    participants: { clientId: string; psychologistId: string },
  ): Promise<Job> {
    const { delay, debug } = computeDelayMs(scheduledAt, tzName, 10);

    this.logger.log(
      `Initial message session ${sessionId} debug ${JSON.stringify(debug)}`,
    );

    this.logger.log(
      `Scheduling initial message for session ${sessionId} (in ${delay}ms)`,
    );

    await this.removeInitialMessage(sessionId);

    this.notificationGateway.sendChatNotification(participants, {
      event: 'initial-message',
      data: {
        count: 1,
        sessionId,
      },
    });

    return this.queue.add(
      'send-initial-message',
      { sessionId, userFullname },
      {
        jobId: `initial-message-${sessionId}`,
        delay: Math.max(delay, 0),
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: true,
      },
    );
  }

  async scheduleEnableChat(
    sessionId: string,
    userFullname: string,
    scheduledAt: Date,
    tzName = 'Asia/Jakarta',
    participants: { clientId: string; psychologistId: string },
  ): Promise<Job> {
    const { delay, debug } = computeDelayMs(scheduledAt, tzName, 0);

    this.logger.log(
      `Enable chat session ${sessionId} debug ${JSON.stringify(debug)}`,
    );

    this.logger.log(
      `Scheduling chat enablement for session ${sessionId} (in ${delay}ms)`,
    );

    await this.removeEnableChat(sessionId);

    this.notificationGateway.sendChatNotification(participants, {
      event: 'enable-chat',
      data: {
        count: 1,
        sessionId,
      },
    });

    return this.queue.add(
      'enable-chat',
      { sessionId, userFullname },
      {
        jobId: `enable-chat-${sessionId}`,
        delay: Math.max(delay, 0),
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: true,
      },
    );
  }

  async scheduleAutoEndAt(
    sessionId: string,
    userFullname: string,
    endAt: Date,
    tzName: string,
  ): Promise<Job> {
    const { delay, debug } = computeDelayMs(endAt, tzName, 0);

    this.logger.log(
      `Auto-end session ${sessionId} at exact time debug ${JSON.stringify(debug)}`,
    );

    this.logger.log(
      `Scheduling auto-end for session ${sessionId} at ${endAt.toISOString()} (in ${delay}ms)`,
    );

    await this.removeAutoEnd(sessionId);

    return this.queue.add(
      'auto-end-session',
      { sessionId, userFullname },
      {
        jobId: `auto-end-${sessionId}`,
        delay: delay,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: true,
      },
    );
  }

  async removeInitialMessage(sessionId: string): Promise<void> {
    const jobId = `initial-message-${sessionId}`;
    const job = await this.queue.getJob(jobId);
    if (job) {
      await job.remove();
      this.logger.log(`Removed initial message job ${jobId}`);
    }
  }

  async removeEnableChat(sessionId: string): Promise<void> {
    const jobId = `enable-chat-${sessionId}`;
    const job = await this.queue.getJob(jobId);
    if (job) {
      await job.remove();
      this.logger.log(`Removed enable chat job ${jobId}`);
    }
  }

  async removeAutoEnd(sessionId: string): Promise<void> {
    const jobId = `auto-end-${sessionId}`;
    const job = await this.queue.getJob(jobId);
    if (job) {
      await job.remove();
      this.logger.log(`Removed auto-end job ${jobId}`);
    }
  }
}
