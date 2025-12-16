import { CloudStorageService } from '@/common/cloud-storage/cloud-storage.service';

/**
 * Upload image to Cloud Storage and return relative path
 * @param img - Multer file from memory storage
 * @param directory - Folder in GCS bucket (e.g., "user", "chat")
 * @param cloudStorageService - Injected CloudStorageService
 * @returns Relative file path to store in DB (e.g., "user/profile-123.jpg")
 */
export const uploadImageToGCS = async (
  img: Express.Multer.File,
  directory: string,
  cloudStorageService: CloudStorageService,
): Promise<string> => {
  const result = await cloudStorageService.uploadFile(img, directory);
  return result.filePath; // Returns "user/profile-123.jpg"
};

/**
 * @deprecated Use CloudStorageService.getSignedUrl() directly instead
 * This function is kept for backward compatibility
 */
export const getImgUrl = (
  img: Express.Multer.File,
  directory: string,
): string => {
  // This should not be used anymore with Cloud Storage
  throw new Error(
    'getImgUrl is deprecated. Use uploadImageToGCS and CloudStorageService.getSignedUrl() instead',
  );
};