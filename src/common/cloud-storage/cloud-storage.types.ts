export interface UploadResult {
  filePath: string; // Relative path stored in DB: "user/profile-123.jpg"
  fileName: string; // Original filename
  contentType: string;
  size: number;
}

export interface SignedUrlOptions {
  expiresIn?: number; // Expiration in minutes, default 60
}