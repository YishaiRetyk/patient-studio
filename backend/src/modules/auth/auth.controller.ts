import { Controller, Post, Get, Body, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PatientAuthService } from './patient-auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

/**
 * Authentication Controller (T036)
 * Handles authentication endpoints for practitioners and patients
 */
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly patientAuthService: PatientAuthService,
  ) {}

  /**
   * Refresh access token
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() body: { refreshToken: string }) {
    const accessToken = await this.authService.refreshAccessToken(body.refreshToken);
    return { accessToken };
  }

  /**
   * Request magic link for patient authentication
   */
  @Post('patient/magic-link')
  @HttpCode(HttpStatus.OK)
  async requestMagicLink(@Body() body: { email: string; tenantId: string }) {
    const magicLink = await this.patientAuthService.generateMagicLink(
      body.email,
      body.tenantId,
    );

    // In production, send email instead of returning link
    // await this.emailService.sendMagicLink(body.email, magicLink);

    return {
      message: 'Magic link sent to your email',
      // For development only - remove in production
      magicLink: process.env.NODE_ENV === 'development' ? magicLink : undefined,
    };
  }

  /**
   * Validate magic link token
   */
  @Get('patient/magic-link/validate')
  async validateMagicLink(
    @Query('token') token: string,
    @Query('tenantId') tenantId: string,
  ) {
    const patient = await this.patientAuthService.validateMagicLink(token, tenantId);
    return { patient };
  }

  /**
   * Request OTP for patient authentication
   */
  @Post('patient/otp/request')
  @HttpCode(HttpStatus.OK)
  async requestOTP(@Body() body: { email: string; tenantId: string }) {
    const code = await this.patientAuthService.generateOTP(body.email, body.tenantId);

    // In production, send email instead of returning code
    // await this.emailService.sendOTP(body.email, code);

    return {
      message: 'OTP sent to your email',
      // For development only - remove in production
      code: process.env.NODE_ENV === 'development' ? code : undefined,
    };
  }

  /**
   * Validate OTP code
   */
  @Post('patient/otp/validate')
  @HttpCode(HttpStatus.OK)
  async validateOTP(
    @Body() body: { email: string; code: string; tenantId: string },
  ) {
    const patient = await this.patientAuthService.validateOTP(
      body.email,
      body.code,
      body.tenantId,
    );
    return { patient };
  }

  /**
   * Get current user info (protected route)
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getCurrentUser(@Body() body: any) {
    return { user: body.user };
  }
}
