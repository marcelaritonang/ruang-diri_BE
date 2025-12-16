// Only load dotenv in development
if (process.env.NODE_ENV !== 'production') {
  const dotenv = require('dotenv');
  dotenv.config({
    path: `${process.cwd()}/.env.${process.env.NODE_ENV ?? 'development'}`,
  });
}

export const currentEnv = process.env.NODE_ENV ?? 'development';

export const env = {
  // CRITICAL: Cloud Run uses PORT, fallback to APP_PORT for local dev
  PORT: process.env.PORT ?? process.env.APP_PORT ?? 8080,
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  DB_HOST: process.env.DB_HOST ?? 'localhost',
  DB_PORT: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 5432,
  DB_USERNAME: process.env.DB_USERNAME ?? 'postgres',
  DB_PASSWORD: process.env.DB_PASSWORD ?? 'postgres',
  DB_NAME: process.env.DB_NAME ?? 'postgres',
  DB_URL: process.env.DB_URL ?? '',
  JWT_SECRET: process.env.JWT_SECRET_KEY ?? '',
  CLOUD_STORAGE_BUCKET_URL: process.env.CLOUD_STORAGE_BUCKET_URL ?? '',
  MAILERSEND_API_KEY: process.env.MAILERSEND_API_KEY ?? '',
  BASE_URL: process.env.BASE_URL ?? '',
  ZOOM_API_BASE_URL: 'https://api.zoom.us/v2',
  ZOOM_OAUTH_ENDPOINT: 'https://zoom.us/oauth/token',
  ZOOM_CLIENT_ID: process.env.ZOOM_CLIENT_ID ?? '',
  ZOOM_CLIENT_SECRET: process.env.ZOOM_CLIENT_SECRET ?? '',
  ZOOM_SECRET_TOKEN: process.env.ZOOM_SECRET_TOKEN ?? '',
  ZOOM_ACCOUNT_ID: process.env.ZOOM_ACCOUNT_ID ?? '',
  ABLY_API_KEY: process.env.ABLY_API_KEY ?? '',
  CHAT_ENCRYPTION_KEY:
    process.env.CHAT_ENCRYPTION_KEY ?? 'default-dev-key-change-in-production',
  REDIS_URL:
    process.env.REDIS_URL ??
    'rediss://default:AVAFAAIncDIzNzcyMjIwY2RiZjc0OTliODRkMTM4NmZhODc0YTE2ZXAyMjA0ODU@vocal-mutt-20485.upstash.io:6379',
  GCS_BUCKET_NAME: process.env.GCS_BUCKET_NAME ?? 'ruangdiri-bucket',
} as const;