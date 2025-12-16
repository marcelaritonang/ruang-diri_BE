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

    const filteredUserProfile = userProfile
      ? Object.fromEntries(
          Object.entries(userProfile).filter(([_, value]) => value !== null),
        )
      : null;

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
        const [userRow] = await tx
          .select({ organizationId: users.organizationId })
          .from(users)
          .where(eq(users.id, userId));

        if (!userRow?.organizationId) {
          throw new NotFoundException(`User ${userId} has no organization`);
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
