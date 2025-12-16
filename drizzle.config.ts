import { defineConfig } from 'drizzle-kit';

import { env } from '@config/env.config';
 
export default defineConfig({
  schema: './src/common/database/database-schema.ts',
  out: './drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USERNAME,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    ssl: false,
    url: env.DB_URL,
  },
  schemaFilter: "public",
  verbose: true,
  strict: true,
})