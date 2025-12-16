import { ApiProperty } from '@nestjs/swagger';

export class OrganizationDto {
  @ApiProperty({
    description: 'The unique identifier of the organization',
    example: '0726fc5f-fef4-42be-bffe-7849d096c9ab',
  })
  id: string;

  @ApiProperty({
    description: 'The type of the organization',
    example: 'school',
  })
  type: string;

  @ApiProperty({
    description: 'The address of the organization',
    example: 'ABC ABC ABC ABC',
  })
  address: string;

  @ApiProperty({
    description: 'The phone number of the organization',
    example: '+6281315481787',
  })
  phone: string;

  @ApiProperty({
    description: 'The profile picture URL of the organization',
    example:
      'https://b1fbf745df68d22238d898899f1e0a87.serveo.net/uploads/organizations/profilePicture-1747798662761-901569544.jpeg',
  })
  profilePicture: string;
}

export class UserResponseDto {
  @ApiProperty({
    description: 'The unique identifier of the user',
    example: '9b3ac4fd-7790-40d1-9e8d-174a250b6799',
  })
  id: string;

  @ApiProperty({
    description: 'The email address of the user',
    example: 'school@ruangdiri.com',
  })
  email: string;

  @ApiProperty({
    description: 'The full name of the user',
    example: 'SMAN 123 3211',
  })
  fullName: string;

  @ApiProperty({
    description: 'User role',
    example: ['organization', 'student', 'employee', 'psychologist', 'client'],
  })
  role: string[];

  @ApiProperty({
    description: 'Organization details if user is an organization',
    type: OrganizationDto,
    required: false,
  })
  organization?: OrganizationDto;
}

export class ChangePasswordDto {
  @ApiProperty({
    description: 'The current password of the user',
    example: 'currentPassword123',
    required: true,
  })
  oldPassword: string;

  @ApiProperty({
    description: 'The new password to set',
    example: 'newSecurePassword456',
    required: true,
  })
  newPassword: string;
}

export class ChangePasswordResponseDto {
  @ApiProperty({
    description: 'Status of the password change operation',
    example: 'success',
  })
  status: string;

  @ApiProperty({
    description: 'Message about the password change operation',
    example: 'Password changed successfully',
  })
  message: string;
}
