import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TokenManagementService } from './token-management.service';

@Injectable()
export class TokenCleanupService {
  private readonly logger = new Logger(TokenCleanupService.name);

  constructor(
    private readonly tokenManagementService: TokenManagementService,
  ) {}

  /**
   * Clean up expired tokens every hour
   */
  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpiredTokens(): Promise<void> {
    try {
      const deletedCount =
        await this.tokenManagementService.cleanupExpiredTokens();
      if (deletedCount > 0) {
        this.logger.log(`Cleaned up ${deletedCount} expired refresh tokens`);
      }
    } catch (error) {
      this.logger.error('Failed to cleanup expired tokens:', error);
    }
  }

  /**
   * Clean up old revoked tokens daily at 2 AM
   */
  @Cron('0 2 * * *')
  async cleanupRevokedTokens(): Promise<void> {
    try {
      const deletedCount =
        await this.tokenManagementService.cleanupRevokedTokens(30);
      if (deletedCount > 0) {
        this.logger.log(
          `Cleaned up ${deletedCount} old revoked refresh tokens`,
        );
      }
    } catch (error) {
      this.logger.error('Failed to cleanup revoked tokens:', error);
    }
  }
}
