import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

import { type Success, SuccessResponse } from '@/common/utils/response.util';
import { SCHEDULE_NOTIF_MSG } from '@/common/constants/notif-msg.constant';
import { getCurrentDateAndTime, toUtcDateTime } from '@/common/utils/date.util';
import { TransactionService } from '@/common/services/transaction.service';

import { IUserRequest } from '@/modules/auth/strategies/jwt.strategy';
import { NotificationsService } from '@/modules/notifications/application/notifications.service';

import { ZoomMeetingQueue } from '@/queue/zoom/zoom.queue';

import {
  SchedulesRepository,
  type ICreateSchedules,
} from '../infrastructure/schedules.repository';

import { CreateScheduleDto } from '../domain/dto/create-schedule.dto';
import {
  ScheduleParamDto,
  ScheduleQueryDto,
} from '../domain/dto/schedule-response.dto';
import { UpdateScheduleDto } from '../domain/dto/update-schedule.dto';
import type { Schedules } from '../domain/schedules.schema';

@Injectable()
export class SchedulesService {
  private readonly logger = new Logger(SchedulesService.name);

  constructor(
    private readonly schedulesRepository: SchedulesRepository,
    private readonly notificationsService: NotificationsService,
    private readonly zoomMeetingQueue: ZoomMeetingQueue,
    private readonly transactionService: TransactionService,
  ) {}

  async createSchedules(
    dto: CreateScheduleDto,
    user: IUserRequest['user'],
  ): Promise<Success<ICreateSchedules[]>> {
    this.logger.log(`Creating schedules with agenda: ${dto.agenda}`);

    try {
      const result = await this.transactionService.executeTransaction(
        async (context) => {
          if (dto.participants?.psychologistId) {
            for (const item of dto.dates) {
              const userRecord = await this.schedulesRepository.getUserTimezone(
                user.id,
              );
              const timezoneToUse = item.timezone || userRecord || 'UTC';

              const start = toUtcDateTime(
                item.date,
                item.startTime,
                timezoneToUse,
              );
              const end = toUtcDateTime(item.date, item.endTime, timezoneToUse);

              await this.schedulesRepository.checkPsychologistAvailability(
                dto.participants.psychologistId,
                start,
                end,
                context,
              );
            }
          }

          const created = await this.schedulesRepository.createSchedule(
            dto,
            user,
            context,
          );

          return created;
        },
      );

      if (result && result.length > 0) {
        await this.notificationsService.createNotification({
          recipientIds: [user.id],
          title: `Kamu telah membuat jadwal baru untuk ${dto.dates[0].date} pukul ${dto.dates[0].startTime}`,
          message: `Schedule with ID ${result[0].id} has been created.`,
          type: 'schedule',
          subType: dto.type === 'counseling' ? 'counseling' : 'general',
        });

        for (const schedule of result) {
          this.logger.log(`Schedule created with ID: ${schedule.id}`);

          if (dto.notificationOffset && schedule.type === 'counseling') {
            this.logger.log(
              `Scheduling notification for schedule ID: ${schedule.id}`,
            );

            // TODO: will send a whatsapp message 15 minutes before the schedule starts
          }
        }
      }

      if (
        dto.location === 'online' &&
        dto.type === 'counseling' &&
        result.every((schedule) => schedule.isNew) &&
        result.length > 0
      ) {
        for (const { id: scheduleId, startDateTime } of result) {
          await this.zoomMeetingQueue.counselingLinkGeneration(
            scheduleId,
            startDateTime,
          );
        }
      }

      return SuccessResponse.create<ICreateSchedules[]>(
        result,
        'Schedules created successfully',
      );
    } catch (error) {
      this.logger.error('Error creating schedules', error);

      if (error instanceof BadRequestException && error.message) {
        throw new BadRequestException(error.message);
      } else {
        throw new BadRequestException(
          'An unexpected error occurred while creating schedules',
        );
      }
    }
  }

  async getSchedulesWithinRange(
    dates: ScheduleQueryDto,
    user: IUserRequest['user'],
  ) {
    this.logger.log(
      `Schedules within the date of: ${dates.from} to ${dates.to} for user ${user.id}`,
    );

    try {
      const schedulesResult =
        await this.schedulesRepository.getSchedulesWithinRange(dates, user);

      return SuccessResponse.create(
        schedulesResult,
        'Schedules fetched successfully',
      );
    } catch (error) {
      this.logger.error('Error fetching schedules', error);

      if (error instanceof NotFoundException) {
        throw new NotFoundException('No schedules found for the given date');
      } else {
        throw new BadRequestException(
          'An unexpected error occurred while fetching schedules',
        );
      }
    }
  }

  async deleteSchedule(
    id: string,
    user: IUserRequest['user'],
  ): Promise<SuccessResponse> {
    this.logger.log(`Deleting schedule with ID: ${id}`);

    try {
      const { type } = await this.schedulesRepository.getScheduleById(id);

      let participants: any[] = [];
      if (type === 'counseling') {
        participants =
          await this.schedulesRepository.getParticipantsByScheduleId(id);
      }

      await this.schedulesRepository.deleteSchedule(id);

      let recipientIds: string[];
      let psychologistsName: string | undefined;

      if (type === 'counseling' && participants.length > 0) {
        const psychologist = participants.find(
          (p) => p.role === 'psychologist',
        );

        if (psychologist?.fullName) {
          psychologistsName = psychologist.fullName;
        }

        recipientIds = participants.map((p) => p.id);
      } else {
        recipientIds = [user.id];
      }

      const { date, time } = getCurrentDateAndTime();

      try {
        await this.notificationsService.createNotification({
          recipientIds,
          title: SCHEDULE_NOTIF_MSG.CANCELED(
            user.role,
            psychologistsName ? psychologistsName : undefined,
            date,
            time,
          ),
          message: `Schedule with ID ${id} has been deleted.`,
          type: 'schedule',
          subType: 'general',
        });
      } catch (error) {
        this.logger.warn(
          `Failed to send deletion notification for schedule ${id}: ${error.message}`,
        );
      }

      return SuccessResponse.create(null, 'Schedule deleted successfully');
    } catch (error) {
      this.logger.error(`Error deleting schedule ID ${id}`, error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        'An unexpected error occurred while deleting the schedule',
      );
    }
  }

  async updateSchedule(
    id: string,
    dto: UpdateScheduleDto,
    user: IUserRequest['user'],
  ): Promise<SuccessResponse> {
    this.logger.log(`Updating schedule with ID: ${id}`);

    try {
      const updatedSchedules = await this.transactionService.executeTransaction(
        async (context) => {
          return await this.schedulesRepository.updateSchedule(
            id,
            dto,
            user,
            context,
          );
        },
      );
      this.logger.log(`Schedule with ID ${id} updated successfully`);

      for (const updated of updatedSchedules) {
        if (
          updated.location === 'online' &&
          updated.type === 'counseling' &&
          updated
        ) {
          await this.zoomMeetingQueue.counselingLinkGeneration(
            updated.id,
            updated.startDateTime,
          );
        }

        if (dto.notificationOffset) {
          this.logger.log(
            `Rescheduling notification for schedule ID: ${updated.id}`,
          );
          // TODO: will send a whatsapp message / native notification.
        }
      }

      return SuccessResponse.create<Schedules[]>(
        updatedSchedules,
        updatedSchedules.length === 1
          ? 'Schedule updated successfully'
          : `Schedule updated and ${updatedSchedules.length - 1} additional schedule(s) created successfully`,
      );
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to update schedule, Reason: ${error.message}`,
      );
    }
  }

  async getScheduleById(
    id: ScheduleParamDto['id'],
    user: IUserRequest['user'],
    userTimezone?: string,
  ) {
    this.logger.log(`Fetching schedule with ID: ${id}`);

    try {
      const schedule = await this.schedulesRepository.getScheduleById(
        id,
        user,
        userTimezone,
      );

      if (!schedule) {
        throw new NotFoundException(`Schedule with ID ${id} not found`);
      }

      return SuccessResponse.create(schedule, 'Schedule fetched successfully');
    } catch (error) {
      this.logger.error('Error fetching schedule by ID', error);

      if (error instanceof NotFoundException) {
        throw error;
      } else {
        throw new BadRequestException(
          'An unexpected error occurred while fetching the schedule',
        );
      }
    }
  }

  async insertAttachments(attachments: any[]): Promise<SuccessResponse> {
    this.logger.log(`Inserting ${attachments.length} attachments`);

    try {
      const results =
        await this.schedulesRepository.insertAttachments(attachments);

      return SuccessResponse.create(
        results,
        'Attachments inserted successfully',
      );
    } catch (error) {
      this.logger.error('Error inserting attachments', error);
      throw new BadRequestException(
        'An unexpected error occurred while inserting attachments',
      );
    }
  }

  async getParticipantsByScheduleId(
    scheduleId: ScheduleParamDto['id'],
  ): Promise<SuccessResponse> {
    this.logger.log(`Fetching participants for schedule ID: ${scheduleId}`);

    try {
      const participants =
        await this.schedulesRepository.getParticipantsByScheduleId(scheduleId);

      if (!participants) {
        throw new NotFoundException(
          `No participants found for schedule ID ${scheduleId}`,
        );
      }

      return SuccessResponse.create(
        participants,
        'Participants fetched successfully',
      );
    } catch (error) {
      this.logger.error('Error fetching participants by schedule ID', error);

      if (error instanceof NotFoundException) {
        throw error;
      } else {
        throw new BadRequestException(
          'An unexpected error occurred while fetching participants',
        );
      }
    }
  }

  async deleteAttachment(
    scheduleId: string,
    attachmentId: string,
    user: IUserRequest['user'],
  ): Promise<SuccessResponse> {
    this.logger.log(
      `Deleting attachment ${attachmentId} from schedule ${scheduleId}`,
    );

    try {
      await this.schedulesRepository.getScheduleById(scheduleId, user);
      await this.schedulesRepository.deleteAttachment(attachmentId, scheduleId);

      return SuccessResponse.create(null, 'Attachment deleted successfully');
    } catch (error) {
      this.logger.error('Error deleting attachment', error);

      if (error instanceof NotFoundException) throw error;

      throw new BadRequestException(
        'An unexpected error occurred while deleting the attachment',
      );
    }
  }
}
