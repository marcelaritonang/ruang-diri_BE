import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { HttpModule } from '@nestjs/axios';

import { SchedulesModule } from '@/modules/schedules/schedules.module';
import { UsersModule } from '@/modules/users/users.module';
import { NotificationsModule } from '@/modules/notifications/notifications.module';
import { ChatModule } from '@/modules/chat/chat.module';

import { ZoomApiService } from '@/common/libs/zoom/zoom-api.lib';

import { ZoomMeetingQueue } from './zoom/zoom.queue';
import { ZoomMeetingProcessor } from './zoom/zoom.processor';

import { defaultJobOptions, QUEUE_JOB } from './queue.config';
import { ChatAutomationQueue } from './chat/chat-automation.queue';
import { ChatAutomationProcessor } from './chat/chat-automation.processor';

import { env } from '@/config/env.config';

@Module({
  imports: [
    forwardRef(() => SchedulesModule),
    forwardRef(() => ChatModule),
    NotificationsModule,
    UsersModule,
    // Configure BullMQ with Redis connection
    // For Upstash with TLS support
    BullModule.forRoot({
      connection:
        env.REDIS_URL.startsWith('rediss://')
          ? (() => {
              // Parse Upstash URL manually for better TLS control
              const url = new URL(env.REDIS_URL);
              const config = {
                host: url.hostname,
                port: parseInt(url.port) || 6379,
                username: url.username || 'default',
                password: url.password,
                tls: {
                  rejectUnauthorized: false,
                },
                family: 0, // Use IPv4 and IPv6
              };
              console.log('🔍 Redis Config (Upstash TLS):', {
                host: config.host,
                port: config.port,
                username: config.username,
                hasTLS: true,
              });
              return config;
            })()
          : env.REDIS_URL.startsWith('redis://')
            ? (() => {
                console.log('🔍 Redis Config (URL):', env.REDIS_URL);
                return { url: env.REDIS_URL };
              })()
            : (() => {
                console.log('🔍 Redis Config (Local):', 'localhost:6379');
                return {
                  host: 'localhost',
                  port: 6379,
                };
              })(),
    }),
    BullModule.registerQueue({
      name: QUEUE_JOB.ZOOM_MEETING,
      defaultJobOptions: defaultJobOptions,
    }),
    BullModule.registerQueue({
      name: QUEUE_JOB.SCHEDULE_NOTIFICATION,
      defaultJobOptions: defaultJobOptions,
    }),
    BullModule.registerQueue({
      name: QUEUE_JOB.CHAT_AUTOMATION,
      defaultJobOptions: defaultJobOptions,
    }),
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 5,
      headers: {
        'Content-Type': 'application/json',
      },
    }),
  ],
  providers: [
    ZoomMeetingQueue,
    ZoomMeetingProcessor,
    ZoomApiService,
    ChatAutomationQueue,
    ChatAutomationProcessor,
  ],
  exports: [ZoomMeetingQueue, ChatAutomationQueue],
})
export class QueueModule {}