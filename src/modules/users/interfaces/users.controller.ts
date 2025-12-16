import {
  Controller,
  Get,
  UseGuards,
  Req,
  Patch,
  Body,
  Query,
  BadRequestException,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';

import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@modules/auth/guards/roles.guard';
import { IUserRequest } from '@modules/auth/strategies/jwt.strategy';

import {
  ApiStandardDocs,
  authorizationHeaderDocs,
} from '@/common/utils/swagger-decorator.util';
import { toBool } from '@/common/utils/helper.util';

import { UsersService } from '../application/users.service';
import {
  UserResponseDto,
  ChangePasswordDto,
  ChangePasswordResponseDto,
} from '../domain/dto/users-docs.dto';
import { ZodPipe } from '@/common/pipes/zod-validation.pipe';
import { usersQuery, UsersQueryDto } from '../domain/dto/user-response.dto';
import { uploadImageToGCS } from '@/common/utils/image.util'; // UPDATED IMPORT
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { multerConfigFactory } from '@/config/multer.config';
import { CloudStorageService } from '@/common/cloud-storage/cloud-storage.service'; // ADD THIS

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({
  version: '1',
  path: 'users',
})
@ApiBearerAuth()
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly cloudStorageService: CloudStorageService, // ADD THIS
  ) {}

  @Get()
  async getUsers(
    @Query(new ZodPipe(usersQuery)) query: UsersQueryDto,
  ) {
    return this.usersService.getUsers(query);
  }

  @Get('me')
  @ApiStandardDocs({
    summary: 'Get current user information',
    successResponseDto: UserResponseDto,
    extraResponses: [{ status: 401, description: 'Unauthorized' }],
    headers: [authorizationHeaderDocs()],
  })
  async getMe(@Req() req: IUserRequest) {
    const userId = req.user.id;

    return this.usersService.getMe(userId);
  }

  @Patch('change-password')
  @ApiStandardDocs({
    summary: 'Change user password',
    requestDto: ChangePasswordDto,
    successResponseDto: ChangePasswordResponseDto,
    extraResponses: [
      { status: 400, description: 'Invalid password' },
      { status: 401, description: 'Unauthorized' },
    ],
    headers: [authorizationHeaderDocs()],
  })
  async changePassword(
    @Req() req: IUserRequest,
    @Body('oldPassword') oldPassword: string,
    @Body('newPassword') newPassword: string,
  ) {
    if (req.user.role === 'super_admin') {
      throw new BadRequestException(
        'Super admin cannot change password through this endpoint',
      );
    }

    if (!req.user.id) {
      throw new BadRequestException('User ID is required');
    }

    if (!oldPassword || !newPassword) {
      throw new BadRequestException('Old and new passwords are required');
    }

    return this.usersService.changePassword(
      req.user.id,
      newPassword,
      oldPassword,
    );
  }

  @Patch('profile')
  @UseInterceptors(
    FileInterceptor('profilePicture', multerConfigFactory('user')),
  )
  async updateUserProfile(
    @UploadedFile() profilePicture: Express.Multer.File,
    @CurrentUser() user: IUserRequest['user'],
    @Body() updateData: any,
  ) {
    // ✅ LOG RAW BODY FIRST
    console.log('='.repeat(80));
    console.log('🔍 [Controller] typeof updateData:', typeof updateData);
    console.log('🔍 [Controller] updateData keys:', Object.keys(updateData || {}));
    console.log('🔍 [Controller] RAW updateData:', JSON.stringify(updateData, null, 2));
    console.log('🔍 [Controller] isOnboarded value:', updateData?.isOnboarded);
    console.log('='.repeat(80));

    updateData = updateData || {};

    let profilePictureFilePath: string | undefined = undefined;
    
    // If new file is uploaded, upload to GCS
    if (profilePicture) {
      profilePictureFilePath = await uploadImageToGCS(
        profilePicture,
        'user',
        this.cloudStorageService,
      );
    } 
    // If profilePicture string is provided (existing file path), keep it
    else if (
      typeof updateData.profilePicture === 'string' &&
      updateData.profilePicture
    ) {
      profilePictureFilePath = updateData.profilePicture;
    }

    // Extract known fields, rest go to details
    const {
      profilePicture: _,
      address,
      phone,
      isOnboarded,
      fullName,
      ...details
    } = updateData;

    const filterValid = (obj: any) =>
      Object.fromEntries(
        Object.entries(obj).filter(
          ([_, v]) => v !== undefined && v !== null && v !== '',
        ),
      );

    const flatData = {
      ...filterValid(details),
      ...filterValid({
        address,
        phone,
        profilePicture: profilePictureFilePath,
        isOnboarded: isOnboarded !== undefined ? toBool(isOnboarded) : undefined,
        fullName,
      }),
    };

    console.log('📤 [Controller] Sending to service:', JSON.stringify(flatData, null, 2));

    try {
      return await this.usersService.updateUserProfile(flatData, user);
    } catch (err) {
      console.error('❌ [Controller] Error:', err);
      throw new BadRequestException(err?.message || 'Failed to update profile');
    }
  }
}