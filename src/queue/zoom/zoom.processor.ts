import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';

import { SchedulesRepository } from '@modules/schedules/infrastructure/schedules.repository';

import { ZoomApiService } from '@/common/libs/zoom/zoom-api.lib';
import {
  formatDateTimeWithOffset,
  formatUtcInUserTimezone,
} from '@/common/utils/date.util';

import { QUEUE_JOB } from '../queue.config';
import { NotificationsService } from '@/modules/notifications/application/notifications.service';

@Processor(QUEUE_JOB.ZOOM_MEETING, {
  concurrency: 3,
})
export class ZoomMeetingProcessor extends WorkerHost {
  private readonly logger = new Logger(ZoomMeetingProcessor.name);

  constructor(
    private readonly schedulesRepo: SchedulesRepository,
    private readonly zoomClient: ZoomApiService,
    private readonly notificationsService: NotificationsService,
  ) {
    super();
  }

  async process(job: Job<{ scheduleId: string }>): Promise<void> {
    const { scheduleId } = job.data;
    this.logger.log(`Processing Zoom link job for ${scheduleId}`);

    const [sched, participants] = await Promise.all([
      this.schedulesRepo.getScheduleById(scheduleId),
      this.schedulesRepo.getParticipantsByScheduleId(scheduleId),
    ]);

    if (!sched) {
      return this.logger.warn(`Schedule ${scheduleId} not found, skipping job`);
    }

    let joinUrl = sched.zoomJoinUrl;
    if (!joinUrl) {
      try {
        const duration = Math.ceil(
          (sched.endDateTime.getTime() - sched.startDateTime.getTime()) / 60000,
        );

        // Use original timezone for Zoom API formatting
        const startTime = sched.originalTimezone
          ? formatUtcInUserTimezone(
              sched.startDateTime,
              sched.originalTimezone,
              'YYYY-MM-DDTHH:mm:ssZ',
            )
          : formatDateTimeWithOffset(sched.startDateTime);

        const resp = await this.zoomClient.createMeeting({
          topic: sched.agenda,
          type: 2,
          start_time: startTime,
          duration,
        });

        joinUrl = resp.join_url;
        await this.schedulesRepo.updateSchedule(scheduleId, {
          zoomJoinUrl: resp.join_url,
          zoomStartUrl: resp.start_url,
        });
        this.logger.log(`Zoom meeting created for schedule ${scheduleId}`);
      } catch (err) {
        this.logger.error(`Zoom creation failed for ${scheduleId}`, err);
        throw err;
      }
    }

    if (!participants?.length) {
      return this.logger.warn(
        `No participants for ${scheduleId}, skipping notifications.`,
      );
    }

    try {
      await this.notificationsService.createNotification({
        title: `Link Zoom telah tersedia. Silahkan klik link zoom ini untuk mengakses konseling daring: ${joinUrl}`,
        message: `Join here: ${joinUrl}`,
        recipientIds: participants.map((p) => p.id),
        type: 'schedule',
        subType: 'general',
      });
      this.logger.log(`Notifications sent for schedule ${scheduleId}`);
    } catch (err) {
      this.logger.error(
        `❌ Failed to notify participants for ${scheduleId}`,
        err,
      );
    }
  }
}
