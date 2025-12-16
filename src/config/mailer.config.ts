import { url } from '@common/constants/url.constant';
import { env } from './env.config';

if (env.NODE_ENV !== 'production') {
  const dotenv = require('dotenv');
  dotenv.config({
    path: `${process.cwd()}/.env.${env.NODE_ENV ?? 'development'}`,
  });
}

export const mailerConfig = {
  EMAIL_FROM_ADDRESS: 'MS_YGfZNe@test-r83ql3pw7wzgzw1j.mlsender.net',
  EMAIL_FROM_NAME: 'Ruang Diri',
  FRONTEND_URL: `${url.FRONTEND_URL}/reset-password`,
} as const;
