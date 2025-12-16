import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import { env } from '@/config/env.config';

dotenv.config();

async function main() {
  console.log('Starting migration...');

  const pool = new Pool({
    host: env.DB_HOST,
    port: Number(env.DB_PORT),
    user: env.DB_USERNAME,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    ssl: false,
  });

  try {
    const result = await pool.query('SELECT NOW()');
    console.log('Database connection successful:', result.rows[0].now);
  } catch (error) {
    console.error('Failed to connect to database:', error);
    process.exit(1);
  }

  const db = drizzle(pool);

  console.log('Migration folder: ./drizzle/migrations`');

  try {
    console.log('Running migrations...');
    await migrate(db, { migrationsFolder: './drizzle/migrations' });
    console.log('Migrations completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await pool.end();
  }
}

main();
