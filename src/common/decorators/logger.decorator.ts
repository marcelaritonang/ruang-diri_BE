import { Inject } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger as WinstonLogger } from 'winston';

export function InjectLogger() {
  return Inject(WINSTON_MODULE_PROVIDER);
}

export function LogOperation(operationName?: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;
    const contextName = target.constructor.name;
    const opName = operationName || propertyKey;

    descriptor.value = async function (...args: any[]) {
      const logger: WinstonLogger = this.logger;

      logger.info(`Starting ${opName}`, {
        context: contextName,
        method: propertyKey,
      });

      try {
        const result = await originalMethod.apply(this, args);

        logger.info(`${opName} completed successfully`, {
          context: contextName,
          method: propertyKey,
        });

        return result;
      } catch (error) {
        logger.error(`${opName} failed`, {
          context: contextName,
          method: propertyKey,
          error: error.message,
          stack: error.stack,
        });

        throw error;
      }
    };

    return descriptor;
  };
}
