import { Inject, Injectable } from '@nestjs/common';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { CONNECTION_POOL } from '@common/database/database.module-definition';

import * as databaseSchema from '@common/database/database-schema';
import * as databaseRelations from '@common/database/database-relations';

const fullSchema = {
  ...databaseSchema,
  ...databaseRelations,
};

@Injectable()
export class DrizzleService {
  public db: NodePgDatabase<typeof fullSchema>;

  constructor(@Inject(CONNECTION_POOL) private readonly pool: Pool) {
    this.db = drizzle(this.pool, {
      schema: fullSchema,
      logger: process.env.NODE_ENV === 'development', // Only log in development
    });
  }
}
