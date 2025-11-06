import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Sentry from '@sentry/node';
import { AppModule } from './app.module';
import { loggerConfig } from './config/logger.config';

/**
 * NestJS Application Bootstrap (T050)
 * Per plan.md: NestJS 10.x REST API with comprehensive middleware pipeline
 */
async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: loggerConfig,
  });

  const configService = app.get(ConfigService);

  // Sentry initialization (T047)
  const sentryConfig = configService.get('sentry');
  if (sentryConfig.dsn) {
    Sentry.init({
      dsn: sentryConfig.dsn,
      environment: sentryConfig.environment,
      tracesSampleRate: sentryConfig.tracesSampleRate,
      profilesSampleRate: sentryConfig.profilesSampleRate,
    });
  }

  // Global validation pipe (T053)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip unknown properties
      forbidNonWhitelisted: true, // Throw error on unknown properties
      transform: true, // Auto-transform payloads to DTO types
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // CORS configuration
  const corsOrigin = configService.get('CORS_ORIGIN', 'http://localhost:3000');
  app.enableCors({
    origin: corsOrigin.split(','),
    credentials: true,
  });

  // API prefix
  const apiPrefix = configService.get('API_PREFIX', 'api/v1');
  app.setGlobalPrefix(apiPrefix);

  // Start server
  const port = configService.get('PORT', 3000);
  await app.listen(port);

  loggerConfig.info(`🚀 Patient Studio API running on http://localhost:${port}/${apiPrefix}`);
  loggerConfig.info(`📊 Environment: ${configService.get('NODE_ENV', 'development')}`);
}

bootstrap();
