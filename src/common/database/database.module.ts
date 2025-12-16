import { Global, Module } from '@nestjs/common';
import {
  ConfigurableDatabaseModule,
  CONNECTION_POOL,
  DATABASE_OPTIONS,
} from './database.module-definition';
import { DatabaseOptions } from './database-options';
import { Pool } from 'pg';
import { DrizzleService } from '@common/drizzle/drizzle.service';

@Global()
@Module({
  exports: [DrizzleService],
  providers: [
    DrizzleService,
    {
      provide: CONNECTION_POOL,
      inject: [DATABASE_OPTIONS],
      useFactory: (databaseOptions: DatabaseOptions) => {
        return new Pool({
          host: databaseOptions.host,
          port: databaseOptions.port,
          user: databaseOptions.user,
          password: databaseOptions.password,
          database: databaseOptions.database,
          ssl: false, // ✅ Fixed: External DB doesn't support SSL
          // Production-ready connection pool settings
          max: 20,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 2000,
          maxUses: 7500,
          application_name: 'ruang-diri-backend',
        });
      },
    },
  ],
})
export class DatabaseModule extends ConfigurableDatabaseModule {}