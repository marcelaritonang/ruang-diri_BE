import dayjs from 'dayjs';

import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

const TZ_MAP: Record<string, string> = {
  // Indonesia Standard Time Zones
  WIB: 'Asia/Jakarta', // UTC+7
  WITA: 'Asia/Makassar', // UTC+8
  WIT: 'Asia/Jayapura', // UTC+9

  // IANA timezone identifiers
  'Asia/Jakarta': 'Asia/Jakarta',
  'Asia/Makassar': 'Asia/Makassar',
  'Asia/Jayapura': 'Asia/Jayapura',

  // Common IANA timezones (expanded support)
  UTC: 'UTC',
  'Asia/Singapore': 'Asia/Singapore',
  'Asia/Kuala_Lumpur': 'Asia/Kuala_Lumpur',
  'Asia/Manila': 'Asia/Manila',
  'Asia/Bangkok': 'Asia/Bangkok',
  'Asia/Ho_Chi_Minh': 'Asia/Ho_Chi_Minh',
  'Asia/Tokyo': 'Asia/Tokyo',
  'Asia/Seoul': 'Asia/Seoul',
  'Asia/Hong_Kong': 'Asia/Hong_Kong',
  'Asia/Shanghai': 'Asia/Shanghai',
  'Australia/Sydney': 'Australia/Sydney',
  'Australia/Melbourne': 'Australia/Melbourne',
  'America/New_York': 'America/New_York',
  'America/Los_Angeles': 'America/Los_Angeles',
  'America/Chicago': 'America/Chicago',
  'Europe/London': 'Europe/London',
  'Europe/Paris': 'Europe/Paris',
  'Europe/Berlin': 'Europe/Berlin',
} as const;

export const getCurrentMonth = (): number => {
  return dayjs().month() + 1;
};

export const convertDateToMonth = (date: Date): number => {
  if (!(date instanceof Date)) {
    throw new Error(
      'Argument passed to convertDateToMonth must be a Date object',
    );
  }
  return dayjs(date).month() + 1;
};

export const convertDateToString = (date: Date): string => {
  if (!(date instanceof Date)) {
    throw new Error(
      'Argument passed to convertDateToString must be a Date object',
    );
  }
  return dayjs(date).format('YYYY-MM-DD');
};

export function toUtcDateTime(
  date: string,
  time: string,
  userTz: string,
): Date {
  const fmt = time.length === 5 ? 'YYYY-MM-DD HH:mm' : 'YYYY-MM-DD HH:mm:ss';

  const isOffset = /^([+-]\d{2}):?(\d{2})$/.test(userTz);
  let local: dayjs.Dayjs;

  if (isOffset) {
    const m = userTz.replace(':', '');
    const sign = userTz.startsWith('-') ? -1 : 1;
    const hh = parseInt(m.slice(1, 3), 10);
    const mm = parseInt(m.slice(3, 5), 10);
    const offsetMin = sign * (hh * 60 + mm);

    const naive = dayjs(`${date} ${time}`, fmt, true);
    if (!naive.isValid()) throw new Error('Invalid date or time format');
    local = naive.utcOffset(offsetMin, true);
  } else {
    const timezone = TZ_MAP[userTz] || userTz;

    try {
      const parsed = dayjs.tz(`${date} ${time}`, fmt, timezone);
      if (!parsed.isValid()) throw new Error(`Invalid date, time, or timezone`);
      local = parsed;
    } catch (error) {
      throw new Error(`Unsupported timezone: ${userTz}`);
    }
  }

  return local.utc().toDate();
}

export const calculateDelay = (
  startDateTime: Date,
  offsetMs: number = 1000 * 60 * 60, // 1 hour in ms
): number => {
  if (!(startDateTime instanceof Date)) {
    throw new Error('Argument passed to calculateDelay must be a Date object');
  }

  const now = dayjs();
  const start = dayjs(startDateTime);
  return start.diff(now) - offsetMs;
};

export const getCurrentDateAndTime = (): { date: string; time: string } => {
  const result = dayjs()
    .tz(dayjs.tz.guess())
    .format('YYYY-MM-DD HH:mm:ss')
    .split(' ');

  const date = result[0];
  const time = result[1];

  return { date, time };
};

export const getCurrentTzFromDate = (date: Date): string => {
  if (!(date instanceof Date)) {
    throw new Error(
      'Argument passed to getCurrentTzFromDate must be a Date object',
    );
  }

  return dayjs(date).tz(dayjs.tz.guess()).format('Z');
};

export const formatDateTimeWithOffset = (date: Date): string => {
  if (!(date instanceof Date)) {
    throw new Error('Argument must be a Date');
  }
  return dayjs(date).format('YYYY-MM-DDTHH:mm:ssZ');
};

export const extractDateAndTime = (
  dateTimeWithOffset: Date,
): { date: string; time: string; timezone: string } => {
  const parsed = dayjs(dateTimeWithOffset);

  if (!parsed.isValid()) {
    throw new Error('Invalid date time format');
  }

  return {
    date: parsed.format('YYYY-MM-DD'),
    time: parsed.format('HH:mm'),
    timezone: parsed.format('Z'),
  };
};

export function getNotificationDelayMs(
  startDateTime: Date | string,
  offsetMinutes: number,
): number {
  const notifyAt = dayjs(startDateTime).subtract(offsetMinutes, 'minute');
  const diff = notifyAt.diff(dayjs());
  return diff > 0 ? diff : 0;
}

export const fromUtcToUserTimezone = (
  utcDateTime: Date,
  userTimezone: string,
): { date: string; time: string; timezone: string } => {
  const timezone = TZ_MAP[userTimezone] || userTimezone;

  try {
    const userLocal = dayjs.utc(utcDateTime).tz(timezone);

    return {
      date: userLocal.format('YYYY-MM-DD'),
      time: userLocal.format('HH:mm'),
      timezone: userTimezone,
    };
  } catch {
    throw new Error(`Unsupported timezone: ${userTimezone}`);
  }
};

export const formatUtcInUserTimezone = (
  utcDateTime: Date,
  userTimezone?: string,
  format: string = 'YYYY-MM-DD HH:mm',
): string => {
  if (userTimezone) {
    const timezone = TZ_MAP[userTimezone] || userTimezone;
    try {
      return dayjs.utc(utcDateTime).tz(timezone).format(format);
    } catch {
      // Fallback to UTC if timezone is invalid
      return dayjs.utc(utcDateTime).format(format);
    }
  }
  return dayjs.utc(utcDateTime).format(format);
};

export const getTimezoneOffset = (timezone: string): string => {
  const tz = TZ_MAP[timezone] || timezone;
  try {
    return dayjs().tz(tz).format('Z');
  } catch {
    return '+00:00'; // Fallback to UTC offset
  }
};

export const dateRangeToUtc = (
  fromDate: string,
  toDate: string,
  userTimezone?: string,
): { fromUtc: Date; toUtc: Date } => {
  if (!fromDate || !toDate) {
    throw new Error('Both fromDate and toDate are required');
  }

  let fromUtc: Date;
  let toUtc: Date;

  if (userTimezone) {
    fromUtc = toUtcDateTime(fromDate, '00:00', userTimezone);
    toUtc = toUtcDateTime(toDate, '23:59', userTimezone);
  } else {
    fromUtc = dayjs.utc(fromDate).startOf('day').toDate();
    toUtc = dayjs
      .utc(toDate)
      .set('hour', 23)
      .set('minute', 59)
      .startOf('minute')
      .toDate();
  }

  return { fromUtc, toUtc };
};

export function computeDelayMs(
  target: Date | string,
  tzName = 'Asia/Jakarta',
  minutesBefore = 0,
) {
  const MAX_DELAY_MS = 2_147_483_647;

  const targetLocal =
    typeof target === 'string'
      ? dayjs.tz(target, tzName)
      : dayjs(target).tz(tzName);

  const fireAtLocal = targetLocal.subtract(minutesBefore, 'minute');
  const nowUtc = dayjs.utc();
  const fireAtUtc = fireAtLocal.utc();

  const delay = fireAtUtc.diff(nowUtc, 'millisecond');

  return {
    delay: Math.min(Math.max(delay, 0), MAX_DELAY_MS),
    debug: {
      tzName,
      nowUtc: nowUtc.toISOString(),
      targetLocal: targetLocal.format('YYYY-MM-DD HH:mm'),
      fireAtLocal: fireAtLocal.format('YYYY-MM-DD HH:mm'),
      fireAtUtc: fireAtUtc.toISOString(),
      rawDelay: delay,
      clampedDelay: Math.min(Math.max(delay, 0), MAX_DELAY_MS),
    },
  };
}

export const getDayNumberFromDate = (date: Date): number => {
  if (!(date instanceof Date)) {
    throw new Error('Argument passed to getDayNumberFromDate must be a Date');
  }

  return dayjs(date).day();
};

export const getDayNumberInTz = (dateISO: string, tz: string) => {
  const z = TZ_MAP[tz] || tz;
  return dayjs.tz(`${dateISO} 12:00`, 'YYYY-MM-DD HH:mm', z).day(); // ambil tengah hari biar aman DST
};

export const toPgTime = (
  dateLike: string | Date,
  tz = 'Asia/Jakarta',
): string => {
  const d = dateLike instanceof Date ? dateLike : new Date(dateLike);
  if (isNaN(d.getTime())) throw new Error('Invalid date input');

  const dtf = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: tz,
  });
  const parts = dtf.formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '00';
  return `${get('hour')}:${get('minute')}:${get('second')}`; // "HH:mm:ss"
};

export const checkTimezone = (timezone: string): boolean => {
  if (!timezone) return false;

  // First check our predefined map
  if (Object.keys(TZ_MAP).includes(timezone)) {
    return true;
  }

  // For IANA timezone validation, try to create a dayjs instance
  try {
    const testDate = dayjs().tz(timezone);
    return testDate.isValid();
  } catch {
    return false;
  }
};

export function toIsoUTCString(
  input: Date | string | null | undefined,
): string | null {
  if (!input) return null;

  if (typeof input === 'string' && /T/.test(input)) {
    const d = new Date(input);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }

  if (typeof input === 'string') {
    const trimmed = input.trim();
    const [datePart, timePart] = trimmed.split(' ');
    if (datePart && timePart) {
      const msFixed = timePart.replace(/\.(\d{3})\d+$/, '.$1');
      const isoGuess = `${datePart}T${msFixed}Z`;
      const d = new Date(isoGuess);
      return isNaN(d.getTime()) ? null : d.toISOString();
    }
    const d = new Date(trimmed);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }

  return new Date(input.getTime()).toISOString();
}

export const toDateOnly = (iso: string) => iso.split('T')[0];

export const buildSlotTimestamps = (
  dateISO: string,
  start: string,
  end: string,
  tz: string = 'Asia/Jakarta',
) => {
  const z = TZ_MAP[tz] || tz;
  const fmt = start.length === 5 ? 'YYYY-MM-DD HH:mm' : 'YYYY-MM-DD HH:mm:ss';

  const startTs = dayjs.tz(`${dateISO} ${start}`, fmt, z).utc().toDate();
  const endTs = dayjs.tz(`${dateISO} ${end}`, fmt, z).utc().toDate();
  return { startTs, endTs };
};
