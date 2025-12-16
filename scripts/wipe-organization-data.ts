import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { eq, inArray } from 'drizzle-orm';
import * as readline from 'readline';

// Load environment variables
if (env.NODE_ENV !== 'production') {
  const dotenv = require('dotenv');
  dotenv.config({
    path: `${process.cwd()}/.env.${env.NODE_ENV ?? 'development'}`,
  });
}

// Import schemas
import { users } from '../src/modules/users/domain/users.schema';
import { screenings } from '../src/modules/mental-health/domain/screenings/screenings.schema';
import { env } from '@/config/env.config';

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USERNAME || 'postgres',
  password: 'admin',
  database: process.env.DB_NAME || 'ruang_diri',
});

const db = drizzle(pool);

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function askQuestion(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function previewDataToDelete(organizationId: string) {
  console.log('\n🔍 Previewing data to be deleted...\n');

  // Get users in the organization
  const usersInOrg = await db
    .select({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
    })
    .from(users)
    .where(eq(users.organizationId, organizationId));

  if (usersInOrg.length === 0) {
    console.log('❌ No users found for organization ID:', organizationId);
    return { users: [], screenings: [] };
  }

  console.log(`👥 Users in organization (${usersInOrg.length}):`);
  usersInOrg.forEach((user, index) => {
    console.log(
      `  ${index + 1}. ${user.fullName || 'No name'} (${user.email}) - ID: ${user.id}`,
    );
  });

  const userIds = usersInOrg.map((user) => user.id);

  // Get screenings for these users
  const userScreenings = await db
    .select({
      id: screenings.id,
      userId: screenings.userId,
      screeningStatus: screenings.screeningStatus,
      createdAt: screenings.createdAt,
    })
    .from(screenings)
    .where(inArray(screenings.userId, userIds));

  console.log(`\n📊 Screenings to be deleted (${userScreenings.length}):`);
  if (userScreenings.length > 0) {
    userScreenings.forEach((screening, index) => {
      const user = usersInOrg.find((u) => u.id === screening.userId);
      console.log(
        `  ${index + 1}. ${screening.screeningStatus} - User: ${user?.fullName || 'No name'} - Created: ${screening.createdAt.toISOString().split('T')[0]}`,
      );
    });
  } else {
    console.log('  No screenings found.');
  }

  const screeningIds = userScreenings.map((s) => s.id);

  return {
    users: usersInOrg,
    screenings: userScreenings,
  };
}

async function deleteOrganizationData(organizationId: string) {
  console.log('\n🗑️ Starting deletion process...\n');

  try {
    // Get users in the organization
    const usersInOrg = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.organizationId, organizationId));

    if (usersInOrg.length === 0) {
      console.log('❌ No users found for organization ID:', organizationId);
      return;
    }

    const userIds = usersInOrg.map((user) => user.id);

    // Get screenings for these users
    const userScreenings = await db
      .select({ id: screenings.id })
      .from(screenings)
      .where(inArray(screenings.userId, userIds));

    const screeningIds = userScreenings.map((s) => s.id);

    let deletedScreenings = 0;

    // Delete screenings
    if (userIds.length > 0) {
      console.log('🔄 Deleting screenings...');
      const deleteScreeningsResult = await db
        .delete(screenings)
        .where(inArray(screenings.userId, userIds));

      deletedScreenings = deleteScreeningsResult.rowCount || 0;
      console.log(`✅ Deleted ${deletedScreenings} screenings`);
    }

    console.log('\n📊 Deletion Summary:');
    console.log(`  Organization ID: ${organizationId}`);
    console.log(`  Users affected: ${usersInOrg.length}`);
    console.log(`  Screenings deleted: ${deletedScreenings}`);
    console.log('\n✅ Data wipe completed successfully!');
  } catch (error) {
    console.error('❌ Error during deletion:', error);
    throw error;
  }
}

async function main() {
  console.log('🧹 Organization Data Wipe Tool\n');

  try {
    // Get organization ID from command line argument or prompt
    let organizationId = process.argv[2];

    if (!organizationId) {
      organizationId = await askQuestion('Enter organization ID: ');
    }

    if (!organizationId.trim()) {
      console.log('❌ Organization ID is required');
      process.exit(1);
    }

    organizationId = organizationId.trim();

    // Preview data to be deleted
    const dataPreview = await previewDataToDelete(organizationId);

    if (dataPreview.users.length === 0) {
      console.log('\n❌ No data found to delete. Exiting.');
      process.exit(0);
    }

    // Ask for confirmation
    const confirm1 = await askQuestion(
      '\nAre you sure you want to delete this data? (yes/no): ',
    );
    if (confirm1.toLowerCase() !== 'yes') {
      console.log('❌ Operation cancelled.');
      process.exit(0);
    }

    const confirm2 = await askQuestion(
      '\nThis action cannot be undone. Type "DELETE" to confirm: ',
    );
    if (confirm2 !== 'DELETE') {
      console.log('❌ Operation cancelled.');
      process.exit(0);
    }

    // Perform deletion
    await deleteOrganizationData(organizationId);
  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  } finally {
    rl.close();
    await pool.end();
  }
}

// Handle script termination
process.on('SIGINT', async () => {
  console.log('\n❌ Script interrupted by user');
  rl.close();
  await pool.end();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n❌ Script terminated');
  rl.close();
  await pool.end();
  process.exit(0);
});

// Run the script
if (require.main === module) {
  main().catch(console.error);
}
