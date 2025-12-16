import helmet from 'helmet';
import { NestFactory } from '@nestjs/core';
import { VersioningType } from '@nestjs/common';

import { HttpExceptionFilter } from '@filters/http-exception.filters';
import { NotFoundExceptionFilter } from '@filters/unmatched-route.filters';

import { env } from '@config/env.config';
import { CorsConfig } from '@config/cors.config';
import { SwaggerConfig } from '@config/swagger.config';

import { LoggingInterceptor } from '@/common/interceptors/logging.interceptor';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  app.useGlobalInterceptors(new LoggingInterceptor());

  app.useGlobalFilters(
    new HttpExceptionFilter(),
    new NotFoundExceptionFilter(),
  );

  SwaggerConfig.setup(app);

  app.enableCors(CorsConfig.getOptions());

  app.use(helmet());

  app.enableShutdownHooks();

  // WARNING: Log about ephemeral storage in production
  if (env.NODE_ENV === 'production') {
    console.warn('⚠️  WARNING: File uploads are stored in ephemeral storage.');
    console.warn('⚠️  Files will be LOST when container restarts.');
    console.warn('⚠️  TODO: Migrate to Cloud Storage for persistent file storage.');
  }

  await app.listen(env.PORT, '0.0.0.0', () => {
    console.log(`🚀 Server is running on port ${env.PORT}`);
    console.log(`🌍 Environment: ${env.NODE_ENV}`);
    console.log(`🔗 Base URL: ${env.BASE_URL}`);
  });
}

bootstrap().catch((err) => {
  console.error('❌ Application bootstrap failed:', err);
  process.exit(1);
});