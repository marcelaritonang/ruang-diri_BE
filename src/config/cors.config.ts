import { Injectable } from '@nestjs/common';
import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

import { url } from '@common/constants/url.constant';
import { env } from '@config/env.config';

@Injectable()
export class CorsConfig {
  static getOptions(): CorsOptions {
    return {
      origin: [
        url.FRONTEND_URL,
        env.BASE_URL,
        'http://localhost:5173',
        'http://10.101.3.100:5173',
        'http://192.168.1.6:5173',
        'http://10.101.0.86:5173',
      ],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      preflightContinue: false,
      credentials: true,
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'ngrok-skip-browser-warning',
      ],
    };
  }
}
