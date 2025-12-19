import { Injectable, Logger, Optional, Inject } from '@nestjs/common'; // ← Add Optional, Inject
import { InjectQueue } from '@nestjs/bullmq';

import type { Queue, Job } from 'bullmq';

import { QUEUE_JOB } from '../queue.config';

import { calculateDelay } from '@/common/utils/date.util';

@Injectable()
export class ZoomMeetingQueue {
  private readonly logger = new Logger(ZoomMeetingQueue.name);

  constructor(
    @Optional() @InjectQueue(QUEUE_JOB.ZOOM_MEETING) // ← Add @Optional()
    private readonly queue: Queue | null, // ← Add | null
  ) {
    if (!this.queue) {
      this.logger.warn('ZoomMeetingQueue initialized without Redis - queue operations disabled');
    }
  }

  /**
   * Schedule a "generate-zoom-link" job to run 1 hour before startDateTime
   */
  async counselingLinkGeneration(
    scheduleId: string,
    startDateTime: Date,
  ): Promise<Job | null> { // ← Add | null
    // ✅ Add null check
    if (!this.queue) {
      this.logger.warn(`Queue not available - skipping Zoom link generation for schedule ${scheduleId}`);
      return null;
    }

    const delay = calculateDelay(startDateTime);

    this.logger.log(
      `Enqueuing Zoom link job for schedule ${scheduleId} (in ${delay}ms)`,
    );

    await this.removeCounselingLinkGeneration(scheduleId);

    return this.queue.add(
      'generate-zoom-link',
      { scheduleId },
      {
        jobId: `zoom-link-${scheduleId}`,
        delay: Math.max(delay, 0),
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: true,
      },
    );
  }

  async removeCounselingLinkGeneration(scheduleId: string): Promise<void> {
    // ✅ Add null check
    if (!this.queue) {
      this.logger.warn(`Queue not available - skipping Zoom link removal for schedule ${scheduleId}`);
      return;
    }

    this.logger.log(`Removing Zoom link job for schedule ${scheduleId}`);

    const jobId = `zoom-link-${scheduleId}`;

    const job = await this.queue.getJob(jobId);

    if (job) {
      await job.remove();

      this.logger.log(`Removed Zoom link job ${jobId}`);
    } else {
      this.logger.warn(`Zoom link job ${jobId} not found`);
    }
  }
}