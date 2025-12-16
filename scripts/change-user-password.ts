import * as bcrypt from 'bcryptjs';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';

import { env } from '@/config/env.config';
import { users } from '@/modules/users/domain/users.schema';

if (env.NODE_ENV !== 'production') {
  const dotenv = require('dotenv');
  dotenv.config({
    path: `${process.cwd()}/.env.${env.NODE_ENV ?? 'development'}`,
  });
}

interface ChangePasswordOptions {
  email: string;
  newPassword: string;
}

async function changeUserPassword(
  options: ChangePasswordOptions,
): Promise<void> {
  console.log(`🔄 Changing password for user: ${options.email}`);

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
    // Find the user by email
    const user = await db
      .select({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        role: users.role,
      })
      .from(users)
      .where(eq(users.email, options.email))
      .limit(1);

    if (user.length === 0) {
      console.error(`❌ User with email ${options.email} not found`);
      return;
    }

    const foundUser = user[0];
    console.log(`📋 Found user: ${foundUser.fullName} (${foundUser.role})`);

    // Hash the new password
    const hashedPassword = await bcrypt.hash(options.newPassword, 10);

    // Update the user's password
    await db
      .update(users)
      .set({
        password: hashedPassword,
        lastPassword: hashedPassword, // Store as last password too
        updatedAt: new Date(),
      })
      .where(eq(users.id, foundUser.id));

    console.log(`✅ Password successfully changed for ${foundUser.email}`);
    console.log(`👤 User: ${foundUser.fullName} (${foundUser.role})`);
    console.log(`🔑 New password: ${options.newPassword}`);
  } catch (error) {
    console.error('❌ Error changing user password:', error);
    throw error;
  } finally {
    await pool.end();
    console.log('🔌 Database connection closed');
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log('📖 Usage: npm run change-password <email> <new-password>');
    console.log('');
    console.log('Examples:');
    console.log(
      '  npm run change-password momo.client@ruangdiri.com ruangdiri',
    );
    console.log('  npm run change-password momo.org@ruangdiri.com ruangdiri');
    console.log('  npm run change-password user@example.com newpassword123');
    process.exit(1);
  }

  const email = args[0];
  const newPassword = args[1];

  if (!email || !newPassword) {
    console.error('❌ Both email and new password are required');
    process.exit(1);
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    console.error('❌ Invalid email format');
    process.exit(1);
  }

  // Validate password length
  if (newPassword.length < 6) {
    console.error('❌ Password must be at least 6 characters long');
    process.exit(1);
  }

  await changeUserPassword({
    email,
    newPassword,
  });
}

main().catch((err) => {
  console.error('💥 Fatal error:', err);
  process.exit(1);
});
