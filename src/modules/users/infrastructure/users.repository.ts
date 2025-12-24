import { and, eq, getTableColumns, ilike, or, SQL } from 'drizzle-orm';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { DrizzleService } from '@common/drizzle/drizzle.service';

import {
  clientProfiles,
  employeeProfiles,
  organizations,
  psychologistProfiles,
  studentProfiles,
} from '@/common/database/database-schema';

import {
  executePagedQuery,
  totalCountQuery,
} from '@/common/utils/query-helper.util';

import { IPagination } from '@/common/types/metadata.type';

import {
  users,
  type UpdateUser,
  type UserProfile,
  type User,
  type CreateUser,
} from '../domain/users.schema';
import { UsersQueryDto } from '../domain/dto/user-response.dto';
import { ParsedDeviceInfo } from '@/common/utils/devices.util';

@Injectable()
export class UsersRepository {
  constructor(private drizzle: DrizzleService) {}

  private get db() {
    return this.drizzle.db;
  }

  async findById(id: string) {
    return await this.db.query.users.findFirst({
      where: eq(users.id, id),
    });
  }

  async findByEmail(email: string) {
    return await this.db.query.users.findFirst({
      where: eq(users.email, email),
      with: {
        organization: true,
        clientProfile: true,
        studentProfile: true,
        employeeProfile: true,
        psychologistProfile: true,
      },
    });
  }

  async create(createUserDto: CreateUser) {
    const result = await this.db
      .insert(users)
      .values({
        ...createUserDto,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return result[0];
  }

  async update(id: string, updateUserDto: UpdateUser) {
    const result = await this.db
      .update(users)
      .set({
        ...updateUserDto,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }

  async changePassword(userId: string, hashedPassword: string) {
    const currentUser = await this.db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: {
        password: true,
      },
    });

    if (!currentUser) {
      throw new ConflictException(`User not found with ID: ${userId}`);
    }

    const result = await this.db
      .update(users)
      .set({
        password: hashedPassword,
        passwordChangedAt: new Date(),
        updatedAt: new Date(),
        lastPassword: currentUser?.password,
      })
      .where(eq(users.id, userId))
      .returning();

    return result[0];
  }

  async getUserProfile(userId: string): Promise<(UserProfile & any) | null> {
    const userProfile = await this.db.query.users.findFirst({
      where: eq(users.id, userId),
      with: {
        organization: true,
        clientProfile: true,
        studentProfile: true,
        employeeProfile: true,
        psychologistProfile: true,
      },
      columns: {
        password: false,
        lastPassword: false,
        passwordChangedAt: false,
        createdAt: false,
        updatedAt: false,
        organizationId: false,
        isActive: false,
      },
    });

    if (!userProfile) {
      return null;
    }

    // ✅ FIX: Drizzle sometimes returns organization as array [id, type, totalQuota, remainingQuota]
    // Convert to proper object if it's an array
    let processedProfile: any = { ...userProfile };

    // ✅ DEBUG: Log raw organization data from Drizzle
    console.log('🔍 [Repository] Raw organization data:', processedProfile.organization);
    console.log('🔍 [Repository] Organization type:', typeof processedProfile.organization);
    console.log('🔍 [Repository] Is Array:', Array.isArray(processedProfile.organization));
    if (processedProfile.organization && Array.isArray(processedProfile.organization)) {
      const [id, type, totalQuota, remainingQuota] = processedProfile.organization as any[];
      processedProfile.organization = { id, type, totalQuota, remainingQuota };
      console.log('✅ [Repository] Converted array to object:', processedProfile.organization);
    }

    const filteredUserProfile = Object.fromEntries(
      Object.entries(processedProfile).filter(([_, value]) => value !== null),
    );

    return filteredUserProfile;
  }

  private buildSetPayload(
    table:
      | typeof users
      | typeof studentProfiles
      | typeof employeeProfiles
      | typeof psychologistProfiles
      | typeof organizations
      | typeof clientProfiles,
    data: Record<string, any>,
    includeUpdatedAt = true,
  ) {
    if (!data) return null;

    const tableCols = Object.keys(getTableColumns(table)); // real column keys
    const payload: Record<string, any> = {};

    for (const [k, v] of Object.entries(data)) {
      if (v !== undefined && tableCols.includes(k)) {
        payload[k] = v;
      }
    }

    if (includeUpdatedAt && tableCols.includes('updatedAt')) {
      payload.updatedAt = new Date();
    }

    return Object.keys(payload).length > 0 ? payload : null;
  }

  async updateUserProfile({
  userId,
  updateData,
  profileTable,
  useUserId,
}: {
  userId: string;
  updateData: {
    details?: Record<string, any>;
    generalData?: Record<string, any>;
  };
  profileTable:
    | typeof studentProfiles
    | typeof employeeProfiles
    | typeof psychologistProfiles
    | typeof organizations
    | typeof clientProfiles;
  useUserId: boolean;
}) {
  return await this.db.transaction(async (tx) => {
    let filterField: any;
    let filterValue: string;

    if (useUserId) {
      const userIdCol = (profileTable as any).userId;

      if (!userIdCol) {
        throw new ConflictException(
          'useUserId is true but this table has no userId column',
        );
      }

      filterField = userIdCol;
      filterValue = userId;
    } else {
      // ✅ FIXED: Check if organization profile needs updating
      const [userRow] = await tx
        .select({ organizationId: users.organizationId })
        .from(users)
        .where(eq(users.id, userId));

      // ✅ NEW: If no organizationId, skip profile update (only update users table)
      if (!userRow?.organizationId) {
        console.log(`⚠️ User ${userId} has no organization - skipping profile table update`);
        
        // Only update users table, skip profile table
        const { generalData } = updateData;
        const userPayload = this.buildSetPayload(users, generalData ?? {});

        if (!userPayload) {
          throw new ConflictException('No valid update data provided');
        }

        const [updatedUser] = await tx
          .update(users)
          .set(userPayload)
          .where(eq(users.id, userId))
          .returning();

        // ✅ FIX: Check if updatedUser exists
        if (!updatedUser) {
          throw new ConflictException('Failed to update user');
        }

        const { password, lastPassword, ...restGeneralData } = updatedUser;

        // ✅ FIX: Better boolean handling
        if (updatedUser.isOnboarded !== undefined) {
          restGeneralData.isOnboarded = Boolean(updatedUser.isOnboarded);
        }

        return { users: restGeneralData };
      }

      filterField = organizations.id;
      filterValue = userRow.organizationId;
    }

    const { details, generalData } = updateData;

    const userPayload = this.buildSetPayload(users, generalData ?? {});
    const profilePayload = this.buildSetPayload(profileTable, details ?? {});

    if (!userPayload && !profilePayload) {
      throw new ConflictException('No valid update data provided');
    }

    const result: {
      users?: any;
      profile?: any;
    } = {};

    if (userPayload) {
      const [updatedUser] = await tx
        .update(users)
        .set(userPayload)
        .where(eq(users.id, userId))
        .returning();

      const { password, lastPassword, ...restGeneralData } = updatedUser;

      if (userPayload.onboarded === '1') {
        restGeneralData.isOnboarded = true;
      } else if (userPayload.onboarded === '0') {
        restGeneralData.isOnboarded = false;
      }

      result.users = restGeneralData;
    }

    if (profilePayload) {
      const [updatedProfile] = await tx
        .update(profileTable)
        .set(profilePayload)
        .where(eq(filterField, filterValue))
        .returning();
      result.profile = updatedProfile;
    }

    return result;
  });
}

  async updateUserFullName(tx: any, userId: string, fullName: string) {
    await tx
      .update(users)
      .set({
        fullName,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  async updateUserProfilePicture(
    tx: any,
    userId: string,
    profilePicture: string,
  ) {
    await tx
      .update(users)
      .set({
        profilePicture,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  async updateUserOnboardedStatus(
    tx: any,
    userId: string,
    isOnboarded: boolean,
  ) {
    await tx
      .update(users)
      .set({
        isOnboarded,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  async updateUserDeviceInfo(deviceInfo: ParsedDeviceInfo, userId: string) {
    await this.db
      .update(users)
      .set({
        osName: deviceInfo.osName,
        deviceType: deviceInfo.deviceType,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
  }

  async getUserById(tx: any, userId: string) {
    const user = tx
      .select({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        role: users.role,
        organizationId: users.organizationId,
        profilePicture: users.profilePicture,
      })
      .from(users)
      .where(eq(users.id, userId))
      .then((r: any) => r[0]);

    if (!user) throw new ConflictException(`User not found with ID: ${userId}`);

    return user;
  }

  async getUsers(query: UsersQueryDto): Promise<{
    data: User[];
    metadata: IPagination;
  }> {
    const { limit, page, search, role } = query;

    let whereConditions: SQL<unknown>[] = [];

    if (search) {
      whereConditions.push(
        or(
          ilike(users.fullName, `%${query.search}%`),
          ilike(users.email, `%${query.search}%`),
        ) as SQL<string>,
      );
    }

    if (role) {
      whereConditions.push(eq(users.role, role));
    }

    const baseQuery = this.db
      .select({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        role: users.role,
        totalCount: totalCountQuery,
      })
      .from(users)
      .where(and(...whereConditions))
      .groupBy(users.id, users.fullName, users.email);

    return executePagedQuery(baseQuery.$dynamic(), [], page, limit, false);
  }


  async updateOrganizationProfile(
  organizationId: string,
  data: Record<string, any>,
): Promise<any> {
  console.log('🔥 [Repository] updateOrganizationProfile START');
  console.log('🔥 organizationId:', organizationId);
  console.log('🔥 data:', JSON.stringify(data, null, 2));

  try {
    // Build update payload
    const updatePayload: any = {
      updatedAt: new Date(),
    };

    // Map fields
    if (data.address !== undefined) {
      updatePayload.address = data.address;
    }
    if (data.phone !== undefined) {
      updatePayload.phone = data.phone;
    }

    console.log('🔥 updatePayload:', updatePayload);

    const [updated] = await this.db
      .update(organizations)
      .set(updatePayload)
      .where(eq(organizations.id, organizationId))
      .returning();

    console.log('🔥 updated result:', updated);
    return updated;

  } catch (error) {
    console.error('🔥 ERROR in updateOrganizationProfile:', error);
    throw error;
  }
}
  
  async getUserByOrganizationId(
    organizationId: string,
  ): Promise<Omit<
    User,
    'password' | 'lastPassword' | 'passwordChangedAt'
  > | null> {
    const user = await this.db.query.users.findFirst({
      where: eq(users.organizationId, organizationId),
      columns: {
        id: true,
        email: true,
        profilePicture: true,
        fullName: true,
        role: true,
        organizationId: true,
        isOnboarded: true,
        osName: true,
        deviceType: true,
        address: true,
        phone: true,
        createdAt: true,
        updatedAt: true,
        isActive: true,
        timezone: true,
      },
    });

    return user ?? null;
  }
}
