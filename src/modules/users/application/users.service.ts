import * as bcrypt from 'bcryptjs';

import {
  Injectable,
  NotFoundException,
  Logger,
  UnauthorizedException,
  BadRequestException,
  InternalServerErrorException,
  ConflictException,
} from '@nestjs/common';

import {
  studentProfiles,
  employeeProfiles,
  organizations,
  psychologistProfiles,
} from '@/common/database/database-schema';
import { SuccessResponse } from '@/common/utils/response.util';
import { ParsedDeviceInfo } from '@/common/utils/devices.util';
import { ACCOUNT_NOTIF_MSG } from '@/common/constants/notif-msg.constant';

import { NotificationsService } from '@/modules/notifications/application/notifications.service';
import { IUserRequest } from '@/modules/auth/strategies/jwt.strategy';

import { UsersRepository } from '../infrastructure/users.repository';

import type { User, UpdateUser, CreateUser } from '../domain/users.schema';
import { UsersQueryDto } from '../domain/dto/user-response.dto';
import {
  baseUserUpdateSchema,
  employeeUpdateSchema,
  organizationUpdateSchema,
  psychologistUpdateSchema,
  studentUpdateSchema,
} from '../domain/dto/user-update.dto';
import { cleanPayload } from '@/common/utils/validator.util';
import { CloudStorageService } from '@/common/cloud-storage/cloud-storage.service';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private usersRepository: UsersRepository,
    private notificationsService: NotificationsService,
    private cloudStorageService: CloudStorageService,
  ) {}

  async findById(id: string): Promise<User> {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async findByEmail(email: string): Promise<User | undefined> {
    return this.usersRepository.findByEmail(email);
  }

  async create(createUserDto: CreateUser): Promise<User> {
    if (createUserDto.password) {
      createUserDto.password = await bcrypt.hash(createUserDto.password, 10);
    }

    return this.usersRepository.create(createUserDto);
  }

  async update(id: string, updateUserDto: UpdateUser): Promise<User> {
    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    const user = await this.usersRepository.update(id, updateUserDto);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async getMe(userId: string) {
    this.logger.log(`Fetching profile for user ID: ${userId}`);

    const userProfile = await this.usersRepository.getUserProfile(userId);

    if (!userProfile) {
      throw new NotFoundException(`User profile not found for ID: ${userId}`);
    }

    // Generate signed URL for profile picture if it exists
    if (userProfile.profilePicture) {
      const signedUrl = await this.cloudStorageService.getSignedUrl(
        userProfile.profilePicture,
        { expiresIn: 60 }, // 60 minutes
      );
      userProfile.profilePictureUrl = signedUrl; // Add new field with signed URL
      // Keep original path in profilePicture for reference
    }

    this.logger.log(`Fetched profile for user ID: ${userId}`);

    return SuccessResponse.success(
      userProfile,
      'User profile fetched successfully',
    );
  }

  async updateUserDeviceInfo(
    userId: string,
    deviceInfo: ParsedDeviceInfo,
  ): Promise<SuccessResponse> {
    this.logger.log(`Updating device info for user ID: ${userId}`);

    try {
      await this.usersRepository.updateUserDeviceInfo(deviceInfo, userId);
      this.logger.log(
        `Device info updated successfully for user ID: ${userId}`,
      );

      return SuccessResponse.success(null, 'Device info updated successfully');
    } catch (error) {
      this.logger.error(`Error updating device info: ${error.message}`);
      throw new InternalServerErrorException(
        'Failed to update device info. Please try again later.',
      );
    }
  }

  async changePassword(
    userId: string,
    newPassword: string,
    oldPassword: string,
  ) {
    this.logger.log(`Changing password for user ID: ${userId}`);

    const user = await this.usersRepository.findById(userId);

    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    try {
      const isNewPasswordSameAsCurrent = await bcrypt.compare(
        newPassword,
        user.password,
      );

      const isOldPasswordCorrect = await bcrypt.compare(
        oldPassword,
        user.password,
      );

      const isNewPasswordSameAsOld = await bcrypt.compare(
        newPassword,
        user.lastPassword!,
      );

      if (isNewPasswordSameAsOld) {
        this.logger.warn(
          `User ID ${userId} attempted to change password to the previous value`,
        );

        if (!isOldPasswordCorrect) {
          this.logger.warn(`User ID ${userId} provided incorrect old password`);

          throw new UnauthorizedException('Old password is incorrect');
        }

        throw new ConflictException(
          'New password cannot be the same as previous password',
        );
      }

      if (!isOldPasswordCorrect) {
        this.logger.warn(`User ID ${userId} provided incorrect old password`);

        throw new BadRequestException('Old password is incorrect');
      }

      if (isNewPasswordSameAsCurrent) {
        this.logger.warn(
          `User ID ${userId} attempted to change password to the current value`,
        );

        throw new ConflictException(
          'New password cannot be the same as current password',
        );
      }

      const hashedNewPassword = await bcrypt.hash(newPassword, 10);

      const result = await this.usersRepository.changePassword(
        userId,
        hashedNewPassword,
      );

      if (result) {
        await this.notificationsService.createNotification({
          recipientIds: [userId],
          title: ACCOUNT_NOTIF_MSG.CHANGED_PASSWORD,
          type: 'system',
          subType: 'general',
        });
      }

      this.logger.log(`Password changed successfully for user ID: ${userId}`);

      return SuccessResponse.success(null, 'Password changed successfully');
    } catch (error) {
      this.logger.error(`Error changing password: ${error.message}`);

      if (error instanceof ConflictException) {
        throw error;
      } else if (error instanceof UnauthorizedException) {
        this.logger.warn(
          `Unauthorized attempt to change password for user ID: ${userId}`,
        );

        throw error;
      } else if (error instanceof BadRequestException) {
        this.logger.warn(
          `Bad request while changing password for user ID: ${userId}`,
        );

        throw error;
      }

      throw new InternalServerErrorException(
        'Failed to change password. Please try again later.',
      );
    }
  }

  async getUsers(query: UsersQueryDto): Promise<SuccessResponse> {
    this.logger.log(`Fetching users with query: ${JSON.stringify(query)}`);

    try {
      const users = await this.usersRepository.getUsers(query);

      this.logger.log(`Fetched ${users.data.length} users`);

      return SuccessResponse.success(users, 'Users fetched successfully');
    } catch (error) {
      this.logger.error(`Error fetching users: ${error.message}`);

      throw new InternalServerErrorException(
        'Failed to fetch users. Please try again later.',
      );
    }
  }

  async updateUserProfile(
  updateData: Record<string, any>,
  currentUser: IUserRequest['user'],
): Promise<SuccessResponse> {  // ✅ Return SuccessResponse
  console.log('📥 [Service] Raw data:', JSON.stringify(updateData, null, 2));
  console.log('👤 [Service] Current user:', { id: currentUser.id, role: currentUser.role });

  // Handle nested structure
  let flatData = updateData;
  if (updateData.generalData || updateData.details) {
    flatData = {
      ...updateData.details,
      ...updateData.generalData,
    };
    console.log('🔄 [Service] Flattened data:', JSON.stringify(flatData, null, 2));
  }

  // Validate data
  const validatedData = this.validateUserUpdatePayload(currentUser.role, flatData);
  console.log('🔍 [Service] After validation:', validatedData);

  // Separate fields
  const baseUserFields: any = {};
  const profileFields: any = {};
  
  Object.keys(validatedData).forEach(key => {
    if (['fullName', 'email', 'profilePicture', 'isOnboarded'].includes(key)) {
      if (validatedData[key] !== undefined) {
        baseUserFields[key] = validatedData[key];
      }
    } else if (validatedData[key] !== undefined) {
      profileFields[key] = validatedData[key];
    }
  });

  console.log('📊 [Service] Base fields:', baseUserFields);
  console.log('📊 [Service] Profile fields:', profileFields);

  // Update users table
  if (Object.keys(baseUserFields).length > 0) {
    await this.usersRepository.update(currentUser.id, baseUserFields);
    console.log('✅ [Service] Users table updated');
  }

  // Update profile table
  if (Object.keys(profileFields).length > 0) {
    const profileTable = this.getProfileTableByRole(currentUser.role);
    
    if (profileTable) {
      if (currentUser.role === 'organization') {
        const user = await this.usersRepository.findById(currentUser.id);
        if (!user?.organizationId) {
          throw new BadRequestException('Organization ID not found');
        }
        
        await this.usersRepository.updateUserProfile({
          userId: user.organizationId,
          updateData: profileFields,
          profileTable,
          useUserId: false,
        });
      } else {
        await this.usersRepository.updateUserProfile({
          userId: currentUser.id,
          updateData: profileFields,
          profileTable,
          useUserId: true,
        });
      }
      
      console.log(`✅ [Service] Profile table updated`);
    }
  }

  // ✅ CRITICAL: Fetch and return fresh user data
  const freshUserData = await this.usersRepository.getUserProfile(currentUser.id);
  
  if (!freshUserData) {
    throw new NotFoundException('User profile not found after update');
  }

  console.log('🎯 [Service] Fresh user data:', {
    id: freshUserData.id,
    isOnboarded: freshUserData.isOnboarded,
    role: freshUserData.role
  });

  this.logger.log(`Profile updated successfully for user ID: ${currentUser.id}`);

  // ✅ Return proper response
  return SuccessResponse.success(
    freshUserData,
    'Profile updated successfully'
  );
}

// ✅ Also update these methods:
private getProfileTableByRole(role: string) {
  console.log('🔍 [getProfileTableByRole] Role:', role);
  
  switch (role) {
    case 'student':
      return studentProfiles;
    case 'employee':
      return employeeProfiles;
    case 'psychologist':
      return psychologistProfiles;
    case 'organization':
      return organizations;
    case 'client':
      console.log('⚠️ Client role - no profile table');
      return null;
    default:
      console.log(`⚠️ Unknown role: ${role}`);
      this.logger.warn(`Unknown role: ${role}`);
      return null;
  }
}

private getMergedUserUpdateSchema(role: string) {
  switch (role) {
    case 'student':
      return baseUserUpdateSchema
        .merge(studentUpdateSchema)
        .merge(organizationUpdateSchema);
    case 'employee':
      return baseUserUpdateSchema
        .merge(employeeUpdateSchema)
        .merge(organizationUpdateSchema);
    case 'psychologist':
      return baseUserUpdateSchema
        .merge(psychologistUpdateSchema)
        .merge(organizationUpdateSchema);
    case 'organization':
      return baseUserUpdateSchema.merge(organizationUpdateSchema);
    case 'client':
      return baseUserUpdateSchema.merge(organizationUpdateSchema);
    default:
      this.logger.warn(`Unknown role: ${role}, using base schema`);
      return baseUserUpdateSchema;
  }
}

  validateUserUpdatePayload(
    role: string,
    updateData: Record<string, any>,
  ): Record<string, any> {
    const schema = this.getMergedUserUpdateSchema(role);
    const parsed = schema.safeParse(updateData);

    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    return cleanPayload(parsed.data);
  }

  async getUserByOrganizationId(
    organizationId: string,
  ): Promise<Omit<User, 'password' | 'lastPassword' | 'passwordChangedAt'>> {
    this.logger.log(`Fetching users for organization ID: ${organizationId}`);

    const users =
      await this.usersRepository.getUserByOrganizationId(organizationId);

    if (!users) {
      throw new NotFoundException(
        `No users found for organization ID: ${organizationId}`,
      );
    }

    this.logger.log(
      `Fetched ${users} users for organization ID: ${organizationId}`,
    );

    return users;
  }
}
