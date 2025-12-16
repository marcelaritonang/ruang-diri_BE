import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as fs from 'fs';
import * as path from 'path';
import { env } from './env.config';

export class SwaggerConfig {
  static setup(app: INestApplication): void {
    const config = new DocumentBuilder()
      .setTitle('Ruang Diri API')
      .setDescription(
        'API documentation for Ruang Diri application, all the services belongs to PT. Wong Makmur Sejati',
      )
      .setVersion('1.0')
      .setLicense('MIT', 'https://opensource.org/licenses/MIT')
      .setTermsOfService('https://ruangdiri.id/terms')
      .setContact(
        'Support Team',
        'https://ruangdiri.id',
        'support@ruangdiri.id',
      )
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token here',
        },
        'JWT-auth',
      )
      .build();

    const document = SwaggerModule.createDocument(app, config, {
      deepScanRoutes: true,
    });

    SwaggerModule.setup('api/v1/docs', app, document, {
      swaggerOptions: {
        docExpansion: 'none',
        filter: true,
        showRequestDuration: true,
        persistAuthorization: true,
      },
    });

    // Only write Swagger JSON locally, skip in production
    if (env.NODE_ENV !== 'production') {
      const outputPath = path.resolve(process.cwd(), 'swagger-spec.json');
      fs.writeFileSync(outputPath, JSON.stringify(document, null, 2));
      console.log(`📄 Swagger JSON exported to ${outputPath}`);
    } else {
      console.log('⚠️ Skipping writing swagger-spec.json in production');
    }
  }
}
