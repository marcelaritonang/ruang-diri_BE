import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
  Patch,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
  ParseArrayPipe,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';

import { ZodPipe } from '@/common/pipes/zod-validation.pipe';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import {
  allowedDocumentTypes,
  allowedImageTypes,
  uploadSizes,
} from '@/common/constants/attachments.constant';

import { multerConfigFactory } from '@/config/multer.config';

import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { IUserRequest } from '@/modules/auth/strategies/jwt.strategy';
import { Roles } from '@/modules/auth/decorators/roles.decorator';

import {
  scheduleParam,
  ScheduleQueryDto,
  getSchedulesQuery,
  type ScheduleParamDto,
} from '../domain/dto/schedule-response.dto';
import {
  createScheduleDto,
  type CreateScheduleDto,
} from '../domain/dto/create-schedule.dto';
import {
  UpdateScheduleDto,
  updateScheduleDto,
} from '../domain/dto/update-schedule.dto';
import {
  deleteAttachmentDto,
  type DeleteAttachmentDto,
} from '../domain/dto/delete-attachment.dto';
import { SchedulesService } from '../application/schedules.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('organization', 'super_admin', 'psychologist')
@Controller({
  path: 'schedules',
  version: '1',
})
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  @Get()
  async getSchedulesWithinRange(
    @Query(new ZodPipe(getSchedulesQuery)) query: ScheduleQueryDto,
    @CurrentUser() user: IUserRequest['user'],
  ) {
    return this.schedulesService.getSchedulesWithinRange(query, user);
  }

  @Post()
  async createSchedule(
    @Body(new ZodPipe(createScheduleDto)) body: CreateScheduleDto,
    @CurrentUser() user: IUserRequest['user'],
  ) {
    return this.schedulesService.createSchedules(body, user);
  }

  @Post('attachments')
  @UseInterceptors(
    FilesInterceptor(
      'files',
      10,
      multerConfigFactory(
        'schedule-attachments',
        [...allowedImageTypes, ...allowedDocumentTypes],
        uploadSizes['15MB'],
        10,
      ),
    ),
  )
  async uploadAttachments(
    @UploadedFiles() files: Express.Multer.File[],
    @Body('scheduleIds', new ParseArrayPipe({ items: String, separator: ',' }))
    scheduleIds: string[],
  ) {
    if (!scheduleIds || scheduleIds.length === 0) {
      throw new BadRequestException('At least one schedule ID is required');
    }

    const attachmentRecords = files.flatMap((file) =>
      scheduleIds.map((scheduleId) => ({
        scheduleId,
        fileUrl: `/uploads/schedule-attachments/${file.filename}`,
        fileType: file.mimetype,
        originalName: file.originalname,
      })),
    );

    return await this.schedulesService.insertAttachments(attachmentRecords);
  }

  @Delete(':id')
  async deleteSchedule(
    @Param(new ZodPipe(scheduleParam)) params: ScheduleParamDto,
    @CurrentUser() user: IUserRequest['user'],
  ) {
    return this.schedulesService.deleteSchedule(params.id, user);
  }

  @Patch(':id')
  async updateSchedule(
    @Param(new ZodPipe(scheduleParam)) params: ScheduleParamDto,
    @Body(new ZodPipe(updateScheduleDto)) body: UpdateScheduleDto,
    @CurrentUser() user: IUserRequest['user'],
  ) {
    return this.schedulesService.updateSchedule(params.id, body, user);
  }

  @Get(':id')
  async getScheduleById(
    @Param(new ZodPipe(scheduleParam)) params: ScheduleParamDto,
    @CurrentUser() user: IUserRequest['user'],
    @Query('timezone') timezone?: string,
  ) {
    return this.schedulesService.getScheduleById(params.id, user, timezone);
  }

  @Delete(':id/attachments')
  async deleteAttachment(
    @Param(new ZodPipe(scheduleParam)) params: ScheduleParamDto,
    @Body(new ZodPipe(deleteAttachmentDto)) body: DeleteAttachmentDto,
    @CurrentUser() user: IUserRequest['user'],
  ) {
    return this.schedulesService.deleteAttachment(
      params.id,
      body.attachmentId,
      user,
    );
  }
}
