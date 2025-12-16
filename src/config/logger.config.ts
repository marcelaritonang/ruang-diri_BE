import { Injectable } from '@nestjs/common';
import { WinstonModuleOptions } from 'nest-winston';
import * as winston from 'winston';
import { env } from './env.config';

@Injectable()
export class LoggerConfig {
  static getWinstonConfig(): WinstonModuleOptions {
    const isProduction = env.NODE_ENV === 'production';

    return {
      level: isProduction ? 'info' : 'debug',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
        ...(isProduction ? [] : [winston.format.colorize()]),
      ),
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            isProduction
              ? winston.format.json()
              : winston.format.printf(
                  ({ timestamp, level, message, context, ...meta }) => {
                    return `${timestamp} [${context || 'Application'}] ${level}: ${message} ${
                      Object.keys(meta).length
                        ? JSON.stringify(meta, null, 2)
                        : ''
                    }`;
                  },
                ),
          ),
        }),

        // File transport for production
        ...(isProduction
          ? [
              new winston.transports.File({
                filename: 'logs/error.log',
                level: 'error',
                maxsize: 5242880, // 5MB
                maxFiles: 5,
              }),
              new winston.transports.File({
                filename: 'logs/combined.log',
                maxsize: 5242880, // 5MB
                maxFiles: 5,
              }),
            ]
          : []),
      ],
      exceptionHandlers: isProduction
        ? [new winston.transports.File({ filename: 'logs/exceptions.log' })]
        : undefined,
      rejectionHandlers: isProduction
        ? [new winston.transports.File({ filename: 'logs/rejections.log' })]
        : undefined,
    };
  }
}
