import { Injectable, Logger, NotFoundException } from '@nestjs/common';

import { SuccessResponse } from '@/common/utils/response.util';
import {
  toUtcDateTime,
  getDayNumberFromDate,
  toDateOnly,
  getTimezoneOffset,
} from '@/common/utils/date.util';
import { ErrorHandlerUtil } from '@/common/utils/error-handler.util';
import {
  ServiceErrorHandler,
  BaseService,
} from '@/common/decorators/service-error-handler.decorator';

import { SchedulesService } from '@/modules/schedules/application/schedules.service';
import { PsychologistsService } from '@/modules/psychologists/psychologist-profile.service';
import { AvailabilityService } from '@/modules/psychologists/services/availability.service';
import { NotificationsService } from '@/modules/notifications/application/notifications.service';
import { UsersService } from '@/modules/users/application/users.service';
import { ChatService } from '@/modules/chat/application/chat.service';
import { ChatAutomationQueue } from '@/queue/chat/chat-automation.queue';
import { TransactionService } from '@/common/services/transaction.service';
import { IUserRequest } from '@/modules/auth/strategies/jwt.strategy';

import type { CounselingsQueryDto } from '../domain/counselings/dto/counselings-response.dto';
import type { CounselingsBookingDto } from '../domain/counselings/dto/counseling-book.dto';

import { CounselingsRepository } from '../infrastructure/counselings.repository';
import { OrganizationsService } from '@/modules/organizations/application/organizations.service';
import { IStatusAppointment } from '../constants/counseling.constant';

@Injectable()
export class CounselingsService extends BaseService {
  protected readonly logger = new Logger(CounselingsService.name);

  constructor(
    private readonly counselingsRepository: CounselingsRepository,
    private readonly schedulesService: SchedulesService,
    private readonly notificationsService: NotificationsService,
    private readonly psychologistsService: PsychologistsService,
    private readonly availabilityService: AvailabilityService,
    private readonly usersService: UsersService,
    private readonly chatService: ChatService,
    private readonly chatAutomationQueue: ChatAutomationQueue,
    private readonly organizationsService: OrganizationsService,
    private readonly transactionService: TransactionService,
    errorHandler: ErrorHandlerUtil,
  ) {
    super(errorHandler);
  }

  @ServiceErrorHandler('Get counseling schedules')
  async getCounselingSchedules(
    query: CounselingsQueryDto,
    user: IUserRequest['user'],
  ): Promise<SuccessResponse> {
    this.logger.log(
      `Retrieving counseling schedules for organization: ${user.fullName}`,
    );

    const result = await this.counselingsRepository.getCounselingSchedules(
      query,
      user.organizationId!,
    );

    this.logger.log(
      `Successfully retrieved ${Array.isArray(result?.data) ? result.data.length : 'unknown'} counseling schedules`,
    );

    return SuccessResponse.success(
      result,
      'Counseling schedules retrieved successfully',
    );
  }

  @ServiceErrorHandler('Get counseling schedules by psychologist')
  async getCounselingSchedulesByPsychologist(
    query: CounselingsQueryDto,
    user: IUserRequest['user'],
  ): Promise<SuccessResponse> {
    this.logger.log(
      `Retrieving counseling schedules for psychologist: ${user?.fullName}`,
    );

    const result =
      await this.counselingsRepository.getCounselingSchedulesByPsychologist(
        query,
        user.id,
      );

    this.logger.log(
      `Successfully retrieved ${Array.isArray(result?.data) ? result.data.length : 'unknown'} counseling schedules for psychologist`,
    );

    return SuccessResponse.success(
      result,
      'Counseling schedules by psychologist retrieved successfully',
    );
  }

  @ServiceErrorHandler('Book counseling')
  async bookCounseling(
    bookingDto: CounselingsBookingDto,
    user: IUserRequest['user'],
  ): Promise<any> {
    this.logger.log(`Booking counseling for user: ${user.id}`);

    try {
      const tz =
        bookingDto.timezone ||
        (await this.getUserTimezone(user.id)) ||
        'Asia/Jakarta';

      const startLocal =
        bookingDto.startTime.length === 5
          ? `${bookingDto.startTime}:00`
          : bookingDto.startTime;
      const endLocal =
        bookingDto.endTime.length === 5
          ? `${bookingDto.endTime}:00`
          : bookingDto.endTime;

      const startDateTime = toUtcDateTime(bookingDto.date, startLocal, tz);
      const endDateTime = toUtcDateTime(bookingDto.date, endLocal, tz);

      this.logger.log(
        `Booking counseling from ${startDateTime.toISOString()} to ${endDateTime.toISOString()} for user: ${user.id}`,
      );

      const tzOffset = getTimezoneOffset(tz);
      const localNoonISO = `${bookingDto.date}T12:00:00${tzOffset}`;
      const dayOfWeek = new Date(localNoonISO).getUTCDay();

      this.logger.log(
        `Day of week: ${dayOfWeek}, Local times: ${startLocal}-${endLocal}, TZ=${tz}`,
      );
      this.logger.log(
        `UTC equivalent: ${startDateTime.toISOString()} to ${endDateTime.toISOString()}`,
      );

      if (user.organizationId) {
        try {
          bookingDto.psychologistId =
            await this.randomizeCounselingPsychologist(
              dayOfWeek,
              startLocal,
              endLocal,
              startDateTime,
            );
        } catch (error: any) {
          this.logger.error(
            `Failed to find available psychologist: ${error.message}`,
          );
          if (error instanceof NotFoundException)
            throw new NotFoundException(error.message);
          throw error;
        }
      } else if (!bookingDto.psychologistId) {
        throw new NotFoundException(
          'psychologistId is required for non organization bookings',
        );
      }

      if (!user.organizationId && bookingDto.psychologistId) {
        try {
          const isAvailable =
            await this.availabilityService.checkTimeSlotAvailability(
              bookingDto.psychologistId,
              bookingDto.date,
              startLocal,
              endLocal,
              tz,
            );

          if (!isAvailable) {
            throw new NotFoundException(
              `Psychologist is not available on ${bookingDto.date} at ${startLocal} - ${endLocal}. Please check their availability or choose a different time slot.`,
            );
          }

          this.logger.log(
            `Psychologist ${bookingDto.psychologistId} is available for ${bookingDto.date} ${startLocal}-${endLocal}`,
          );
        } catch (error: any) {
          this.logger.error(
            `Availability check failed for psychologist ${bookingDto.psychologistId}: ${error.message}`,
          );
          if (error instanceof NotFoundException) {
            throw error;
          }
          throw new NotFoundException(
            'Unable to verify psychologist availability for the requested time slot',
          );
        }
      }

      const txResult = await this.transactionService.executeTransaction(
        async () => {
          const booking = await this.counselingsRepository.bookCounseling(
            {
              ...bookingDto,
              date: startDateTime as unknown as string,
              endDate: endDateTime as unknown as string,
              timezone: tz,
            },
            user.id,
          );

          if (!booking?.id) {
            throw new NotFoundException(
              'Counseling booking failed, no booking ID returned',
            );
          }

          const scheduleRes = await this.schedulesService.createSchedules(
            {
              agenda: `Counseling Session ${user.fullName} with Psychologist`,
              notificationOffset: 60,
              type: 'counseling',
              dates: [
                {
                  date: bookingDto.date,
                  startTime: startLocal,
                  endTime: endLocal,
                  timezone: tz,
                },
              ],
              location: bookingDto.method,
              description: bookingDto.notes,
              participants: {
                psychologistId: bookingDto.psychologistId!,
                patientIds: [user.id],
              },
            },
            user,
          );

          if (!scheduleRes?.data?.length) {
            throw new NotFoundException('Schedule creation failed');
          }

          if (user.organizationId) {
            await this.organizationsService.deductCounselingQuota(
              user.organizationId,
              1,
            );
            this.logger.log(
              `Counseling quota deducted for organization: ${user.organizationId}`,
            );
          }

          return {
            booking,
            schedule: scheduleRes.data[0],
          };
        },
      );

      if (bookingDto.method === 'chat') {
        this.logger.log(
          `Creating chat session for counseling ${txResult.booking.id}`,
        );

        try {
          const chatSessionResult =
            await this.chatService.createCounselingChatSession(
              user.id,
              bookingDto.psychologistId!,
              txResult.booking.id,
              startDateTime,
            );

          const sessionId = (chatSessionResult as any).data.sessionId;
          const sessionEndTime = new Date(endDateTime);

          this.logger.log(
            `CHAT START: ${startDateTime.toISOString()}, END: ${sessionEndTime.toISOString()}, SESSION: ${sessionId}`,
          );

          await Promise.all([
            this.chatAutomationQueue.scheduleInitialMessage(
              sessionId,
              user.fullName,
              startDateTime,
              tz,
              { clientId: user.id, psychologistId: bookingDto.psychologistId! },
            ),
            this.chatAutomationQueue.scheduleEnableChat(
              sessionId,
              user.fullName,
              startDateTime,
              tz,
              { clientId: user.id, psychologistId: bookingDto.psychologistId! },
            ),
            this.chatAutomationQueue.scheduleAutoEndAt(
              sessionId,
              user.fullName,
              sessionEndTime,
              tz,
            ),
          ]);
        } catch (chatError: any) {
          this.logger.error(
            `Failed to create chat session for counseling ${txResult.booking.id}: ${chatError.message}`,
          );
        }
      }

      if (user.organizationId) {
        const orgUserId = await this.usersService.getUserByOrganizationId(
          user.organizationId,
        );
        await this.notificationsService.createNotification(
          {
            recipientIds: [bookingDto.psychologistId!, orgUserId.id, user.id],
            title: 'New Counseling Booking',
            message: `You successfully booked a counseling session.`,
            type: 'schedule',
            subType: 'counseling',
            additional: {
              orgTitle: 'New Counseling Booking',
              orgMessage: `A new counseling session has been booked by ${user.fullName}.`,
              psychologistTitle: 'New Counseling Booking',
              psychologistMessage: `You have a new counseling session booked with ${user.fullName}.`,
            },
          },
          user,
          { schedule: txResult.schedule },
        );
      }

      const psychologist =
        await this.psychologistsService.getPsychologistDetails(
          bookingDto.psychologistId!,
        );

      return SuccessResponse.success(
        {
          ...txResult.booking,
          psychologistName: psychologist.data.name,
          schedule: txResult.schedule,
          startAtUtc: startDateTime.toISOString(),
          endAtUtc: endDateTime.toISOString(),
          dateLocal: bookingDto.date,
          startTimeLocal: startLocal,
          endTimeLocal: endLocal,
          timezone: tz,
        },
        'Counseling booked successfully',
      );
    } catch (error: any) {
      this.logger.error(`Error booking counseling: ${error.message}`);
      this.logger.error('Full error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
        bookingDetails: {
          userId: user.id,
          date: bookingDto.date,
          startTime: bookingDto.startTime,
          endTime: bookingDto.endTime,
          method: bookingDto.method,
        },
      });

      if (error instanceof NotFoundException) {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }

  @ServiceErrorHandler('Update counseling status')
  async updateCounselingStatus(
    counselingId: string,
    status: IStatusAppointment,
  ): Promise<SuccessResponse> {
    this.logger.log(
      `Updating counseling status for ID: ${counselingId} to ${status}`,
    );

    await this.counselingsRepository.updateCounselingStatus(
      counselingId,
      status,
    );

    this.logger.log(`Counseling status updated successfully`);

    return SuccessResponse.success(
      null,
      'Counseling status updated successfully',
    );
  }

  @ServiceErrorHandler('Cancel counseling')
  async cancelCounseling(
    counselingId: string,
    reason: string | undefined,
    user: IUserRequest['user'],
  ): Promise<SuccessResponse> {
    this.logger.log(
      `Cancelling counseling ID: ${counselingId} by user: ${user.id}`,
    );
    const counseling =
      await this.counselingsRepository.getCounselingById(counselingId);

    if (!counseling) {
      throw new NotFoundException('Counseling not found');
    }

    if (
      counseling.userId !== user.id &&
      counseling.psychologistId !== user.id
    ) {
      throw new NotFoundException(
        'You are not authorized to cancel this counseling',
      );
    }

    if (counseling.status === 'cancelled') {
      throw new NotFoundException('Counseling is already cancelled');
    }

    if (counseling.status === 'completed') {
      throw new NotFoundException('Cannot cancel a completed counseling');
    }

    await this.counselingsRepository.cancelCounseling(counselingId, reason);

    try {
      const psychologist = await this.usersService.findById(
        counseling.psychologistId,
      );
      const client = await this.usersService.findById(counseling.userId);

      if (psychologist && client) {
        await this.notificationsService.createNotification(
          {
            recipientIds: [counseling.psychologistId, counseling.userId],
            title: 'Counseling Cancelled',
            message: `Your counseling session scheduled for ${counseling.date.toDateString()} has been cancelled${reason ? ': ' + reason : '.'}`,
            type: 'schedule',
            subType: 'counseling',
          },
          user,
        );
      }
    } catch (notificationError) {
      this.logger.warn(
        `Failed to send notification for cancelled counseling ${counselingId}: ${notificationError.message}`,
      );
    }

    this.logger.log(`Counseling ${counselingId} cancelled successfully`);

    return SuccessResponse.success(null, 'Counseling cancelled successfully');
  }

  @ServiceErrorHandler('Reschedule counseling')
  async rescheduleCounseling(
    counselingId: string,
    rescheduleData: {
      date: string;
      startTime: string;
      endTime: string;
      timezone?: string;
      notes?: string;
    },
    user: IUserRequest['user'],
  ): Promise<SuccessResponse> {
    this.logger.log(
      `Rescheduling counseling ID: ${counselingId} by user: ${user.id}`,
    );
    const counseling =
      await this.counselingsRepository.getCounselingById(counselingId);

    if (!counseling) {
      throw new NotFoundException('Counseling not found');
    }

    if (
      counseling.userId !== user.id &&
      counseling.psychologistId !== user.id
    ) {
      throw new NotFoundException(
        'You are not authorized to reschedule this counseling',
      );
    }

    if (counseling.status === 'cancelled') {
      throw new NotFoundException('Cannot reschedule a cancelled counseling');
    }

    if (counseling.status === 'completed') {
      throw new NotFoundException('Cannot reschedule a completed counseling');
    }

    let effectiveTimezone = rescheduleData.timezone;
    if (!effectiveTimezone) {
      effectiveTimezone = await this.getUserTimezone(user.id);
    }

    const newStartDateTime = toUtcDateTime(
      rescheduleData.date,
      rescheduleData.startTime,
      effectiveTimezone!,
    );

    const newEndDateTime = toUtcDateTime(
      rescheduleData.date,
      rescheduleData.endTime,
      effectiveTimezone!,
    );

    try {
      const isAvailable =
        await this.availabilityService.checkAvailabilityOnDate(
          counseling.psychologistId,
          rescheduleData.date,
          effectiveTimezone!,
        );

      if (!isAvailable) {
        throw new NotFoundException(
          'Psychologist is not available at the requested date',
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to check psychologist availability: ${error.message}`,
      );
      throw new NotFoundException(
        'Unable to verify psychologist availability for the new time slot',
      );
    }

    await this.counselingsRepository.rescheduleCounseling(
      counselingId,
      newStartDateTime,
      newEndDateTime,
      rescheduleData.notes,
    );

    try {
      const psychologist = await this.usersService.findById(
        counseling.psychologistId,
      );
      const client = await this.usersService.findById(counseling.userId);

      if (psychologist && client) {
        await this.notificationsService.createNotification(
          {
            recipientIds: [counseling.psychologistId, counseling.userId],
            title: 'Counseling Rescheduled',
            message: `Your counseling session has been rescheduled to ${newStartDateTime.toDateString()} at ${rescheduleData.startTime}`,
            type: 'schedule',
            subType: 'counseling',
          },
          user,
        );
      }
    } catch (notificationError) {
      this.logger.warn(
        `Failed to send notification for rescheduled counseling ${counselingId}: ${notificationError.message}`,
      );
    }

    this.logger.log(`Counseling ${counselingId} rescheduled successfully`);

    return SuccessResponse.success(null, 'Counseling rescheduled successfully');
  }

  private async randomizeCounselingPsychologist(
    day: number,
    startTime: string,
    endTime: string,
    targetDate: Date,
  ): Promise<string> {
    this.logger.log(
      `Searching for psychologists with: day=${day}, startTime=${startTime}, endTime=${endTime}, targetDate=${targetDate.toISOString()}`,
    );

    const dateString = toDateOnly(targetDate.toISOString());

    const psychologists: any = await this.psychologistsService.getPsychologists(
      {
        limit: 100,
        page: 1,
        date: dateString,
        dayOfWeek: day,
        startTime,
        endTime,
        sort: 'availability',
      },
    );

    const responseData = psychologists.data || [];
    const responseMetadata = psychologists.metadata || {};

    this.logger.log(
      `🔍 CounselingsService: Found ${responseData.length} psychologists, metadata total: ${responseMetadata?.total || 0}`,
    );

    this.logger.log(
      `Psychologist search result, Total: ${responseMetadata?.total || 0}, Available: ${responseData?.length || 0}`,
    );

    const rows = responseData || [];
    if (rows.length === 0) {
      const msg = `No psychologists are available for Day ${day}, ${startTime} to ${endTime}. Date ${dateString}.`;
      this.logger.error(msg);
      throw new NotFoundException(msg);
    }

    const candidates = rows.filter((p: any) => p.hasAvailability && p.isActive);
    if (candidates.length === 0) {
      const msg = `All candidates are busy on ${dateString}, ${startTime} to ${endTime}.`;
      this.logger.error(msg);
      throw new NotFoundException(msg);
    }

    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    this.logger.log(
      `Selected psychologist ${pick.fullName} ${pick.id} for ${dateString} ${startTime} to ${endTime}`,
    );
    return pick.id;
  }

  private async getUserTimezone(userId: string): Promise<string> {
    try {
      const user = await this.usersService.findById(userId);
      return user?.timezone || 'Asia/Jakarta';
    } catch (error) {
      this.logger.warn(
        `Could not fetch user timezone for user ${userId}, using default timezone Asia/Jakarta`,
      );
      return 'Asia/Jakarta';
    }
  }
}
