export const defaultJobOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 1000,
  },
  removeOnComplete: true,
};

export const QUEUE_JOB = {
  ZOOM_MEETING: 'zoom-meeting',
  SCHEDULE_NOTIFICATION: 'schedule-notification',
  CHAT_AUTOMATION: 'chat-automation',
} as const;
