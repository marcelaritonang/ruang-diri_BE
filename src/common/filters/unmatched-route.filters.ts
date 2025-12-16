import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  NotFoundException,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch(NotFoundException)
export class NotFoundExceptionFilter implements ExceptionFilter {
  catch(exception: NotFoundException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Get the exception response
    const exceptionResponse = exception.getResponse() as any;

    // Extract the message
    const errorMessage =
      typeof exceptionResponse === 'object'
        ? exceptionResponse.message
        : String(exceptionResponse);

    // Check if this is actually a route not found (404) by looking at the original message
    // NestJS default NotFoundException for unmatched routes has a specific pattern
    const isActualRouteNotFound =
      typeof errorMessage === 'string' &&
      (errorMessage === 'Cannot GET ' + request.url ||
        errorMessage === 'Cannot POST ' + request.url ||
        errorMessage === 'Cannot PUT ' + request.url ||
        errorMessage === 'Cannot PATCH ' + request.url ||
        errorMessage === 'Cannot DELETE ' + request.url ||
        errorMessage.startsWith('Cannot ') ||
        errorMessage === 'Not Found');

    response.status(404).json({
      data: null,
      message: isActualRouteNotFound ? 'Route not found' : errorMessage,
      status: 'error',
    });
  }
}
