export const uploadSizes = {
  '2MB': 2 * 1024 * 1024, // 2 MB
  '5MB': 5 * 1024 * 1024, // 5
  '10MB': 10 * 1024 * 1024, // 10 MB
  '15MB': 15 * 1024 * 1024, // 15 MB
} as const;

export const allowedImageTypes = ['image/jpeg', 'image/png'];

export const allowedDocumentTypes = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
