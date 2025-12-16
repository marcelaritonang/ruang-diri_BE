import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { Storage } from '@google-cloud/storage';
import { env } from '@/config/env.config';
import { UploadResult, SignedUrlOptions } from './cloud-storage.types';

@Injectable()
export class CloudStorageService {
  private readonly logger = new Logger(CloudStorageService.name);
  private storage: Storage;
  private bucket: string;

  constructor() {
    // Cloud Run has automatic authentication to GCS
    this.storage = new Storage();
    this.bucket = env.GCS_BUCKET_NAME;
    
    this.logger.log(`Initialized Cloud Storage with bucket: ${this.bucket}`);
  }

  /**
   * Upload file to Google Cloud Storage
   * @param file - Express.Multer.File from memory storage
   * @param folder - Folder path (e.g., "user", "chat", "documents")
   * @returns UploadResult with relative file path
   */
  async uploadFile(
    file: Express.Multer.File,
    folder: string,
  ): Promise<UploadResult> {
    try {
      const timestamp = Date.now();
      const randomSuffix = Math.round(Math.random() * 1e9);
      const fileName = `${file.fieldname}-${timestamp}-${randomSuffix}${this.getFileExtension(file.originalname)}`;
      const filePath = `${folder}/${fileName}`;

      const blob = this.storage.bucket(this.bucket).file(filePath);
      const blobStream = blob.createWriteStream({
        resumable: false,
        metadata: {
          contentType: file.mimetype,
        },
      });

      await new Promise<void>((resolve, reject) => {
        blobStream.on('error', (err) => {
          this.logger.error(`Upload error for ${filePath}:`, err);
          reject(err);
        });

        blobStream.on('finish', () => {
          this.logger.log(`File uploaded successfully: ${filePath}`);
          resolve();
        });

        blobStream.end(file.buffer);
      });

      return {
        filePath, // Store this in DB: "user/profile-123.jpg"
        fileName: file.originalname,
        contentType: file.mimetype,
        size: file.size,
      };
    } catch (error) {
      this.logger.error(`Failed to upload file to GCS:`, error);
      throw new InternalServerErrorException('Failed to upload file');
    }
  }

  /**
   * Generate signed URL for private file access
   * @param filePath - Relative path from DB (e.g., "user/profile-123.jpg")
   * @param options - Signed URL options
   * @returns Signed URL valid for specified duration
   */
  async getSignedUrl(
    filePath: string,
    options: SignedUrlOptions = {},
  ): Promise<string> {
    try {
      if (!filePath) {
        return '';
      }

      const expiresIn = options.expiresIn || 60; // Default 60 minutes
      const file = this.storage.bucket(this.bucket).file(filePath);

      const [url] = await file.getSignedUrl({
        version: 'v4',
        action: 'read',
        expires: Date.now() + expiresIn * 60 * 1000,
      });

      return url;
    } catch (error) {
      this.logger.error(`Failed to generate signed URL for ${filePath}:`, error);
      // Return empty string instead of throwing - graceful degradation
      return '';
    }
  }

  /**
   * Generate signed URLs for multiple files
   * @param filePaths - Array of relative paths
   * @param options - Signed URL options
   * @returns Array of signed URLs in same order
   */
  async getSignedUrls(
    filePaths: string[],
    options: SignedUrlOptions = {},
  ): Promise<string[]> {
    return Promise.all(
      filePaths.map((path) => this.getSignedUrl(path, options)),
    );
  }

  /**
   * Delete file from Google Cloud Storage
   * @param filePath - Relative path from DB
   */
  async deleteFile(filePath: string): Promise<void> {
    try {
      if (!filePath) return;

      const file = this.storage.bucket(this.bucket).file(filePath);
      await file.delete();
      
      this.logger.log(`File deleted successfully: ${filePath}`);
    } catch (error) {
      // Log but don't throw - file might already be deleted
      this.logger.warn(`Failed to delete file ${filePath}:`, error.message);
    }
  }

  /**
   * Check if file exists in GCS
   * @param filePath - Relative path from DB
   */
  async fileExists(filePath: string): Promise<boolean> {
    try {
      if (!filePath) return false;
      
      const file = this.storage.bucket(this.bucket).file(filePath);
      const [exists] = await file.exists();
      return exists;
    } catch (error) {
      this.logger.error(`Failed to check file existence for ${filePath}:`, error);
      return false;
    }
  }

  private getFileExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    return lastDot === -1 ? '' : filename.substring(lastDot);
  }
}