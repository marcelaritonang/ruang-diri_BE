import { Injectable, Logger } from '@nestjs/common';
import { eq, inArray, count } from 'drizzle-orm';

import { DrizzleService } from '@/common/drizzle/drizzle.service';
import {
  users,
  screenings,
  counselings,
  employeeProfiles,
  studentProfiles,
} from '@/common/database/database-schema';
import {
  SuccessResponse,
  ISuccessResponse,
} from '@/common/utils/response.util';
import { ErrorHandlerUtil } from '@/common/utils/error-handler.util';
import { BaseService } from '@/common/decorators/service-error-handler.decorator';

export interface WipePreviewData {
  organizationId: string;
  totalUsers: number;
  usersByRole: {
    employees: number;
    students: number;
    others: number;
  };
  screeningsCount: number;
  counselingsCount: number;
  users: Array<{
    id: string;
    fullName: string | null;
    email: string;
    role: string;
    screeningsCount: number;
    counselingsCount: number;
  }>;
}

export interface WipeResult {
  organizationId: string;
  deletedData: {
    screenings: number;
    counselings: number;
  };
  affectedUsers: number;
  timestamp: string;
}

@Injectable()
export class DataWipeService extends BaseService {
  protected readonly logger = new Logger(DataWipeService.name);

  constructor(
    private readonly drizzleService: DrizzleService,
    errorHandler: ErrorHandlerUtil,
  ) {
    super(errorHandler);
  }

  /**
   * Preview what data will be wiped for a given organization ID
   */
  async previewWipeData(
    organizationId: string,
  ): Promise<ISuccessResponse<WipePreviewData>> {
    this.logger.log(`Previewing wipe data for organization: ${organizationId}`);

    // Get all users for this organization
    const orgUsers = await this.drizzleService.db
      .select({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        role: users.role,
      })
      .from(users)
      .where(eq(users.organizationId, organizationId));

    if (orgUsers.length === 0) {
      this.logger.warn(`No users found for organization: ${organizationId}`);
      return SuccessResponse.success(
        {
          organizationId,
          totalUsers: 0,
          usersByRole: { employees: 0, students: 0, others: 0 },
          screeningsCount: 0,
          counselingsCount: 0,
          users: [],
        },
        'No users found for this organization',
      );
    }

    const userIds = orgUsers.map((u) => u.id);

    // Count role distribution
    const usersByRole = {
      employees: orgUsers.filter((u) => u.role === 'employee').length,
      students: orgUsers.filter((u) => u.role === 'student').length,
      others: orgUsers.filter((u) => !['employee', 'student'].includes(u.role))
        .length,
    };

    // Count screenings and counselings for these users
    const [screeningsResult, counselingsResult] = await Promise.all([
      this.drizzleService.db
        .select({ count: count() })
        .from(screenings)
        .where(inArray(screenings.userId, userIds)),
      this.drizzleService.db
        .select({ count: count() })
        .from(counselings)
        .where(inArray(counselings.userId, userIds)),
    ]);

    // Get detailed user data with their screening/counseling counts
    const usersWithCounts = await Promise.all(
      orgUsers.map(async (user) => {
        const [userScreenings, userCounselings] = await Promise.all([
          this.drizzleService.db
            .select({ count: count() })
            .from(screenings)
            .where(eq(screenings.userId, user.id)),
          this.drizzleService.db
            .select({ count: count() })
            .from(counselings)
            .where(eq(counselings.userId, user.id)),
        ]);

        return {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
          screeningsCount: userScreenings[0]?.count || 0,
          counselingsCount: userCounselings[0]?.count || 0,
        };
      }),
    );

    const previewData: WipePreviewData = {
      organizationId,
      totalUsers: orgUsers.length,
      usersByRole,
      screeningsCount: screeningsResult[0]?.count || 0,
      counselingsCount: counselingsResult[0]?.count || 0,
      users: usersWithCounts,
    };

    this.logger.log(
      `Preview complete for organization ${organizationId}: ${previewData.screeningsCount} screenings, ${previewData.counselingsCount} counselings across ${previewData.totalUsers} users`,
    );

    return SuccessResponse.success(
      previewData,
      'Wipe preview generated successfully',
    );
  }

  /**
   * Execute the wipe operation for a given organization ID
   * This will delete all screenings and counselings for users in the organization
   */
  async executeWipe(
    organizationId: string,
  ): Promise<ISuccessResponse<WipeResult>> {
    this.logger.warn(
      `EXECUTING WIPE OPERATION for organization: ${organizationId}`,
    );

    // Get all users for this organization
    const orgUsers = await this.drizzleService.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.organizationId, organizationId));

    if (orgUsers.length === 0) {
      this.logger.warn(`No users found for organization: ${organizationId}`);
      return SuccessResponse.success(
        {
          organizationId,
          deletedData: { screenings: 0, counselings: 0 },
          affectedUsers: 0,
          timestamp: new Date().toISOString(),
        },
        'No users found for this organization - nothing to wipe',
      );
    }

    const userIds = orgUsers.map((u) => u.id);

    // Count existing records before deletion
    const [existingScreenings, existingCounselings] = await Promise.all([
      this.drizzleService.db
        .select({ count: count() })
        .from(screenings)
        .where(inArray(screenings.userId, userIds)),
      this.drizzleService.db
        .select({ count: count() })
        .from(counselings)
        .where(inArray(counselings.userId, userIds)),
    ]);

    const screeningsToDelete = existingScreenings[0]?.count || 0;
    const counselingsToDelete = existingCounselings[0]?.count || 0;

    this.logger.warn(
      `About to delete ${screeningsToDelete} screenings and ${counselingsToDelete} counselings for ${userIds.length} users`,
    );

    // Execute deletions in transaction
    const result = await this.drizzleService.db.transaction(async (tx) => {
      // Delete counselings first (they might reference screenings)
      const deletedCounselings = await tx
        .delete(counselings)
        .where(inArray(counselings.userId, userIds))
        .returning({ id: counselings.id });

      // Delete screenings
      const deletedScreenings = await tx
        .delete(screenings)
        .where(inArray(screenings.userId, userIds))
        .returning({ id: screenings.id });

      return {
        deletedScreenings: deletedScreenings.length,
        deletedCounselings: deletedCounselings.length,
      };
    });

    const wipeResult: WipeResult = {
      organizationId,
      deletedData: {
        screenings: result.deletedScreenings,
        counselings: result.deletedCounselings,
      },
      affectedUsers: userIds.length,
      timestamp: new Date().toISOString(),
    };

    this.logger.warn(
      `WIPE OPERATION COMPLETED for organization ${organizationId}: Deleted ${result.deletedScreenings} screenings and ${result.deletedCounselings} counselings for ${userIds.length} users`,
    );

    return SuccessResponse.success(
      wipeResult,
      `Successfully wiped screening data for organization ${organizationId}`,
    );
  }

  /**
   * Get statistics about screening data for a specific organization
   */
  async getOrganizationStats(organizationId: string): Promise<SuccessResponse> {
    this.logger.log(`Getting statistics for organization: ${organizationId}`);

    // Get organization users count by role
    const orgUsers = await this.drizzleService.db
      .select({
        id: users.id,
        role: users.role,
      })
      .from(users)
      .where(eq(users.organizationId, organizationId));

    if (orgUsers.length === 0) {
      return SuccessResponse.success(
        {
          organizationId,
          totalUsers: 0,
          usersByRole: { employees: 0, students: 0, others: 0 },
          screeningsCount: 0,
          counselingsCount: 0,
          lastScreeningDate: null,
          lastCounselingDate: null,
        },
        'No users found for this organization',
      );
    }

    const userIds = orgUsers.map((u) => u.id);
    const usersByRole = {
      employees: orgUsers.filter((u) => u.role === 'employee').length,
      students: orgUsers.filter((u) => u.role === 'student').length,
      others: orgUsers.filter((u) => !['employee', 'student'].includes(u.role))
        .length,
    };

    // Get screening and counseling statistics
    const [screeningsStats, counselingsStats] = await Promise.all([
      this.drizzleService.db
        .select({
          count: count(),
        })
        .from(screenings)
        .where(inArray(screenings.userId, userIds)),
      this.drizzleService.db
        .select({
          count: count(),
        })
        .from(counselings)
        .where(inArray(counselings.userId, userIds)),
    ]);

    // Get latest dates separately for proper typing
    const [latestScreening] = await this.drizzleService.db
      .select({ date: screenings.createdAt })
      .from(screenings)
      .where(inArray(screenings.userId, userIds))
      .orderBy(screenings.createdAt)
      .limit(1);

    const [latestCounseling] = await this.drizzleService.db
      .select({ date: counselings.date })
      .from(counselings)
      .where(inArray(counselings.userId, userIds))
      .orderBy(counselings.date)
      .limit(1);

    const stats = {
      organizationId,
      totalUsers: orgUsers.length,
      usersByRole,
      screeningsCount: screeningsStats[0]?.count || 0,
      counselingsCount: counselingsStats[0]?.count || 0,
      lastScreeningDate: latestScreening?.date || null,
      lastCounselingDate: latestCounseling?.date || null,
    };

    return SuccessResponse.success(
      stats,
      'Organization statistics retrieved successfully',
    );
  }
}
