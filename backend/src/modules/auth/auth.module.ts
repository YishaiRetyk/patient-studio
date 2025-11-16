import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AuthService } from './auth.service';
import { PatientAuthService } from './patient-auth.service';
import { AuthController } from './auth.controller';
import { Auth0Strategy } from './strategies/auth0.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RbacGuard } from './guards/rbac.guard';
import { PrismaService } from '../../common/database/prisma.service';

/**
 * Authentication Module (T035)
 * Provides authentication and authorization services
 */
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const authConfig = configService.get('auth');
        return {
          secret: authConfig.jwt.secret,
          signOptions: { expiresIn: authConfig.jwt.expiresIn },
        };
      },
    }),
  ],
  providers: [
    AuthService,
    PatientAuthService,
    Auth0Strategy,
    JwtAuthGuard,
    RbacGuard,
    PrismaService,
  ],
  controllers: [AuthController],
  exports: [AuthService, PatientAuthService, JwtAuthGuard, RbacGuard],
})
export class AuthModule {}
