import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';

import { ZodPipe } from '@/common/pipes/zod-validation.pipe';
import { CurrentUser } from '@/common/decorators/current-user.decorator';

import { IUserRequest } from '@/modules/auth/strategies/jwt.strategy';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';

import { Roles } from '@/modules/auth/decorators/roles.decorator';

import { CounselingsService } from '../application/counselings.service';
import {
  counselingsQuery,
  CounselingsQueryDto,
} from '../domain/counselings/dto/counselings-response.dto';

import {
  counselingBookingDto,
  type CounselingsBookingDto,
} from '../domain/counselings/dto/counseling-book.dto';

import {
  cancelCounselingDto,
  type CancelCounselingDto,
} from '../domain/counselings/dto/cancel-counseling.dto';

import {
  rescheduleCounselingDto,
  type RescheduleCounselingDto,
} from '../domain/counselings/dto/reschedule-counseling.dto';

@UseGuards(JwtAuthGuard)
@Roles('student', 'employee', 'client')
@Controller({
  path: 'counselings',
  version: '1',
})
export class CounselingsController {
  constructor(private readonly counselingsService: CounselingsService) {}

  @Post('book')
  async bookCounseling(
    @Body(new ZodPipe(counselingBookingDto)) bookingDto: CounselingsBookingDto,
    @CurrentUser() user: IUserRequest['user'],
  ) {
    return this.counselingsService.bookCounseling(bookingDto, user);
  }

  @Get('schedules/organization')
  async getAllCounselingSchedules(
    @Query(new ZodPipe(counselingsQuery)) query: CounselingsQueryDto,
    @CurrentUser() user: IUserRequest['user'],
  ) {
    return this.counselingsService.getCounselingSchedules(query, user);
  }

  @Get('schedules/psychologist')
  async getCounselingSchedulesByPsychologist(
    @Query(new ZodPipe(counselingsQuery)) query: CounselingsQueryDto,
    @CurrentUser() user: IUserRequest['user'],
  ) {
    return this.counselingsService.getCounselingSchedulesByPsychologist(
      query,
      user,
    );
  }

  @Post(':id/cancel')
  @Roles('super_admin')
  async cancelCounseling(
    @Param('id') counselingId: string,
    @Body(new ZodPipe(cancelCounselingDto)) cancelDto: CancelCounselingDto,
    @CurrentUser() user: IUserRequest['user'],
  ) {
    return this.counselingsService.cancelCounseling(
      counselingId,
      cancelDto.reason,
      user,
    );
  }

  @Put(':id/reschedule')
  async rescheduleCounseling(
    @Param('id') counselingId: string,
    @Body(new ZodPipe(rescheduleCounselingDto))
    rescheduleDto: RescheduleCounselingDto,
    @CurrentUser() user: IUserRequest['user'],
  ) {
    return this.counselingsService.rescheduleCounseling(
      counselingId,
      rescheduleDto,
      user,
    );
  }
}
