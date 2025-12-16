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

interface BatchPasswordChange {
  email: string;
  newPassword: string;
}

interface BatchChangeOptions {
  changes: BatchPasswordChange[];
  dryRun?: boolean;
}

async function batchChangePasswords(
  options: BatchChangeOptions,
): Promise<void> {
  console.log(
    `🔄 ${options.dryRun ? 'DRY RUN: ' : ''}Batch changing passwords for ${options.changes.length} users`,
  );

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
    const emails = options.changes.map((change) => change.email);

    // Find all users by email
    const foundUsers = await db
      .select({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        role: users.role,
      })
      .from(users)
      .where(inArray(users.email, emails));

    console.log(
      `📋 Found ${foundUsers.length} users out of ${emails.length} requested`,
    );

    if (foundUsers.length === 0) {
      console.warn('⚠️ No users found with the provided emails');
      return;
    }

    // Check for missing users
    const foundEmails = new Set(foundUsers.map((user) => user.email));
    const missingEmails = emails.filter((email) => !foundEmails.has(email));

    if (missingEmails.length > 0) {
      console.warn(
        `⚠️ Users not found for emails: ${missingEmails.join(', ')}`,
      );
    }

    // Process each password change
    let successCount = 0;
    let errorCount = 0;

    for (const change of options.changes) {
      try {
        const user = foundUsers.find((u) => u.email === change.email);
        if (!user) {
          console.error(`❌ User not found: ${change.email}`);
          errorCount++;
          continue;
        }

        console.log(
          `🔄 ${options.dryRun ? '(DRY RUN) ' : ''}Processing: ${user.fullName} (${user.email})`,
        );

        if (!options.dryRun) {
          // Hash the new password
          const hashedPassword = await bcrypt.hash(change.newPassword, 10);

          // Update the user's password
          await db
            .update(users)
            .set({
              password: hashedPassword,
              lastPassword: hashedPassword,
              updatedAt: new Date(),
            })
            .where(eq(users.id, user.id));
        }

        console.log(
          `✅ ${options.dryRun ? '(DRY RUN) ' : ''}Password changed for ${user.email}`,
        );
        successCount++;
      } catch (error) {
        console.error(`❌ Error changing password for ${change.email}:`, error);
        errorCount++;
      }
    }

    console.log('\n📊 Batch Password Change Summary:');
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed: ${errorCount}`);
    console.log(`📋 Total: ${options.changes.length}`);

    if (options.dryRun) {
      console.log(
        '🔍 This was a dry run - no changes were made to the database',
      );
    }
  } catch (error) {
    console.error('❌ Error in batch password change:', error);
    throw error;
  } finally {
    await pool.end();
    console.log('🔌 Database connection closed');
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log('📖 Batch Password Change Script');
    console.log('');
    console.log('Usage:');
    console.log(
      '  npm run batch-change-password [--dry-run] [--file <path>] [email1:password1] [email2:password2] ...',
    );
    console.log('');
    console.log('Options:');
    console.log(
      '  --dry-run        Preview changes without actually updating passwords',
    );
    console.log(
      '  --file <path>    Read email:password pairs from a file (one per line)',
    );
    console.log('  --help, -h       Show this help message');
    console.log('');
    console.log('Examples:');
    console.log('  # Change passwords for specific users');
    console.log(
      '  npm run batch-change-password momo.client@ruangdiri.com:ruangdiri momo.org@ruangdiri.com:ruangdiri',
    );
    console.log('');
    console.log('  # Dry run (preview without changes)');
    console.log(
      '  npm run batch-change-password --dry-run momo.client@ruangdiri.com:ruangdiri',
    );
    console.log('');
    console.log('  # Using a file (each line: email:password)');
    console.log('  npm run batch-change-password --file users.txt');
    console.log('');
    console.log('File format (users.txt):');
    console.log('  momo.client@ruangdiri.com:ruangdiri');
    console.log('  momo.org@ruangdiri.com:ruangdiri');
    console.log('  user@example.com:newpassword');
    process.exit(0);
  }

  let dryRun = false;
  let filePath: string | null = null;
  let changes: BatchPasswordChange[] = [];

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--dry-run') {
      dryRun = true;
    } else if (arg === '--file') {
      filePath = args[++i];
      if (!filePath) {
        console.error('❌ --file option requires a file path');
        process.exit(1);
      }
    } else if (arg.includes(':')) {
      const [email, password] = arg.split(':');
      if (!email || !password) {
        console.error(
          `❌ Invalid format for ${arg}. Use email:password format`,
        );
        process.exit(1);
      }
      changes.push({ email, newPassword: password });
    }
  }

  // Read from file if specified
  if (filePath) {
    try {
      const fs = await import('fs');
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const lines = fileContent.split('\n').filter((line) => line.trim());

      for (const line of lines) {
        if (line.includes(':')) {
          const [email, password] = line.split(':');
          if (email && password) {
            changes.push({ email: email.trim(), newPassword: password.trim() });
          }
        }
      }
      console.log(
        `📄 Read ${changes.length} password changes from ${filePath}`,
      );
    } catch (error) {
      console.error(`❌ Error reading file ${filePath}:`, error);
      process.exit(1);
    }
  }

  if (changes.length === 0) {
    console.error('❌ No password changes specified');
    process.exit(1);
  }

  // Validate all changes
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  for (const change of changes) {
    if (!emailRegex.test(change.email)) {
      console.error(`❌ Invalid email format: ${change.email}`);
      process.exit(1);
    }
    if (change.newPassword.length < 6) {
      console.error(
        `❌ Password too short for ${change.email} (minimum 6 characters)`,
      );
      process.exit(1);
    }
  }

  await batchChangePasswords({ changes, dryRun });
}

main().catch((err) => {
  console.error('💥 Fatal error:', err);
  process.exit(1);
});
