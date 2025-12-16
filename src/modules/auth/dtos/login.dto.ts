import { ApiProperty } from '@nestjs/swagger';

export class LoginRequestDto {
  @ApiProperty({ example: 'user@example.com' })
  email: string;

  @ApiProperty({ example: 'securePassword123' })
  password: string;

  @ApiProperty({ example: true, required: false })
  rememberMe?: boolean;
}

export class LoginResponseDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR...' })
  accessToken: string;

  @ApiProperty({ example: 'Login successful' })
  message: string;
}

export class ForgotPasswordResponseDto {
  @ApiProperty({ example: 'Password reset email sent' })
  message: string;
}

export class ForgotPasswordRequestDto {
  @ApiProperty({ example: 'user@example.com' })
  email: string;
}

export class ResetPasswordRequestDto {
  @ApiProperty({ example: 'user@example.com' })
  token: string;

  @ApiProperty({ example: 'newSecurePassword123' })
  newPassword: string;
}

export class ResetPasswordResponseDto {
  @ApiProperty({ example: 'Password reset successfully' })
  message: string;
}

export class ClientRegisterRequestDto {
  @ApiProperty({ example: 'user@example.com' })
  email: string;

  @ApiProperty({ example: 'securePassword123' })
  password: string;

  @ApiProperty({ example: 'John Doe' })
  fullName: string;

  @ApiProperty({ example: 'Asia/Jakarta' })
  timezone: string;
}

export class ClientRegisterResponseDto {
  @ApiProperty({ example: 'Registration successful' })
  message: string;

  @ApiProperty({
    example: {
      id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'user@example.com',
      fullName: 'John Doe',
      role: 'client',
    },
  })
  data: {
    id: string;
    email: string;
    fullName: string;
    role: string;
  };
}
