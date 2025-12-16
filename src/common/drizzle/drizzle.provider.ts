import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '@common/database/database-schema';

export const DrizzleAsyncProvider = 'DrizzleAsyncProvider';

export const drizzleProvider = [
  {
    provide: DrizzleAsyncProvider,
    inject: [ConfigService],
    useFactory: async (configService: ConfigService) => {
      const connectionString = configService.get<string>('DB_URL');
      
      console.log('🔍 DB_URL:', connectionString); // Debug log
      
      const pool = new Pool({
        connectionString,
        ssl: false, // Explicitly disable SSL
      });
      
      return drizzle(pool, { schema }) as NodePgDatabase<typeof schema>;
    },
  },
];