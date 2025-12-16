import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { ZodError } from 'zod';

interface ErrorDetail {
  field: string | string[];
  message: string;
}

interface ErrorResponse {
  status: 'error' | 'fail';
  data: null;
  message: string;
  errors?: ErrorDetail[];
}

@Catch(HttpException, ZodError)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException | ZodError, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    if (exception instanceof ZodError) {
      const status = HttpStatus.BAD_REQUEST;

      const formattedErrors: ErrorDetail[] = exception.errors.map((err) => ({
        field: err.path.join('.') || 'unknown',
        message: err.message,
      }));

      const errorResponse: ErrorResponse = {
        status: 'fail',
        data: null,
        message: 'Validation failed',
        errors: formattedErrors,
      };

      response.status(status).json(errorResponse);
      return;
    }

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse = exception.getResponse();
    console.log('FULL EXCEPTION RESPONSE:', JSON.stringify(exceptionResponse));

    let errorResponse: ErrorResponse = {
      status: status >= 500 ? 'error' : 'fail',
      data: null,
      message: this.extractErrorMessage(exceptionResponse),
    };

    const errors = this.extractErrors(exceptionResponse);
    if (errors) {
      errorResponse.errors = errors;
    }

    this.logger.error(
      `${request.method} ${request.url}`,
      JSON.stringify(errorResponse),
    );

    response.status(status).json(errorResponse);
  }

  private extractErrors(exceptionResponse: unknown): ErrorDetail[] | undefined {
    if (typeof exceptionResponse !== 'object' || exceptionResponse === null) {
      return undefined;
    }

    const responseObj = exceptionResponse as Record<string, unknown>;

    if ('errors' in responseObj && Array.isArray(responseObj.errors)) {
      return responseObj.errors as ErrorDetail[];
    }

    if (
      'message' in responseObj &&
      typeof responseObj.message === 'object' &&
      responseObj.message !== null
    ) {
      const messageObj = responseObj.message as Record<string, unknown>;

      if ('errors' in messageObj && Array.isArray(messageObj.errors)) {
        return messageObj.errors as ErrorDetail[];
      }
    }

    return undefined;
  }

  private extractErrorMessage(exceptionResponse: unknown): string {
    if (typeof exceptionResponse === 'string') {
      return exceptionResponse;
    }

    if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      const responseObj = exceptionResponse as Record<string, unknown>;

      if ('message' in responseObj) {
        const message = responseObj.message;

        if (typeof message === 'string') {
          return message;
        } else if (
          typeof message === 'object' &&
          message !== null &&
          'message' in (message as Record<string, unknown>) &&
          typeof (message as Record<string, unknown>).message === 'string'
        ) {
          return (message as Record<string, string>).message;
        }
      }

      if ('error' in responseObj && typeof responseObj.error === 'string') {
        return responseObj.error;
      }
    }

    return 'An unexpected error occurred';
  }
}
