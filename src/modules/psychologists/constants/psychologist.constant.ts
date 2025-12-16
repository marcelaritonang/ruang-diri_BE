export const counselingMethods = {
  online: 'online',
  offline: 'offline',
  organization: 'organization',
  chat: 'chat',
} as const;

export const arrCounselingMethods = [
  counselingMethods.online,
  counselingMethods.offline,
  counselingMethods.organization,
  counselingMethods.chat,
] as const;

export const daysAvailability = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
} as const;
