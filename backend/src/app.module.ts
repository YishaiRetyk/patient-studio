import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { TerminusModule } from '@nestjs/terminus';

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

// Services
import { EncryptionService } from './common/encryption/encryption.service';

// Modules (to be implemented in Phase 3+)
// import { AuthModule } from './modules/auth/auth.module';
// import { PatientsModule } from './modules/patients/patients.module';
// import { AppointmentsModule } from './modules/appointments/appointments.module';
// import { NotesModule } from './modules/notes/notes.module';
// import { BillingModule } from './modules/billing/billing.module';
// import { PractitionersModule } from './modules/practitioners/practitioners.module';
// import { AuditModule } from './modules/audit/audit.module';

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

    // Feature modules (to be added in Phase 3+)
    // AuthModule,
    // PatientsModule,
    // AppointmentsModule,
    // NotesModule,
    // BillingModule,
    // PractitionersModule,
    // AuditModule,
  ],
  providers: [
    // Global services
    EncryptionService,
  ],
})
export class AppModule {}
