import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../../entities/audit-log.entity';

export interface AuditLogData {
  userId?: string;
  action: string;
  resource?: string;
  ipAddress?: string;
  userAgent?: string;
  details?: any;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  /**
   * Log an audit event
   */
  async logEvent(data: AuditLogData): Promise<void> {
    try {
      const auditLog = this.auditLogRepository.create({
        userId: data.userId || null,
        action: data.action,
        resource: data.resource || null,
        ipAddress: data.ipAddress || null,
        userAgent: data.userAgent || null,
      });

      await this.auditLogRepository.save(auditLog);

      this.logger.log(
        `Audit event logged: ${data.action} for user ${data.userId || 'anonymous'}`,
      );
    } catch (error) {
      this.logger.error(`Failed to log audit event: ${data.action}`, error);
      // Don't throw error to avoid breaking the main flow
    }
  }

  /**
   * Log successful login
   */
  async logLoginSuccess(
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    await this.logEvent({
      userId,
      action: 'LOGIN_SUCCESS',
      resource: 'auth',
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log failed login attempt
   */
  async logLoginFailure(
    email: string,
    reason: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    await this.logEvent({
      action: 'LOGIN_FAILURE',
      resource: 'auth',
      ipAddress,
      userAgent,
      details: { email, reason },
    });
  }

  /**
   * Log user registration
   */
  async logRegistration(
    userId: string,
    role: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    await this.logEvent({
      userId,
      action: 'USER_REGISTRATION',
      resource: 'auth',
      ipAddress,
      userAgent,
      details: { role },
    });
  }

  /**
   * Log email verification
   */
  async logEmailVerification(
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    await this.logEvent({
      userId,
      action: 'EMAIL_VERIFICATION',
      resource: 'auth',
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log password reset request
   */
  async logPasswordResetRequest(
    email: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    await this.logEvent({
      action: 'PASSWORD_RESET_REQUEST',
      resource: 'auth',
      ipAddress,
      userAgent,
      details: { email },
    });
  }

  /**
   * Log password reset completion
   */
  async logPasswordResetComplete(
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    await this.logEvent({
      userId,
      action: 'PASSWORD_RESET_COMPLETE',
      resource: 'auth',
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log token refresh
   */
  async logTokenRefresh(
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    await this.logEvent({
      userId,
      action: 'TOKEN_REFRESH',
      resource: 'auth',
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log logout
   */
  async logLogout(
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    await this.logEvent({
      userId,
      action: 'LOGOUT',
      resource: 'auth',
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log suspicious activity
   */
  async logSuspiciousActivity(
    action: string,
    userId?: string,
    ipAddress?: string,
    userAgent?: string,
    details?: any,
  ): Promise<void> {
    await this.logEvent({
      userId,
      action: `SUSPICIOUS_${action}`,
      resource: 'security',
      ipAddress,
      userAgent,
      details,
    });
  }

  /**
   * Get audit logs for a user (admin function)
   */
  async getUserAuditLogs(
    userId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<{ logs: AuditLog[]; total: number }> {
    const [logs, total] = await this.auditLogRepository.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });

    return { logs, total };
  }

  /**
   * Get recent audit logs (admin function)
   */
  async getRecentAuditLogs(
    limit: number = 100,
    offset: number = 0,
  ): Promise<{ logs: AuditLog[]; total: number }> {
    const [logs, total] = await this.auditLogRepository.findAndCount({
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
      relations: ['user'],
    });

    return { logs, total };
  }

  /**
   * Get failed login attempts for security monitoring
   */
  async getFailedLoginAttempts(
    timeWindow: Date,
    ipAddress?: string,
  ): Promise<AuditLog[]> {
    const query = this.auditLogRepository
      .createQueryBuilder('audit')
      .where('audit.action = :action', { action: 'LOGIN_FAILURE' })
      .andWhere('audit.createdAt >= :timeWindow', { timeWindow });

    if (ipAddress) {
      query.andWhere('audit.ipAddress = :ipAddress', { ipAddress });
    }

    return query.orderBy('audit.createdAt', 'DESC').getMany();
  }
}
