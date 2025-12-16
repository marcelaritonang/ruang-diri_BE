import * as bcrypt from 'bcryptjs';
import { InferInsertModel } from 'drizzle-orm';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';

import { env } from '@/config/env.config';
import { users } from '@/modules/users/domain/users.schema';
import { organizations } from '@/modules/organizations/domain/organizations.schema';
import { v4 } from 'uuid';

if (env.NODE_ENV !== 'production') {
  const dotenv = require('dotenv');
  dotenv.config({
    path: `${process.cwd()}/.env.${env.NODE_ENV ?? 'development'}`,
  });
}

async function main() {
  console.log('🔄 Seeding organization users...');

  const pool = new Pool({
    host: env.DB_HOST,
    port: Number(env.DB_PORT),
    user: env.DB_USERNAME,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    ssl: false,
  });

  const db = drizzle(pool, {
    schema: {
      users,
      organizations,
    },
  });

  try {
    // const id = v4();
    const generateId = () => v4();

    const orgs: InferInsertModel<typeof organizations>[] = [
      // {
      //   id: '11111111-1111-1111-1111-111111111111',
      //   type: 'school',
      //   address: 'Jl. Pendidikan No. 1',
      //   phone: '+6281234567890',
      // },
      {
        id: generateId(),
        type: 'company',
        address: 'Tiger Wong Entertainment, Jl. Hiburan No. 123, Jakarta',
        phone: '+02112345678',
        totalQuota: 30,
        remainingQuota: 30,
      },
    ];

    await db.insert(organizations).values(orgs);

    const password = await bcrypt.hash('momoruangdiri', 10);

    const orgUsers: InferInsertModel<typeof users>[] = [
      {
        id: generateId(),
        email: 'momo.org@ruangdiri.com',
        password,
        fullName: 'Momo Ruang Diri',
        role: 'organization',
        organizationId: orgs[0].id,
        isActive: true,
        isOnboarded: true,
      },
    ];

    await db.insert(users).values(orgUsers);
    console.log(
      `✅ Seeded ${orgUsers.length} organization users and ${orgs.length} organizations`,
    );
  } catch (error) {
    console.error('❌ Error seeding organization users:', error);
    throw error;
  } finally {
    await pool.end();
    console.log('🔌 Database connection closed');
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
