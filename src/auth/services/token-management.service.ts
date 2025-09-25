import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { RefreshToken } from '../../entities/refresh-token.entity';
import { User } from '../../entities/user.entity';
import { JwtTokenService } from './jwt.service';
import { AuditService } from './audit.service';
import { TokenPair, RefreshTokenPayload } from '../interfaces/token.interface';

@Injectable()
export class TokenManagementService {
  private readonly logger = new Logger(TokenManagementService.name);

  constructor(
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtTokenService: JwtTokenService,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Store refresh token in database with hash
   */
  async storeRefreshToken(userId: string, refreshToken: string): Promise<void> {
    try {
      // Hash the token for secure storage
      const tokenHash = this.hashToken(refreshToken);

      // Calculate expiration date
      const refreshExpiresIn =
        this.configService.get<string>('jwt.refreshExpiresIn') || '7d';
      const expiresAt = this.calculateExpirationDate(refreshExpiresIn);

      // Create refresh token record
      const refreshTokenEntity = this.refreshTokenRepository.create({
        userId,
        tokenHash,
        expiresAt,
        isRevoked: false,
      });

      await this.refreshTokenRepository.save(refreshTokenEntity);
      this.logger.log(`Refresh token stored for user: ${userId}`);
    } catch (error) {
      this.logger.error(
        `Failed to store refresh token for user ${userId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Refresh access and refresh tokens with rotation
   */
  async refreshTokens(
    refreshToken: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<TokenPair> {
    try {
      // Validate and decode refresh token
      const payload =
        await this.jwtTokenService.validateRefreshToken(refreshToken);

      // Hash the token to find it in database
      const tokenHash = this.hashToken(refreshToken);

      // Find the refresh token in database
      const storedToken = await this.refreshTokenRepository.findOne({
        where: {
          tokenHash,
          userId: payload.sub,
          isRevoked: false,
        },
        relations: ['user'],
      });

      if (!storedToken) {
        await this.auditService.logSuspiciousActivity(
          'INVALID_REFRESH_TOKEN',
          payload.sub,
          ipAddress,
          userAgent,
          { tokenId: payload.tokenId },
        );
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Check if token is expired
      if (storedToken.expiresAt < new Date()) {
        await this.revokeRefreshToken(storedToken.id);
        throw new UnauthorizedException('Refresh token expired');
      }

      // Get user
      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
      });

      if (!user || !user.isActive) {
        await this.revokeRefreshToken(storedToken.id);
        throw new UnauthorizedException('User not found or inactive');
      }

      // Revoke the old refresh token (token rotation)
      await this.revokeRefreshToken(storedToken.id);

      // Generate new token pair
      const newTokens = await this.jwtTokenService.generateTokenPair(user);

      // Store new refresh token
      await this.storeRefreshToken(user.id, newTokens.refreshToken);

      // Log token refresh
      await this.auditService.logTokenRefresh(user.id, ipAddress, userAgent);

      this.logger.log(`Tokens refreshed for user: ${user.id}`);

      return newTokens;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      this.logger.error('Token refresh failed:', error);
      throw new UnauthorizedException('Token refresh failed');
    }
  }

  /**
   * Revoke a specific refresh token
   */
  async revokeRefreshToken(tokenId: string): Promise<void> {
    try {
      await this.refreshTokenRepository.update(
        { id: tokenId },
        { isRevoked: true },
      );
      this.logger.log(`Refresh token revoked: ${tokenId}`);
    } catch (error) {
      this.logger.error(`Failed to revoke refresh token ${tokenId}:`, error);
    }
  }

  /**
   * Revoke all refresh tokens for a user (logout from all devices)
   */
  async revokeAllUserTokens(userId: string): Promise<void> {
    try {
      await this.refreshTokenRepository.update(
        { userId, isRevoked: false },
        { isRevoked: true },
      );
      this.logger.log(`All refresh tokens revoked for user: ${userId}`);
    } catch (error) {
      this.logger.error(
        `Failed to revoke all tokens for user ${userId}:`,
        error,
      );
    }
  }

  /**
   * Logout user by revoking refresh token
   */
  async logout(
    userId: string,
    refreshToken: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    try {
      const tokenHash = this.hashToken(refreshToken);

      // Find and revoke the specific token
      const storedToken = await this.refreshTokenRepository.findOne({
        where: {
          tokenHash,
          userId,
          isRevoked: false,
        },
      });

      if (storedToken) {
        await this.revokeRefreshToken(storedToken.id);
      }

      // Log logout
      await this.auditService.logLogout(userId, ipAddress, userAgent);

      this.logger.log(`User logged out: ${userId}`);
    } catch (error) {
      this.logger.error(`Logout failed for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Clean up expired refresh tokens (should be run periodically)
   */
  async cleanupExpiredTokens(): Promise<number> {
    try {
      const result = await this.refreshTokenRepository.delete({
        expiresAt: LessThan(new Date()),
      });

      const deletedCount = result.affected || 0;
      this.logger.log(`Cleaned up ${deletedCount} expired refresh tokens`);

      return deletedCount;
    } catch (error) {
      this.logger.error('Failed to cleanup expired tokens:', error);
      return 0;
    }
  }

  /**
   * Clean up revoked tokens older than specified days
   */
  async cleanupRevokedTokens(olderThanDays: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const result = await this.refreshTokenRepository.delete({
        isRevoked: true,
        createdAt: LessThan(cutoffDate),
      });

      const deletedCount = result.affected || 0;
      this.logger.log(`Cleaned up ${deletedCount} old revoked refresh tokens`);

      return deletedCount;
    } catch (error) {
      this.logger.error('Failed to cleanup revoked tokens:', error);
      return 0;
    }
  }

  /**
   * Get active refresh tokens for a user
   */
  async getUserActiveTokens(userId: string): Promise<RefreshToken[]> {
    return this.refreshTokenRepository.find({
      where: {
        userId,
        isRevoked: false,
        expiresAt: MoreThan(new Date()),
      },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Check if user has too many active tokens (potential security issue)
   */
  async checkTokenLimit(
    userId: string,
    maxTokens: number = 10,
  ): Promise<boolean> {
    const activeTokens = await this.getUserActiveTokens(userId);

    if (activeTokens.length > maxTokens) {
      await this.auditService.logSuspiciousActivity(
        'EXCESSIVE_TOKENS',
        userId,
        undefined,
        undefined,
        { tokenCount: activeTokens.length, limit: maxTokens },
      );
      return false;
    }

    return true;
  }

  /**
   * Hash token for secure storage
   */
  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /**
   * Calculate expiration date from duration string
   */
  private calculateExpirationDate(duration: string): Date {
    const now = new Date();

    // Parse duration (e.g., '7d', '24h', '60m')
    const match = duration.match(/^(\d+)([dhm])$/);
    if (!match) {
      // Default to 7 days if parsing fails
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    }

    const value = parseInt(match[1]);
    const unit = match[2];

    let milliseconds = 0;
    switch (unit) {
      case 'd':
        milliseconds = value * 24 * 60 * 60 * 1000;
        break;
      case 'h':
        milliseconds = value * 60 * 60 * 1000;
        break;
      case 'm':
        milliseconds = value * 60 * 1000;
        break;
      default:
        milliseconds = 7 * 24 * 60 * 60 * 1000; // Default 7 days
    }

    return new Date(now.getTime() + milliseconds);
  }
}
