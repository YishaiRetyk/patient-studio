import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { sign, verify } from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../common/database/prisma.service';

/**
 * Authentication Service (T037)
 * Handles JWT token generation, refresh, and session management
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Generate JWT access token
   */
  async generateAccessToken(user: any): Promise<string> {
    const authConfig = this.configService.get('auth');

    const payload = {
      sub: user.userId,
      email: user.email,
      tenantId: user.tenantId,
      role: user.role,
      authProviderId: user.authProviderId,
      iat: Math.floor(Date.now() / 1000),
      lastActivity: Math.floor(Date.now() / 1000),
    };

    return sign(payload, authConfig.jwt.secret, {
      expiresIn: authConfig.jwt.expiresIn,
    });
  }

  /**
   * Generate refresh token
   */
  async generateRefreshToken(user: any): Promise<string> {
    const authConfig = this.configService.get('auth');

    const payload = {
      sub: user.userId,
      type: 'refresh',
    };

    return sign(payload, authConfig.jwt.secret, {
      expiresIn: authConfig.jwt.refreshExpiresIn,
    });
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<string> {
    try {
      const authConfig = this.configService.get('auth');
      const payload = verify(refreshToken, authConfig.jwt.secret) as any;

      if (payload.type !== 'refresh') {
        throw new Error('Invalid refresh token');
      }

      // Fetch user from database
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        include: { practitioner: true },
      });

      if (!user || user.status !== 'ACTIVE') {
        throw new Error('User not found or inactive');
      }

      // Update last login timestamp
      await this.prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      return this.generateAccessToken({
        userId: user.id,
        email: user.email,
        tenantId: user.tenantId,
        role: user.role,
        authProviderId: user.authProviderId,
      });
    } catch (error) {
      this.logger.error(`Refresh token validation failed: ${error.message}`);
      throw new Error('Invalid or expired refresh token');
    }
  }

  /**
   * Validate user credentials and create session
   */
  async login(authProviderId: string, tenantId: string): Promise<any> {
    // Find or create user
    let user = await this.prisma.user.findFirst({
      where: {
        authProviderId,
        tenantId,
      },
      include: { practitioner: true },
    });

    if (!user) {
      this.logger.warn(`User not found: ${authProviderId}`);
      throw new Error('User not found');
    }

    if (user.status === 'LOCKED') {
      this.logger.warn(`Locked account login attempt: ${user.email}`);
      throw new Error('Account is locked');
    }

    // Update last login
    user = await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
      include: { practitioner: true },
    });

    const accessToken = await this.generateAccessToken({
      userId: user.id,
      email: user.email,
      tenantId: user.tenantId,
      role: user.role,
      authProviderId: user.authProviderId,
    });

    const refreshToken = await this.generateRefreshToken({
      userId: user.id,
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
      },
    };
  }
}
