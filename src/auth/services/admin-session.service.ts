import {
  Injectable,
  Logger,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { User } from '../../entities/user.entity';
import { RefreshToken } from '../../entities/refresh-token.entity';
import { UserRole } from '../../common/enums/user-role.enum';

/**
 * Admin Session Management Service
 *
 * Provides enhanced session management specifically for admin users with:
 * - Enhanced security validation
 * - Session monitoring and tracking
 * - Automatic session cleanup
 * - Suspicious activity detection
 */
@Injectable()
export class AdminSessionService {
  private readonly logger = new Logger(AdminSessionService.name);
  private readonly MAX_CONCURRENT_SESSIONS = 3;
  private readonly SUSPICIOUS_ACTIVITY_THRESHOLD = 5;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Validate admin session with enhanced security checks
   */
  async validateAdminSession(
    userId: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<boolean> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      this.logger.warn(
        `Admin session validation failed: User ${userId} not found`,
      );
      throw new UnauthorizedException('Invalid session');
    }

    // Verify admin role
    if (user.role !== UserRole.ADMIN) {
      this.logger.warn(
        `Non-admin user ${user.email} attempted to use admin session`,
      );
      throw new ForbiddenException('Admin privileges required');
    }

    // Check if account is active
    if (!user.isActive) {
      this.logger.warn(
        `Deactivated admin ${user.email} attempted session access`,
      );
      throw new ForbiddenException('Admin account deactivated');
    }

    // Check email verification
    if (!user.isEmailVerified) {
      this.logger.warn(
        `Unverified admin ${user.email} attempted session access`,
      );
      throw new ForbiddenException('Email verification required');
    }

    // Check for suspicious activity
    await this.checkSuspiciousActivity(userId);

    // Validate concurrent sessions
    await this.validateConcurrentSessions(userId);

    return true;
  }

  /**
   * Create admin session with enhanced security
   */
  async createAdminSession(
    userId: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<void> {
    await this.validateAdminSession(userId, ipAddress, userAgent);

    // Clean up expired sessions
    await this.cleanupExpiredSessions(userId);

    // Log session creation
    this.logger.log(
      `Admin session created for user ${userId} from IP: ${ipAddress}`,
    );
  }

  /**
   * Revoke admin session
   */
  async revokeAdminSession(
    userId: string,
    tokenId?: string,
    reason?: string,
  ): Promise<void> {
    if (tokenId) {
      // Revoke specific session
      const refreshToken = await this.refreshTokenRepository.findOne({
        where: { id: tokenId, userId },
      });

      if (refreshToken) {
        refreshToken.isRevoked = true;
        await this.refreshTokenRepository.save(refreshToken);
        this.logger.log(
          `Admin session ${tokenId} revoked for user ${userId}. Reason: ${reason || 'Manual revocation'}`,
        );
      }
    } else {
      // Revoke all sessions for user
      await this.refreshTokenRepository.update({ userId }, { isRevoked: true });
      this.logger.log(
        `All admin sessions revoked for user ${userId}. Reason: ${reason || 'Manual revocation'}`,
      );
    }
  }

  /**
   * Get active admin sessions for user
   */
  async getActiveAdminSessions(userId: string): Promise<RefreshToken[]> {
    return this.refreshTokenRepository.find({
      where: { userId, isRevoked: false },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Check for suspicious activity patterns
   */
  private async checkSuspiciousActivity(userId: string): Promise<void> {
    // Get recent sessions for this user
    const recentSessions = await this.refreshTokenRepository
      .createQueryBuilder('token')
      .where('token.userId = :userId', { userId })
      .andWhere('token.createdAt > :threshold', {
        threshold: new Date(Date.now() - 60 * 60 * 1000), // Last hour
      })
      .getMany();

    // Check for rapid session creation
    if (recentSessions.length > this.SUSPICIOUS_ACTIVITY_THRESHOLD) {
      this.logger.warn(
        `Suspicious activity detected for admin user ${userId}: ${recentSessions.length} sessions created in the last hour`,
      );
    }
  }

  /**
   * Validate concurrent session limits
   */
  private async validateConcurrentSessions(userId: string): Promise<void> {
    const activeSessions = await this.getActiveAdminSessions(userId);

    if (activeSessions.length >= this.MAX_CONCURRENT_SESSIONS) {
      // Revoke oldest session to make room for new one
      const oldestSession = activeSessions[activeSessions.length - 1];
      oldestSession.isRevoked = true;
      await this.refreshTokenRepository.save(oldestSession);

      this.logger.log(
        `Revoked oldest admin session for user ${userId} due to concurrent session limit`,
      );
    }
  }

  /**
   * Clean up expired sessions
   */
  private async cleanupExpiredSessions(userId: string): Promise<void> {
    const now = new Date();

    const result = await this.refreshTokenRepository
      .createQueryBuilder()
      .update()
      .set({ isRevoked: true })
      .where('userId = :userId', { userId })
      .andWhere('expiresAt < :now', { now })
      .execute();

    if (result.affected && result.affected > 0) {
      this.logger.debug(
        `Cleaned up ${result.affected} expired admin sessions for user ${userId}`,
      );
    }
  }

  /**
   * Get session statistics for monitoring
   */
  async getSessionStatistics(): Promise<{
    totalActiveSessions: number;
    adminSessions: number;
  }> {
    const [totalSessions, adminSessions] = await Promise.all([
      this.refreshTokenRepository.count({ where: { isRevoked: false } }),
      this.refreshTokenRepository
        .createQueryBuilder('token')
        .innerJoin('token.user', 'user')
        .where('user.role = :role', { role: UserRole.ADMIN })
        .andWhere('token.isRevoked = :isRevoked', { isRevoked: false })
        .getCount(),
    ]);

    return {
      totalActiveSessions: totalSessions,
      adminSessions,
    };
  }
}
