import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq, and } from 'drizzle-orm';

import { env } from '../src/config/env.config';
import { users } from '../src/modules/users/domain/users.schema';
import { screenings } from '../src/modules/mental-health/domain/screenings/screenings.schema';

if (env.NODE_ENV !== 'production') {
  const dotenv = require('dotenv');
  dotenv.config({
    path: `${process.cwd()}/.env.${env.NODE_ENV ?? 'development'}`,
  });
}

// Target organization ID
const TARGET_ORGANIZATION_ID = 'ad6fb6dd-fa6f-46c5-ba76-9a2e5c6bcbcc';

async function wipeOrganizationScreenings() {
  console.log('🔄 Starting screening data wipe process...');
  console.log(`🎯 Target Organization ID: ${TARGET_ORGANIZATION_ID}`);

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
      screenings,
    },
  });

  try {
    // 1. First, let's preview what we're about to delete
    console.log('\n📊 Analyzing data to be deleted...');

    // Get all users from this organization
    const orgUsers = await db
      .select({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        role: users.role,
      })
      .from(users)
      .where(eq(users.organizationId, TARGET_ORGANIZATION_ID));

    if (orgUsers.length === 0) {
      console.log('❌ No users found for this organization ID');
      return;
    }

    console.log(`📋 Found ${orgUsers.length} users in organization:`);
    orgUsers.forEach((user) => {
      console.log(`   - ${user.fullName} (${user.email}) - Role: ${user.role}`);
    });

    const userIds = orgUsers.map((user) => user.id);

    // Count screenings to be deleted
    const screeningsToDelete = await db
      .select()
      .from(screenings)
      .where(eq(screenings.userId, userIds[0])); // Start with first user

    // Get all screenings for all users
    let totalScreenings = 0;
    const screeningsByUser: Record<string, number> = {};

    for (const user of orgUsers) {
      const userScreenings = await db
        .select()
        .from(screenings)
        .where(eq(screenings.userId, user.id));

      screeningsByUser[user.email] = userScreenings.length;
      totalScreenings += userScreenings.length;
    }

    console.log('\n📈 Screening count by user:');
    Object.entries(screeningsByUser).forEach(([email, count]) => {
      console.log(`   - ${email}: ${count} screenings`);
    });

    console.log(`\n🔢 Total screenings to delete: ${totalScreenings}`);

    if (totalScreenings === 0) {
      console.log('✅ No screenings found to delete');
      return;
    }

    // Confirm deletion
    console.log(
      '\n⚠️  WARNING: This will permanently delete all screening data!',
    );
    console.log('   - Organization ID:', TARGET_ORGANIZATION_ID);
    console.log('   - Affected users:', orgUsers.length);
    console.log('   - Screenings to delete:', totalScreenings);

    // Wait 5 seconds before proceeding
    console.log('\n⏳ Starting deletion in 5 seconds...');
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // 2. Delete screenings in batches
    let deletedCount = 0;

    for (const user of orgUsers) {
      const userScreenings = await db
        .select({ id: screenings.id })
        .from(screenings)
        .where(eq(screenings.userId, user.id));

      if (userScreenings.length > 0) {
        // Delete user's screenings
        const deleteResult = await db
          .delete(screenings)
          .where(eq(screenings.userId, user.id));

        console.log(
          `🗑️  Deleted ${userScreenings.length} screenings for ${user.fullName} (${user.email})`,
        );
        deletedCount += userScreenings.length;
      }
    }

    // 3. Verify deletion
    console.log('\n🔍 Verifying deletion...');
    let remainingScreenings = 0;

    for (const user of orgUsers) {
      const remaining = await db
        .select()
        .from(screenings)
        .where(eq(screenings.userId, user.id));
      remainingScreenings += remaining.length;
    }

    // 4. Summary
    console.log('\n📋 DELETION SUMMARY:');
    console.log('='.repeat(50));
    console.log(`Organization ID: ${TARGET_ORGANIZATION_ID}`);
    console.log(`Total users processed: ${orgUsers.length}`);
    console.log(`Screenings deleted: ${deletedCount}`);
    console.log(`Remaining screenings: ${remainingScreenings}`);
    console.log('='.repeat(50));

    if (remainingScreenings === 0) {
      console.log('✅ All screening data successfully deleted!');
    } else {
      console.log(
        '⚠️  Some screenings may still remain. Please check manually.',
      );
    }
  } catch (error) {
    console.error('❌ Error during deletion process:', error);
    throw error;
  } finally {
    await pool.end();
    console.log('🔌 Database connection closed');
  }
}

// Safety confirmation
async function confirmDeletion(): Promise<boolean> {
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    readline.question(
      '\n❓ Are you sure you want to delete all screening data for this organization? (yes/no): ',
      (answer: string) => {
        readline.close();
        resolve(answer.toLowerCase() === 'yes');
      },
    );
  });
}

async function main() {
  try {
    console.log('🚨 DANGER: SCREENING DATA DELETION SCRIPT 🚨');
    console.log('This script will permanently delete all screening data');
    console.log(`for organization: ${TARGET_ORGANIZATION_ID}`);

    // Manual confirmation required
    const confirmed = await confirmDeletion();

    if (!confirmed) {
      console.log('❌ Deletion cancelled by user');
      process.exit(0);
    }

    await wipeOrganizationScreenings();
    console.log('✅ Script completed successfully');
  } catch (error) {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  }
}

// Run only if called directly
if (require.main === module) {
  main();
}
