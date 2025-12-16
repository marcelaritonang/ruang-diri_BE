import { join } from 'path';
import type { ServerResponse } from 'http';

import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ServeStaticModule } from '@nestjs/serve-static';

import { DatabaseModule } from '@common/database/database.module';
import { CommonModule } from '@common/common.module';

import { TestimonialsModule } from '@modules/testimonials/testimonials.module';
import { PartnersModule } from '@modules/partners/partners.module';

import { AuthModule } from '@modules/auth/auth.module';
import { MailerModule } from '@modules/mailer/mailer.module';

import { UsersModule } from '@modules/users/users.module';
import { OrganizationsModule } from '@modules/organizations/organizations.module';
import { ClientProfilesModule } from '@/modules/clients/clients-profile.module';
import { EmployeeProfilesModule } from '@/modules/employees/employees.module';
import { StudentProfilesModule } from '@/modules/students/student.module';
import { PsychologistProfileModule } from '@/modules/psychologists/psychologist-profile.module';

import { MentalHealthModule } from './modules/mental-health/mental-health.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { SchedulesModule } from './modules/schedules/schedules.module';
import { PdfModule } from './modules/pdf/pdf.module';
import { DataWipeModule } from './modules/data-wipe/data-wipe.module';

import { ChatModule } from './modules/chat/chat.module';

import { QueueModule } from './queue/queue.module';
import { HealthModule } from './health/health.module';

import { AppService } from './app.service';
import { AppController } from './app.controller';
import { CloudStorageModule } from './common/cloud-storage/cloud-storage.module';

@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const isProduction = configService.get('NODE_ENV') === 'production';
        return [
          {
            name: 'short',
            ttl: 1000,
            limit: isProduction ? 20 : 100,
          },
          {
            name: 'medium',
            ttl: 10000,
            limit: isProduction ? 100 : 500,
          },
          {
            name: 'long',
            ttl: 60000,
            limit: isProduction ? 1000 : 2000,
          },
        ];
      },
    }),
    DatabaseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        host: configService.get<string>('DB_HOST') || 'localhost',
        port: configService.get<number>('DB_PORT') || 5432,
        user: configService.get<string>('DB_USERNAME') || 'postgres',
        password: configService.get<string>('DB_PASSWORD') || 'password',
        database: configService.get<string>('DB_NAME') || 'postgres',
      }),
    }),
    TestimonialsModule,
    PartnersModule,
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads/',
      serveStaticOptions: {
        setHeaders: (res: ServerResponse) => {
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader(
            'Access-Control-Allow-Headers',
            'Content-Type, Authorization',
          );
          res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        },
      },
    }),
    AuthModule,
    CommonModule,
    UsersModule,
    MailerModule,
    OrganizationsModule,
    EmployeeProfilesModule,
    StudentProfilesModule,
    PsychologistProfileModule,
    ClientProfilesModule,
    MentalHealthModule,
    SchedulesModule,
    NotificationsModule,
    PdfModule,
    DataWipeModule,
    QueueModule,
    ChatModule,
    HealthModule,
    CloudStorageModule
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
