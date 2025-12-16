import { Logger } from '@nestjs/common';
import { ErrorHandlerUtil } from '../utils/error-handler.util';

export function ServiceErrorHandler(operationName: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const logger = this.logger || new Logger(target.constructor.name);
      const errorHandler = this.errorHandler as ErrorHandlerUtil;

      if (errorHandler) {
        return errorHandler.handleServiceError(
          operationName,
          () => originalMethod.apply(this, args),
          { method: propertyKey, args: args.length },
        );
      } else {
        // Fallback to basic logging if errorHandler is not available
        try {
          logger.log(`Starting ${operationName}`);
          const result = await originalMethod.apply(this, args);
          logger.log(`Completed ${operationName}`);
          return result;
        } catch (error) {
          logger.error(`Error in ${operationName}: ${error.message}`);
          throw error;
        }
      }
    };

    return descriptor;
  };
}

export abstract class BaseService {
  protected abstract readonly logger: Logger;

  constructor(protected readonly errorHandler: ErrorHandlerUtil) {}
}
