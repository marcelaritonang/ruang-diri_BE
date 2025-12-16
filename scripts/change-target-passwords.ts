import * as bcrypt from 'bcryptjs';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq, inArray } from 'drizzle-orm';

import { env } from '@/config/env.config';
import { users } from '@/modules/users/domain/users.schema';

if (env.NODE_ENV !== 'production') {
  const dotenv = require('dotenv');
  dotenv.config({
    path: `${process.cwd()}/.env.${env.NODE_ENV ?? 'development'}`,
  });
}

const TARGET_USERS = [
  { email: 'momo.client@ruangdiri.com', password: 'ruangdiri' },
  { email: 'momo.org@ruangdiri.com', password: 'ruangdiri' },
];

async function changeSpecificPasswords(): Promise<void> {
  console.log('🔄 Changing passwords for specific users...');

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
    },
  });

  try {
    const emails = TARGET_USERS.map((user) => user.email);

    // Find users
    const foundUsers = await db
      .select({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        role: users.role,
      })
      .from(users)
      .where(inArray(users.email, emails));

    console.log(`📋 Found ${foundUsers.length} users to update`);

    let successCount = 0;

    for (const targetUser of TARGET_USERS) {
      const foundUser = foundUsers.find((u) => u.email === targetUser.email);

      if (!foundUser) {
        console.warn(`⚠️ User not found: ${targetUser.email}`);
        continue;
      }

      try {
        console.log(
          `🔄 Updating password for: ${foundUser.fullName} (${foundUser.email})`,
        );

        // Hash the new password
        const hashedPassword = await bcrypt.hash(targetUser.password, 10);

        // Update the user's password
        await db
          .update(users)
          .set({
            password: hashedPassword,
            lastPassword: hashedPassword,
            updatedAt: new Date(),
          })
          .where(eq(users.id, foundUser.id));

        console.log(`✅ Password changed for ${foundUser.email}`);
        console.log(`   👤 User: ${foundUser.fullName} (${foundUser.role})`);
        console.log(`   🔑 New password: ${targetUser.password}`);
        successCount++;
      } catch (error) {
        console.error(`❌ Error updating ${foundUser.email}:`, error);
      }
    }

    console.log('\n📊 Password Change Summary:');
    console.log(`✅ Successfully updated: ${successCount} users`);
    console.log(`📋 Target users: ${TARGET_USERS.length}`);

    if (successCount === TARGET_USERS.length) {
      console.log('🎉 All target users updated successfully!');
    } else {
      console.log(
        `⚠️ ${TARGET_USERS.length - successCount} users were not updated`,
      );
    }
  } catch (error) {
    console.error('❌ Error changing passwords:', error);
    throw error;
  } finally {
    await pool.end();
    console.log('🔌 Database connection closed');
  }
}

async function main() {
  console.log('🎯 Quick Password Change for Target Users');
  console.log('Target users:');
  TARGET_USERS.forEach((user) => {
    console.log(`  📧 ${user.email} → password: ${user.password}`);
  });
  console.log('');

  await changeSpecificPasswords();
}

main().catch((err) => {
  console.error('💥 Fatal error:', err);
  process.exit(1);
});
