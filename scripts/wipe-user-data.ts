#!/usr/bin/env ts-node

/**
 * User Deletion Script
 *
 * This script safely deletes a user and all their related data from the database.
 * It handles cascade deletion of all dependent records across multiple tables.
 *
 * Usage:
 *   npm run wipe-user -- --userId=<uuid>
 *   OR
 *   npm run wipe-user -- --email=<email>
 *
 * Example:
 *   npm run wipe-user -- --userId=123e4567-e89b-12d3-a456-426614174000
 *   npm run wipe-user -- --email=user@example.com
 */

import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq, and } from 'drizzle-orm';

import { env } from '@/config/env.config';
import { users } from '@/modules/users/domain/users.schema';
import { organizations } from '@/modules/organizations/domain/organizations.schema';
import { employeeProfiles } from '@/modules/employees/domain/employees.schema';
import { studentProfiles } from '@/modules/students/domain/student.schema';
import {
  psychologistProfiles,
  psychologistAvailability,
} from '@/modules/psychologists/psychologist-profile.schema';
import { clientProfiles } from '@/modules/clients/clients-profile.schema';
import { screenings } from '@/modules/mental-health/domain/screenings/screenings.schema';
import { counselings } from '@/modules/mental-health/domain/counselings/counselings.schema';
import {
  chatSessions,
  chatMessages,
} from '@/modules/chat/domain/chat-sessions.schema';
import {
  schedules,
  usersSchedules,
  scheduleAttachments,
} from '@/modules/schedules/domain/schedules.schema';
import { notifications } from '@/modules/notifications/domain/notifications.schema';

// Load environment variables
if (env.NODE_ENV !== 'production') {
  const dotenv = require('dotenv');
  dotenv.config({
    path: `${process.cwd()}/.env.${env.NODE_ENV ?? 'development'}`,
  });
}

interface DeletionStats {
  userId: string;
  userInfo: {
    email: string;
    fullName: string;
    role: string;
    organizationId?: string;
  };
  deletedRecords: {
    chatMessages: number;
    chatSessions: number;
    notifications: number;
    scheduleAttachments: number;
    usersSchedules: number;
    schedules: number;
    psychologistAvailability: number;
    counselings: number;
    screenings: number;
    profiles: number;
    user: number;
  };
}

/**
 * Get user information by ID or email
 */
async function getUserInfo(db: any, userId?: string, email?: string) {
  if (userId) {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    return user;
  }

  if (email) {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    return user;
  }

  throw new Error('Either userId or email must be provided');
}

/**
 * Delete user and all related data
 */
async function deleteUserAndRelatedData(
  db: any,
  targetUserId: string,
): Promise<DeletionStats> {
  // Get user info first
  const user = await getUserInfo(db, targetUserId);
  if (!user) {
    throw new Error(`User with ID ${targetUserId} not found`);
  }

  console.log(`\n🔍 Found user to delete:`);
  console.log(`   Email: ${user.email}`);
  console.log(`   Name: ${user.fullName}`);
  console.log(`   Role: ${user.role}`);
  console.log(`   Organization ID: ${user.organizationId || 'None'}`);

  const stats: DeletionStats = {
    userId: targetUserId,
    userInfo: {
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      organizationId: user.organizationId,
    },
    deletedRecords: {
      chatMessages: 0,
      chatSessions: 0,
      notifications: 0,
      scheduleAttachments: 0,
      usersSchedules: 0,
      schedules: 0,
      psychologistAvailability: 0,
      counselings: 0,
      screenings: 0,
      profiles: 0,
      user: 0,
    },
  };

  // Perform deletion in a transaction to ensure atomicity
  await db.transaction(async (tx: any) => {
    console.log('\n🗑️  Starting deletion process...\n');

    // 1. Delete chat messages (depends on sessions)
    console.log('🔄 Deleting chat messages...');
    const chatSessionIds = await tx
      .select({ id: chatSessions.id })
      .from(chatSessions)
      .where(
        and(
          eq(chatSessions.clientId, targetUserId),
          eq(chatSessions.psychologistId, targetUserId),
        ),
      );

    if (chatSessionIds.length > 0) {
      const sessionIds = chatSessionIds.map((session) => session.id);
      for (const sessionId of sessionIds) {
        const deletedMessages = await tx
          .delete(chatMessages)
          .where(eq(chatMessages.sessionId, sessionId))
          .returning();
        stats.deletedRecords.chatMessages += deletedMessages.length;
      }
    }

    // Also delete messages where user is the sender
    const deletedUserMessages = await tx
      .delete(chatMessages)
      .where(eq(chatMessages.senderId, targetUserId))
      .returning();
    stats.deletedRecords.chatMessages += deletedUserMessages.length;

    // 2. Delete chat sessions (where user is client or psychologist)
    console.log('🔄 Deleting chat sessions...');
    const deletedClientSessions = await tx
      .delete(chatSessions)
      .where(eq(chatSessions.clientId, targetUserId))
      .returning();
    stats.deletedRecords.chatSessions += deletedClientSessions.length;

    const deletedPsychSessions = await tx
      .delete(chatSessions)
      .where(eq(chatSessions.psychologistId, targetUserId))
      .returning();
    stats.deletedRecords.chatSessions += deletedPsychSessions.length;

    // 3. Delete notifications
    console.log('🔄 Deleting notifications...');
    const deletedNotifications = await tx
      .delete(notifications)
      .where(eq(notifications.recipientId, targetUserId))
      .returning();
    stats.deletedRecords.notifications = deletedNotifications.length;

    // 4. Delete schedule attachments (for schedules created by user)
    console.log('🔄 Deleting schedule attachments...');
    const userScheduleIds = await tx
      .select({ id: schedules.id })
      .from(schedules)
      .where(eq(schedules.createdBy, targetUserId));

    if (userScheduleIds.length > 0) {
      const scheduleIds = userScheduleIds.map((schedule) => schedule.id);
      for (const scheduleId of scheduleIds) {
        const deletedAttachments = await tx
          .delete(scheduleAttachments)
          .where(eq(scheduleAttachments.scheduleId, scheduleId))
          .returning();
        stats.deletedRecords.scheduleAttachments += deletedAttachments.length;
      }
    }

    // 5. Delete user-schedule relationships
    console.log('🔄 Deleting user-schedule relationships...');
    const deletedUserSchedules = await tx
      .delete(usersSchedules)
      .where(eq(usersSchedules.userId, targetUserId))
      .returning();
    stats.deletedRecords.usersSchedules = deletedUserSchedules.length;

    // 6. Delete schedules created by user
    console.log('🔄 Deleting schedules...');
    const deletedSchedules = await tx
      .delete(schedules)
      .where(eq(schedules.createdBy, targetUserId))
      .returning();
    stats.deletedRecords.schedules = deletedSchedules.length;

    // 7. Delete psychologist availability (if user is a psychologist)
    if (user.role === 'psychologist') {
      console.log('🔄 Deleting psychologist availability...');
      const deletedAvailability = await tx
        .delete(psychologistAvailability)
        .where(eq(psychologistAvailability.psychologistId, targetUserId))
        .returning();
      stats.deletedRecords.psychologistAvailability =
        deletedAvailability.length;
    }

    // 8. Delete counselings (where user is client or psychologist)
    console.log('🔄 Deleting counseling records...');
    const deletedCounselingsAsClient = await tx
      .delete(counselings)
      .where(eq(counselings.userId, targetUserId))
      .returning();
    stats.deletedRecords.counselings += deletedCounselingsAsClient.length;

    const deletedCounselingsAsPsych = await tx
      .delete(counselings)
      .where(eq(counselings.psychologistId, targetUserId))
      .returning();
    stats.deletedRecords.counselings += deletedCounselingsAsPsych.length;

    // 9. Delete screenings
    console.log('🔄 Deleting screening records...');
    const deletedScreenings = await tx
      .delete(screenings)
      .where(eq(screenings.userId, targetUserId))
      .returning();
    stats.deletedRecords.screenings = deletedScreenings.length;

    // 10. Delete profile records based on user role
    console.log('🔄 Deleting profile records...');
    let profileDeleted = false;

    if (user.role === 'employee') {
      const deletedEmployeeProfile = await tx
        .delete(employeeProfiles)
        .where(eq(employeeProfiles.userId, targetUserId))
        .returning();
      profileDeleted = deletedEmployeeProfile.length > 0;
    } else if (user.role === 'student') {
      const deletedStudentProfile = await tx
        .delete(studentProfiles)
        .where(eq(studentProfiles.userId, targetUserId))
        .returning();
      profileDeleted = deletedStudentProfile.length > 0;
    } else if (user.role === 'psychologist') {
      const deletedPsychProfile = await tx
        .delete(psychologistProfiles)
        .where(eq(psychologistProfiles.userId, targetUserId))
        .returning();
      profileDeleted = deletedPsychProfile.length > 0;
    } else if (user.role === 'client') {
      const deletedClientProfile = await tx
        .delete(clientProfiles)
        .where(eq(clientProfiles.userId, targetUserId))
        .returning();
      profileDeleted = deletedClientProfile.length > 0;
    }

    stats.deletedRecords.profiles = profileDeleted ? 1 : 0;

    // 11. Finally, delete the user record
    console.log('🔄 Deleting user record...');
    const deletedUser = await tx
      .delete(users)
      .where(eq(users.id, targetUserId))
      .returning();
    stats.deletedRecords.user = deletedUser.length;

    console.log('\n✅ Deletion completed successfully!');
  });

  return stats;
}

/**
 * Main execution function
 */
async function main() {
  const args = process.argv.slice(2);
  let userId: string | undefined;
  let email: string | undefined;

  // Parse command line arguments
  for (const arg of args) {
    if (arg.startsWith('--userId=')) {
      userId = arg.split('=')[1];
    } else if (arg.startsWith('--email=')) {
      email = arg.split('=')[1];
    }
  }

  if (!userId && !email) {
    console.error('❌ Error: Either --userId or --email must be provided');
    console.log('\nUsage:');
    console.log('  npm run wipe-user -- --userId=<uuid>');
    console.log('  npm run wipe-user -- --email=<email>');
    console.log('\nExample:');
    console.log(
      '  npm run wipe-user -- --userId=123e4567-e89b-12d3-a456-426614174000',
    );
    console.log('  npm run wipe-user -- --email=user@example.com');
    process.exit(1);
  }

  console.log('🚀 User Deletion Script Started');
  console.log('================================');

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
      employeeProfiles,
      studentProfiles,
      psychologistProfiles,
      clientProfiles,
      screenings,
      counselings,
      chatSessions,
      chatMessages,
      schedules,
      usersSchedules,
      scheduleAttachments,
      notifications,
      psychologistAvailability,
    },
  });

  try {
    // Get user info
    const user = await getUserInfo(db, userId, email);
    if (!user) {
      throw new Error(
        `User not found with ${userId ? `ID: ${userId}` : `email: ${email}`}`,
      );
    }

    const targetUserId = user.id;

    // Confirm deletion
    console.log(
      '\n⚠️  WARNING: This action will permanently delete the user and ALL related data!',
    );
    console.log('\nUser to be deleted:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Name: ${user.fullName}`);
    console.log(`   Role: ${user.role}`);

    // In a production environment, you might want to add a confirmation prompt here
    // For now, we'll proceed with the deletion

    const stats = await deleteUserAndRelatedData(db, targetUserId);

    // Print deletion summary
    console.log('\n📊 Deletion Summary');
    console.log('===================');
    console.log(`User: ${stats.userInfo.fullName} (${stats.userInfo.email})`);
    console.log(`Role: ${stats.userInfo.role}`);
    console.log('\nDeleted Records:');
    console.log(`   User record: ${stats.deletedRecords.user}`);
    console.log(`   Profile records: ${stats.deletedRecords.profiles}`);
    console.log(`   Screening records: ${stats.deletedRecords.screenings}`);
    console.log(`   Counseling records: ${stats.deletedRecords.counselings}`);
    console.log(`   Chat sessions: ${stats.deletedRecords.chatSessions}`);
    console.log(`   Chat messages: ${stats.deletedRecords.chatMessages}`);
    console.log(`   Schedules: ${stats.deletedRecords.schedules}`);
    console.log(
      `   User-schedule relationships: ${stats.deletedRecords.usersSchedules}`,
    );
    console.log(
      `   Schedule attachments: ${stats.deletedRecords.scheduleAttachments}`,
    );
    console.log(`   Notifications: ${stats.deletedRecords.notifications}`);
    console.log(
      `   Psychologist availability: ${stats.deletedRecords.psychologistAvailability}`,
    );

    const totalRecords = Object.values(stats.deletedRecords).reduce(
      (sum, count) => sum + count,
      0,
    );
    console.log(`\n🎯 Total records deleted: ${totalRecords}`);
  } catch (error) {
    console.error('❌ Error during user deletion:', error);
    throw error;
  } finally {
    await pool.end();
    console.log('\n🔌 Database connection closed');
  }
}

// Handle script execution
if (require.main === module) {
  main().catch((err) => {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  });
}

export { deleteUserAndRelatedData, getUserInfo };
