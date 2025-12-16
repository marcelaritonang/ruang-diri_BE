import type { Role } from '@/modules/auth/decorators/roles.decorator';

type ScheduleType = 'canceled' | 'rescheduled' | 'created';

export const INDONESIAN_ROLES = {
  super_admin: 'Super Admin',
  organization: 'Organisasi',
  student: 'Siswa',
  employee: 'Karyawan',
  psychologist: 'Psikolog',
  client: 'Klien',
} as const;

export const GENERAL_NOTIF_MSG = {
  LOGIN_DIFFERENT_DEVICES: 'Kamu telah login di perangkat berbeda',
};

export const DASHBOARD_NOTIF_MSG = {
  AT_RISK_REPORT: 'Kamu telah mengirim Laporan Berisiko ke email kamu',
  NOT_SCREENED_REPORT:
    'Kamu telah mengirim Laporan Belum Skrining ke email kamu',
  NOT_COUNSELED_REPORT:
    'Kamu telah mengirim Laporan Belum Konseling ke email kamu',
};

export const ACCOUNT_NOTIF_MSG = {
  CHANGED_PASSWORD: 'Kamu telah mengubah password kamu',
  CHANGED_PROFILE: 'Kamu telah mengubah profil kamu',
  RESET_PASSWORD: 'Kamu telah menyetel ulang password kamu',
};

export const SCHEDULE_NOTIF_MSG = {
  CREATED: (role: Role, name: string, date?: string, time?: string) =>
    scheduleMsg(role, 'created', name, date, time),
  CANCELED: (role: Role, name?: string, date?: string, time?: string) =>
    scheduleMsg(role, 'canceled', name, date, time),
  RESCHEDULED: (role: Role, name: string, date?: string, time?: string) =>
    scheduleMsg(role, 'rescheduled', name, date, time),
  COMPLETED_COUNSELING: (name: string, date: string, time: string) =>
    `Konseling dengan ${name} pada ${date} jam ${time} telah selesai.`,
};

export const ALERT_NOTIF_MSG = {
  MAINTANCE: (date: string) =>
    `Mohon maaf, Roomies. Kami harus melakukan maintance website/aplikasi pada tanggal ${date}. Mohon maaf atas ketidaknyamanannya.`,
  DIFFERENT_DEVICE_LOGIN: (
    device: string,
    deviceOs: string,
    date: string,
    time: string,
  ) =>
    `Ssh! Ada upaya login dari ${device} (${deviceOs}) pada ${date} dan ${time}. Pastikan bahwa upaya login ini dilakukan oleh kamu, ya!`,
};

function scheduleMsg(
  role: Role,
  type: ScheduleType,
  name?: string,
  date?: string,
  time?: string,
): string {
  if (!date || !time) {
    return 'Informasi jadwal tidak lengkap.';
  }

  const roleName = INDONESIAN_ROLES[role] ?? role;

  const buildMsg = (actor: string, action: string) =>
    `${actor} telah ${action} jadwal pada ${date} jam ${time}`;

  if (role === 'organization') {
    switch (type) {
      case 'created':
        return `Kamu telah membuat jadwal baru untuk ${date} dan ${time}`;
      case 'rescheduled':
        return `Kamu telah mengubah jadwal pada ${date} jam ${time} dengan ${name}`;
      case 'canceled':
        return `Kamu telah menghapus jadwal pada ${date} jam ${time}${name ? ` dengan ${name}` : ''}`;
    }
  } else {
    switch (type) {
      case 'created':
        return buildMsg(`${roleName} ${name}`, 'membuat');
      case 'rescheduled':
        return buildMsg(`${roleName} ${name}`, 'mengubah');
      case 'canceled':
        return buildMsg(`${roleName} ${name}`, 'menghapus');
    }
  }
}
