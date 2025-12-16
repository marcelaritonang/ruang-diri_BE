import { BadRequestException } from '@nestjs/common';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';

import * as multer from 'multer';

import {
  allowedImageTypes,
  uploadSizes,
} from '@/common/constants/attachments.constant';

import { env } from './env.config';

/**
 * ✅ CLOUD STORAGE CONFIGURATION
 * 
 * This configuration uses MEMORY storage for Multer.
 * Files are temporarily held in memory, then uploaded to Google Cloud Storage.
 * No files are saved to local filesystem.
 */
export const multerConfigFactory = (
  subfolder: string, // Still used for organizing files in GCS
  allowedTypes = allowedImageTypes,
  maxFileSize = uploadSizes['2MB'],
  maxFiles = 1,
): MulterOptions => {
  // Log configuration in production
  if (env.NODE_ENV === 'production') {
    console.log(
      `✅ Multer configured for Cloud Storage - folder: ${subfolder}`,
    );
  }

  return {
    // Use memory storage - files stored in Buffer
    storage: multer.memoryStorage(),
    limits: {
      fileSize: maxFileSize,
      files: maxFiles,
    },
    fileFilter: (_req, file, cb) => {
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(
          new BadRequestException(
            `Tipe file tidak didukung: ${file.mimetype}. Hanya ${allowedTypes.join(
              ', ',
            )} yang diperbolehkan.`,
          ),
          false,
        );
      }
    },
  };
};