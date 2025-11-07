import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { TerminusModule } from '@nestjs/terminus';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';

// Configuration imports (T030, T042, T046, T047, T048)
import authConfig from './config/auth.config';
import databaseConfig from './config/database.config';
import awsConfig from './config/aws.config';
import sentryConfig from './config/sentry.config';
import sendgridConfig from './config/sendgrid.config';
import stripeConfig from './config/stripe.config';
import openaiConfig from './config/openai.config';
import rateLimitConfig from './config/rate-limit.config';
import loggerConfig from './config/logger.config';

// Common services
import { EncryptionService } from './common/encryption/encryption.service';
import { PrismaService } from './common/database/prisma.service';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TenantContextInterceptor } from './common/interceptors/tenant-context.interceptor';

// Feature modules (Phase 2 complete)
import { AuthModule } from './modules/auth/auth.module';
import { AuditModule } from './modules/audit/audit.module';
import { NotificationsModule } from './modules/notifications/notifications.module';

// Feature modules (Phase 3+)
import { AppointmentsModule } from './modules/appointments/appointments.module';

// Feature modules (Phase 4)
import { PractitionersModule } from './modules/practitioners/practitioners.module';
import { WaitlistModule } from './modules/waitlist/waitlist.module';
import { CalendarModule } from './modules/calendar/calendar.module';

// Feature modules (to be implemented in Phase 5+)
// import { PatientsModule } from './modules/patients/patients.module';
// import { NotesModule } from './modules/notes/notes.module';
// import { BillingModule } from './modules/billing/billing.module';

/**
 * Root Application Module (T051)
 * Per plan.md: Modular NestJS architecture with feature modules
 */
@Module({
  imports: [
    // Configuration module with all configs
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        authConfig,
        databaseConfig,
        awsConfig,
        sentryConfig,
        sendgridConfig,
        stripeConfig,
        openaiConfig,
        rateLimitConfig,
        loggerConfig,
      ],
    }),

    // Rate limiting (T045)
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 600, // 600 requests per minute (per FR-048)
      },
    ]),

    // Health checks
    TerminusModule,

    // Phase 2 modules (complete)
    AuthModule,
    AuditModule,
    NotificationsModule,

    // Phase 3 modules
    AppointmentsModule,

    // Phase 4 modules
    PractitionersModule,
    WaitlistModule,
    CalendarModule,

    // Feature modules (to be added in Phase 5+)
    // PatientsModule,
    // NotesModule,
    // BillingModule,
  ],
  providers: [
    // Global services
    EncryptionService,
    PrismaService,

    // Global exception filter (T052)
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },

    // Global tenant context interceptor (T034)
    {
      provide: APP_INTERCEPTOR,
      useClass: TenantContextInterceptor,
    },
  ],
})
export class AppModule {}
