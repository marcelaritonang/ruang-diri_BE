import * as bcrypt from 'bcryptjs';

import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import type { ParsedDeviceInfo } from '@/common/utils/devices.util';
import { SuccessResponse } from '@common/utils/response.util';
import {
  GENERAL_NOTIF_MSG,
  ALERT_NOTIF_MSG,
  ACCOUNT_NOTIF_MSG,
} from '@/common/constants/notif-msg.constant';

import { UsersService } from '@/modules/users/application/users.service';
import { MailerService } from '@modules/mailer/mailer.service';
import type {
  ILogin,
  IClientRegister,
} from '@/modules/users/domain/users.schema';
import { NotificationsService } from '@modules/notifications/application/notifications.service';
import { getCurrentDateAndTime } from '@/common/utils/date.util';
import { ClientProfilesRepository } from '@/modules/clients/clients-profile.repository';
import { TransactionService } from '@/common/services/transaction.service';
import { users } from '@/modules/users/domain/users.schema';
import { clientProfiles } from '@/modules/clients/clients-profile.schema';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private mailerService: MailerService,
    private notificationsService: NotificationsService,
    private clientProfilesRepository: ClientProfilesRepository,
    private transactionService: TransactionService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      return null;
    }

    if (!user.isActive) {
      throw new UnauthorizedException(
        'Your account is inactive. Please contact an administrator.',
      );
    }

    if (await bcrypt.compare(password, user.password)) {
      const { password, ...result } = user;
      return result;
    }

    return null;
  }

  async login(
    loginDto: ILogin,
    deviceInfo: ParsedDeviceInfo,
  ): Promise<SuccessResponse> {
    const user = await this.validateUser(loginDto.email, loginDto.password);

    if (!user) {
      throw new UnauthorizedException('Email atau password salah');
    }

    if (!user.isActive) {
      throw new UnauthorizedException(
        'Akun Anda tidak aktif. Silakan hubungi administrator.',
      );
    }

    if (user.deviceType !== deviceInfo.deviceType) {
      await this.usersService.updateUserDeviceInfo(user.id, deviceInfo);

      const { date, time } = getCurrentDateAndTime();

      await this.notificationsService.createNotification({
        recipientIds: [user.id],
        title: ALERT_NOTIF_MSG.DIFFERENT_DEVICE_LOGIN(
          deviceInfo.deviceType,
          deviceInfo.osName,
          date,
          time,
        ),
        message: GENERAL_NOTIF_MSG.LOGIN_DIFFERENT_DEVICES,
        type: 'system',
        subType: 'general',
      });
    }

    await this.usersService.update(user.id, {
      timezone: loginDto.timezone,
    });

    const tokenExpiry = loginDto.rememberMe ? '30d' : '24h';

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
      fullName: user.fullName,
    };

    return SuccessResponse.success(
      {
        accessToken: this.jwtService.sign(payload, { expiresIn: tokenExpiry }),
        organizationType: user?.organization?.type,
        fullname: user?.fullName,
      },
      'Login berhasil',
    );
  }

  async registerClient(
    registerDto: IClientRegister,
    deviceInfo: ParsedDeviceInfo,
  ): Promise<SuccessResponse> {
    const existingUser = await this.usersService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    // Use transaction to ensure data consistency
    const result = await this.transactionService.executeTransaction(
      async ({ tx }) => {
        // Create user
        const [newUser] = await tx
          .insert(users)
          .values({
            email: registerDto.email,
            password: hashedPassword,
            fullName: registerDto.fullName,
            role: 'client',
            timezone: registerDto.timezone,
            osName: deviceInfo.osName,
            deviceType: deviceInfo.deviceType,
            isActive: true,
            isOnboarded: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();

        // Create client profile with minimal data
        const [createdClientProfile] = await tx
          .insert(clientProfiles)
          .values({
            userId: newUser.id,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();

        return { user: newUser, clientProfile: createdClientProfile };
      },
    );

    // Send welcome notification after successful registration
    await this.notificationsService.createNotification({
      recipientIds: [result.user.id],
      title: 'Selamat datang di Ruang Diri!',
      message:
        'Akun Anda telah berhasil dibuat. Silakan lengkapi profil Anda untuk pengalaman yang lebih baik.',
      type: 'system',
      subType: 'general',
    });

    return SuccessResponse.success(
      {
        id: result.user.id,
        email: result.user.email,
        fullName: result.user.fullName,
        role: result.user.role,
      },
      'Registration successful',
    );
  }

  async forgotPassword(email: string): Promise<SuccessResponse> {
    const user = await this.usersService.findByEmail(email);

    // Security best practice: Don't reveal if the email exists or not
    // Just return success regardless to prevent email enumeration attacks
    if (!user) {
      return SuccessResponse.success(
        null,
        'If your email exists in our system, you will receive a password reset link.',
      );
    }

    if (user.isActive === false) {
      return SuccessResponse.success(
        null,
        'If your email exists in our system, you will receive a password reset link.',
      );
    }

    const resetToken = this.jwtService.sign(
      {
        sub: user.id,
        email: user.email,
        purpose: 'password-reset',
      },
      { expiresIn: '15m' },
    );

    try {
      await this.mailerService.sendPasswordResetEmail(
        email,
        resetToken,
        user?.fullName ?? '',
      );
    } catch (error) {
      if (error.body?.message?.includes('#MS42225')) {
        // This error indicates that the email address has reached the maximum sending limit (MAILERSEND error code)
        throw new BadRequestException(
          'Email ini telah mencapai batas maksimum pengiriman email.',
        );
      } else {
        throw new BadRequestException(
          'Gagal mengirim email reset password. Silakan coba lagi nanti.',
        );
      }
    }

    return SuccessResponse.success(
      null,
      'If your email exists in our system, you will receive a password reset link.',
    );
  }

  async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<SuccessResponse> {
    try {
      const payload = this.jwtService.verify(token);

      if (payload.purpose !== 'password-reset') {
        throw new BadRequestException('Invalid reset token');
      }

      const user = await this.usersService.findByEmail(payload.email);

      if (!user) {
        throw new BadRequestException('User not found');
      }

      if (!user.isActive) {
        throw new BadRequestException(
          'Your account is inactive. Password reset is not allowed.',
        );
      }

      if (
        user.passwordChangedAt &&
        user.passwordChangedAt.getTime() > payload.iat * 1000 &&
        // Check if passwordChangedAt is different from createdAt
        Math.abs(user.passwordChangedAt.getTime() - user.createdAt.getTime()) >
          1000
      ) {
        throw new BadRequestException(
          'Password was already changed after this token was issued',
        );
      }

      const isSamePassword = await bcrypt.compare(newPassword, user.password);
      if (isSamePassword) {
        throw new BadRequestException(
          'New password cannot be the same as the current password',
        );
      }

      await this.usersService.update(user.id, {
        password: newPassword,
        updatedAt: new Date(),
        passwordChangedAt: new Date(),
      });

      await this.notificationsService.createNotification({
        recipientIds: [user.id],
        title: ACCOUNT_NOTIF_MSG.RESET_PASSWORD,
        subType: 'general',
        type: 'system',
      });

      return SuccessResponse.success(
        null,
        'Password has been reset successfully',
      );
    } catch (error) {
      if (
        error.name === 'JsonWebTokenError' ||
        error.name === 'TokenExpiredError'
      ) {
        throw new BadRequestException('Invalid or expired reset token');
      }
      throw error;
    }
  }
}
