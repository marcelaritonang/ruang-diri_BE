import { ZodSchema, ZodError } from 'zod';
import {
  PipeTransform,
  Injectable,
  BadRequestException,
  Logger,
} from '@nestjs/common';

@Injectable()
export class ZodPipe<T> implements PipeTransform<unknown, T> {
  private readonly logger = new Logger(ZodPipe.name);

  constructor(private schema: ZodSchema<T>) {}

  transform(value: unknown) {
    try {
      this.logger.log(`Validating input: ${JSON.stringify(value)}`);

      return this.schema.parse(value);
    } catch (error) {
      if (error instanceof ZodError) {
        const errorDetails = error.errors.map((err) => ({
          field: err.path || 'unknown',
          message: err.message,
        }));

        this.logger.error(`Validation failed: ${JSON.stringify(errorDetails)}`);

        throw new BadRequestException({
          message: 'Validation failed',
          errors: errorDetails,
        });
      }
      throw error;
    }
  }
}
