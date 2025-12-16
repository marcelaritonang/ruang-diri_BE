import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { ZodPipe } from '@/common/pipes/zod-validation.pipe';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';

import type { IUserRequest } from '@/modules/auth/strategies/jwt.strategy';

import { ScreeningsService } from '../application/screenings.service';
import {
  createScreeningDto,
  getScreeningsQuery,
  type CreateScreeningDto,
  type GetScreeningsQuery,
} from '../domain/screenings/dto/screening.dto';

import {
  DASS21_QUESTIONS,
  RESPONSE_OPTIONS,
  SEVERITY_LEVELS,
} from '../constants/dass21.constant';

@UseGuards(JwtAuthGuard, RolesGuard)
@ApiTags('Mental Health Screenings')
@ApiBearerAuth()
@Controller({
  version: '1',
  path: 'screenings',
})
export class ScreeningsController {
  constructor(private readonly screeningsService: ScreeningsService) {}

  @Get('questions')
  @Roles(
    'student',
    'employee',
    'client',
    'organization',
    'psychologist',
    'super_admin',
  )
  async getDass21Questions() {
    return {
      questions: DASS21_QUESTIONS,
      responseOptions: RESPONSE_OPTIONS,
      severityLevels: SEVERITY_LEVELS,
    };
  }

  @Post()
  @Roles('student', 'employee', 'client')
  async createScreening(
    @Body(new ZodPipe(createScreeningDto)) dto: CreateScreeningDto,
    @CurrentUser() user: IUserRequest['user'],
  ) {
    return this.screeningsService.createScreening(dto, user);
  }

  @Get('me')
  @Roles('student', 'employee', 'client')
  async getMyScreenings(
    @Query(new ZodPipe(getScreeningsQuery)) query: GetScreeningsQuery,
    @CurrentUser() user: IUserRequest['user'],
  ) {
    return this.screeningsService.getUserScreenings(user.id, query);
  }

  @Get('organization/all')
  @Roles('organization', 'super_admin')
  async getOrganizationScreenings(
    @Query(new ZodPipe(getScreeningsQuery)) query: GetScreeningsQuery,
    @CurrentUser() user: IUserRequest['user'],
  ) {
    if (!user.organizationId) {
      throw new Error('Organization ID is required');
    }
    return this.screeningsService.getOrganizationScreenings(
      user.organizationId,
      query,
    );
  }

  @Get('organization/analytics')
  @Roles('organization', 'super_admin')
  async getScreeningAnalytics(
    @CurrentUser() user: IUserRequest['user'],
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    if (!user.organizationId) {
      throw new Error('Organization ID is required');
    }

    const timeframe =
      from && to
        ? {
            from: new Date(from),
            to: new Date(to),
          }
        : undefined;

    return this.screeningsService.getScreeningAnalytics(
      user.organizationId,
      timeframe,
    );
  }

  @Get('user/:userId')
  @Roles('psychologist', 'organization', 'super_admin')
  async getUserScreenings(
    @Param('userId') userId: string,
    @Query(new ZodPipe(getScreeningsQuery)) query: GetScreeningsQuery,
  ) {
    return this.screeningsService.getUserScreenings(userId, query);
  }

  @Get(':id')
  @Roles(
    'student',
    'employee',
    'client',
    'organization',
    'psychologist',
    'super_admin',
  )
  async getScreeningById(@Param('id') id: string) {
    return this.screeningsService.getScreeningById(id);
  }
}
