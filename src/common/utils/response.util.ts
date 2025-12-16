import { IPagination } from '../types/metadata.type';

export type Success<T> = ISuccessResponse<T> | SuccessResponseWithMeta<T>;

export interface ISuccessResponse<T = any> {
  status: 'success';
  data: T;
  message: string;
}

interface SuccessResponseWithMeta<T = any> {
  status: 'success';
  data: T;
  message: string;
  metadata: IPagination;
}

export class SuccessResponse {
  static create<T>(data: T, message: string) {
    return {
      status: 'success' as const,
      data,
      message,
    };
  }

  static success<T>(data: T | null, message: string) {
    if (data && typeof data === 'object' && 'metadata' in data) {
      const { metadata, data: actualData } = data as any;

      return {
        status: 'success' as const,
        data: actualData,
        metadata,
        message,
      } as SuccessResponseWithMeta<T>;
    }

    return {
      status: 'success' as const,
      data,
      message,
    } as ISuccessResponse<T>;
  }
}
