import { registerAs } from '@nestjs/config';
import * as winston from 'winston';
import WinstonCloudWatch from 'winston-cloudwatch';

/**
 * Winston Logger Configuration with CloudWatch (T046)
 * Per FR-046: Centralized logging with 7-year retention
 */

const logLevel = process.env.LOG_LEVEL || 'info';
const logFormat = process.env.LOG_FORMAT || 'json';

const transports: winston.transport[] = [
  new winston.transports.Console({
    format:
      logFormat === 'json'
        ? winston.format.combine(
            winston.format.timestamp(),
            winston.format.errors({ stack: true }),
            winston.format.json(),
          )
        : winston.format.combine(
            winston.format.timestamp(),
            winston.format.errors({ stack: true }),
            winston.format.colorize(),
            winston.format.printf(({ timestamp, level, message, context, ...meta }) => {
              let msg = `${timestamp} [${level}] ${context ? `[${context}]` : ''} ${message}`;
              if (Object.keys(meta).length > 0) {
                msg += ` ${JSON.stringify(meta)}`;
              }
              return msg;
            }),
          ),
  }),
];

// Add CloudWatch transport in production
if (process.env.NODE_ENV === 'production' && process.env.AWS_CLOUDWATCH_LOG_GROUP) {
  transports.push(
    new WinstonCloudWatch({
      logGroupName: process.env.AWS_CLOUDWATCH_LOG_GROUP,
      logStreamName: process.env.AWS_CLOUDWATCH_LOG_STREAM || `api-${new Date().toISOString().split('T')[0]}`,
      awsRegion: process.env.AWS_REGION || 'us-east-1',
      messageFormatter: (log) => JSON.stringify(log),
      retentionInDays: 2555, // 7 years per FR-046
    }),
  );
}

export const loggerConfig = winston.createLogger({
  level: logLevel,
  transports,
  exceptionHandlers: transports,
  rejectionHandlers: transports,
});

export default registerAs('logger', () => ({
  level: logLevel,
  format: logFormat,
  cloudWatch: {
    enabled: process.env.NODE_ENV === 'production',
    logGroup: process.env.AWS_CLOUDWATCH_LOG_GROUP,
    logStream: process.env.AWS_CLOUDWATCH_LOG_STREAM,
    retentionDays: 2555, // 7 years
  },
}));
