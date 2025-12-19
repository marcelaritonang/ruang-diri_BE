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
        'http://localhost:3000',
        'http://10.101.3.100:5173',
        'http://192.168.1.6:5173',
        'http://10.101.0.86:5173',
        // ✅ ADD: Ngrok URL for local development
        'https://deprived-sara-illegitimately.ngrok-free.dev',
        // ✅ ADD: Vercel production URL
        'https://ruang-diri.vercel.app',
      ],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      preflightContinue: false,
      credentials: true,
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'ngrok-skip-browser-warning',
        'X-Requested-With',
        'Accept',
        'Origin',
      ],
      exposedHeaders: ['Content-Disposition'],
    };
  }
}