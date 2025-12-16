import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class ErrorHandlerUtil {
  private readonly logger = new Logger(ErrorHandlerUtil.name);

  async handleServiceError<T>(
    operation: string,
    fn: () => Promise<T>,
    context?: Record<string, any>,
  ): Promise<T> {
    try {
      this.logger.log(`Starting operation: ${operation}`, context);
      const result = await fn();
      this.logger.log(`Completed operation: ${operation}`, context);
      return result;
    } catch (error) {
      this.logger.error(`Error in operation: ${operation}`, {
        error: error.message,
        stack: error.stack,
        context,
      });
      throw error;
    }
  }

  logInfo(message: string, context?: Record<string, any>): void {
    this.logger.log(message, context);
  }

  logError(message: string, error: Error, context?: Record<string, any>): void {
    this.logger.error(message, {
      error: error.message,
      stack: error.stack,
      context,
    });
  }

  logWarning(message: string, context?: Record<string, any>): void {
    this.logger.warn(message, context);
  }
}
