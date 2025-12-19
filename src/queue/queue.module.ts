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

// Helper function to get Redis connection config
const getRedisConnection = () => {
  const redisEnabled = env.REDIS_ENABLED;

  if (!redisEnabled) {
    console.log('⚠️  Redis DISABLED - Queue jobs will not persist and may fail');
    console.log('⚠️  For production, enable Redis by setting REDIS_ENABLED=true');
    
    // Return dummy connection to prevent connection attempts
    return {
      host: 'localhost',
      port: 6379,
      maxRetriesPerRequest: 0,
      enableReadyCheck: false,
      retryStrategy: () => null,
      lazyConnect: true,
    };
  }

  // Redis is enabled - proceed with connection
  if (env.REDIS_URL) {
    if (env.REDIS_URL.startsWith('rediss://')) {
      const url = new URL(env.REDIS_URL);
      const config = {
        host: url.hostname,
        port: parseInt(url.port) || 6379,
        username: url.username || 'default',
        password: url.password,
        tls: {
          rejectUnauthorized: false,
        },
        family: 0,
      };
      console.log('🔍 Redis Config (Upstash TLS):', {
        host: config.host,
        port: config.port,
        username: config.username,
        hasTLS: true,
      });
      return config;
    } else if (env.REDIS_URL.startsWith('redis://')) {
      console.log('🔍 Redis Config (URL):', env.REDIS_URL);
      return { url: env.REDIS_URL };
    }
  }

  console.log('🔍 Redis Config (Local):', 'localhost:6379');
  return {
    host: 'localhost',
    port: 6379,
  };
};

// Helper function to conditionally create queue registrations
const getQueueRegistrations = () => {
  const redisEnabled = env.REDIS_ENABLED;

  if (!redisEnabled) {
    console.log('⚠️  Queue registration skipped (Redis disabled)');
    return [];
  }

  console.log('✅ Registering queues: zoom-meeting, schedule-notification, chat-automation');
  return [
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
  ];
};

// ✅ NEW: Helper function to conditionally create providers
const getQueueProviders = () => {
  const redisEnabled = env.REDIS_ENABLED;
  
  // Always include queue classes (even when Redis disabled)
  // They're needed for dependency injection in other modules
  const queueClasses = [
    ZoomMeetingQueue,
    ChatAutomationQueue,
  ];
  
  const baseProviders = [
    ZoomApiService,
    ...queueClasses, // ← Always include
  ];

  if (!redisEnabled) {
    console.log('⚠️  Queue processors skipped (Redis disabled)');
    console.log('✅  Queue classes registered (non-functional without Redis)');
    return baseProviders; // Returns queue classes but not processors
  }

  console.log('✅  Registering all queue providers and processors');
  return [
    ...baseProviders,
    ZoomMeetingProcessor,
    ChatAutomationProcessor,
  ];
};

const getQueueExports = () => {
  // Always export queue classes (even if they're non-functional)
  // This prevents dependency injection errors
  return [ZoomMeetingQueue, ChatAutomationQueue];
};
@Module({
  imports: [
    forwardRef(() => SchedulesModule),
    forwardRef(() => ChatModule),
    NotificationsModule,
    UsersModule,
    
    // Configure BullMQ with Redis connection
    BullModule.forRoot({
      connection: getRedisConnection(),
    }),
    
    // Conditionally register queues
    ...getQueueRegistrations(),
    
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 5,
      headers: {
        'Content-Type': 'application/json',
      },
    }),
  ],
  providers: getQueueProviders(), // ✅ Conditional providers
  exports: getQueueExports(), // ✅ Conditional exports
})
export class QueueModule {}