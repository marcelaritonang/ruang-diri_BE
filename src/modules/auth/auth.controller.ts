  import { Controller, Post, Body, HttpCode, Headers } from '@nestjs/common';
  import { ApiBearerAuth } from '@nestjs/swagger';

  import {
    Login,
    ILogin,
    ClientRegister,
    IClientRegister,
  } from '@/modules/users/domain/users.schema';

  import { ApiStandardDocs } from '@/common/utils/swagger-decorator.util';
  import { parseUserAgent } from '@/common/utils/devices.util';

  import { AuthService } from './auth.service';

  import {
    LoginRequestDto,
    LoginResponseDto,
    ForgotPasswordResponseDto,
    ForgotPasswordRequestDto,
    ResetPasswordRequestDto,
    ResetPasswordResponseDto,
    ClientRegisterRequestDto,
    ClientRegisterResponseDto,
  } from './dtos/login.dto';
  import { ZodPipe } from '@/common/pipes/zod-validation.pipe';

  @ApiBearerAuth()
  @Controller({
    version: '1',
    path: 'auth',
  })
  export class AuthController {
    constructor(private authService: AuthService) {}

    @Post('login')
    @HttpCode(200)
    @ApiStandardDocs({
      summary: 'User login',
      requestDto: LoginRequestDto,
      successResponseDto: LoginResponseDto,
      extraResponses: [{ status: 401, description: 'Invalid credentials' }],
    })
    async login(
      @Body(new ZodPipe(Login)) body: ILogin,
      @Headers() headers: Record<string, any>,
    ) {
      const userAgent = headers['user-agent'] || '';
      const deviceInfo = parseUserAgent(userAgent);

      return this.authService.login(body, deviceInfo);
    }

    @Post('register')
    @ApiStandardDocs({
      summary: 'Client registration',
      requestDto: ClientRegisterRequestDto,
      successResponseDto: ClientRegisterResponseDto,
      extraResponses: [
        { status: 400, description: 'User already exists or validation error' },
      ],
    })
    async register(
      @Body(new ZodPipe(ClientRegister)) body: IClientRegister,
      @Headers() headers: Record<string, any>,
    ) {
      const userAgent = headers['user-agent'] || '';
      const deviceInfo = parseUserAgent(userAgent);

      return this.authService.registerClient(body, deviceInfo);
    }

    @Post('forgot-password')
    @ApiStandardDocs({
      summary: 'Request password reset',
      requestDto: ForgotPasswordRequestDto,
      successResponseDto: ForgotPasswordResponseDto,
      extraResponses: [{ status: 404, description: 'User not found' }],
    })
    async forgotPassword(@Body('email') email: string) {
      return this.authService.forgotPassword(email);
    }

    @Post('reset-password')
    @ApiStandardDocs({
      summary: 'Reset password',
      requestDto: ResetPasswordRequestDto,
      successResponseDto: ResetPasswordResponseDto,
      extraResponses: [
        { status: 400, description: 'Invalid token or password' },
        { status: 404, description: 'User not found' },
      ],
    })
    async resetPassword(
      @Body('token') token: string,
      @Body('newPassword') newPassword: string,
    ) {
      return this.authService.resetPassword(token, newPassword);
    }
  }
