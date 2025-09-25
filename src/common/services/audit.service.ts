import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Request } from 'express';
import { AuditLog } from '../../entities/audit-log.entity';

export interface AuditLogData {
  userId?: string | null;
  action: string;
  resource?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface AuditLogQuery {
  userId?: string;
  action?: string;
  resource?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

export interface AuditLogResult {
  logs: AuditLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Service for managing audit logs
 * Tracks all authentication and security-related events
 */
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
  async logEvent(data: AuditLogData): Promise<AuditLog> {
    try {
      const auditLog = this.auditLogRepository.create({
        userId: data.userId,
        action: data.action,
        resource: data.resource,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      });

      const savedLog = await this.auditLogRepository.save(auditLog);

      this.logger.debug(`Audit event logged: ${data.action}`, {
        userId: data.userId,
        resource: data.resource,
        ipAddress: data.ipAddress,
      });

      return savedLog;
    } catch (error) {
      this.logger.error('Failed to log audit event', error, {
        action: data.action,
        userId: data.userId,
      });
      throw error;
    }
  }

  /**
   * Log authentication events (login, logout, failed login, etc.)
   */
  async logAuthEvent(
    action: string,
    userId: string | null,
    request: Request,
    success: boolean = true,
  ): Promise<AuditLog> {
    const ipAddress = this.extractIpAddress(request);
    const userAgent = request.headers['user-agent'] || null;

    return this.logEvent({
      userId,
      action: `AUTH_${action.toUpperCase()}${success ? '_SUCCESS' : '_FAILED'}`,
      resource: 'authentication',
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log user management events (profile updates, role changes, etc.)
   */
  async logUserEvent(
    action: string,
    userId: string,
    targetUserId?: string,
    request?: Request,
  ): Promise<AuditLog> {
    const ipAddress = request ? this.extractIpAddress(request) : null;
    const userAgent = request ? request.headers['user-agent'] || null : null;

    return this.logEvent({
      userId,
      action: `USER_${action.toUpperCase()}`,
      resource: targetUserId ? `user:${targetUserId}` : 'user',
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log admin events (user management, system changes, etc.)
   */
  async logAdminEvent(
    action: string,
    adminUserId: string,
    targetResource: string,
    request: Request,
  ): Promise<AuditLog> {
    const ipAddress = this.extractIpAddress(request);
    const userAgent = request.headers['user-agent'] || null;

    return this.logEvent({
      userId: adminUserId,
      action: `ADMIN_${action.toUpperCase()}`,
      resource: targetResource,
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log security events (suspicious activity, rate limiting, etc.)
   */
  async logSecurityEvent(
    action: string,
    userId: string | null,
    request: Request,
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'MEDIUM',
  ): Promise<AuditLog> {
    const ipAddress = this.extractIpAddress(request);
    const userAgent = request.headers['user-agent'] || null;

    const auditLog = await this.logEvent({
      userId,
      action: `SECURITY_${action.toUpperCase()}`,
      resource: 'security',
      ipAddress,
      userAgent,
    });

    // Log security events at appropriate levels
    if (severity === 'CRITICAL' || severity === 'HIGH') {
      this.logger.error(`Security event: ${action}`, {
        userId,
        ipAddress,
        severity,
      });
    } else if (severity === 'MEDIUM') {
      this.logger.warn(`Security event: ${action}`, {
        userId,
        ipAddress,
        severity,
      });
    } else {
      this.logger.debug(`Security event: ${action}`, {
        userId,
        ipAddress,
        severity,
      });
    }

    return auditLog;
  }

  /**
   * Retrieve audit logs with filtering and pagination
   */
  async getAuditLogs(query: AuditLogQuery): Promise<AuditLogResult> {
    const {
      userId,
      action,
      resource,
      startDate,
      endDate,
      page = 1,
      limit = 50,
    } = query;

    const queryBuilder = this.auditLogRepository
      .createQueryBuilder('audit_log')
      .leftJoinAndSelect('audit_log.user', 'user')
      .orderBy('audit_log.createdAt', 'DESC');

    // Apply filters
    if (userId) {
      queryBuilder.andWhere('audit_log.userId = :userId', { userId });
    }

    if (action) {
      queryBuilder.andWhere('audit_log.action ILIKE :action', {
        action: `%${action}%`,
      });
    }

    if (resource) {
      queryBuilder.andWhere('audit_log.resource ILIKE :resource', {
        resource: `%${resource}%`,
      });
    }

    if (startDate) {
      queryBuilder.andWhere('audit_log.createdAt >= :startDate', { startDate });
    }

    if (endDate) {
      queryBuilder.andWhere('audit_log.createdAt <= :endDate', { endDate });
    }

    // Apply pagination
    const offset = (page - 1) * limit;
    queryBuilder.skip(offset).take(limit);

    const [logs, total] = await queryBuilder.getManyAndCount();

    return {
      logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get audit logs for a specific user
   */
  async getUserAuditLogs(
    userId: string,
    page: number = 1,
    limit: number = 50,
  ): Promise<AuditLogResult> {
    return this.getAuditLogs({ userId, page, limit });
  }

  /**
   * Get recent security events
   */
  async getRecentSecurityEvents(
    hours: number = 24,
    limit: number = 100,
  ): Promise<AuditLog[]> {
    const startDate = new Date();
    startDate.setHours(startDate.getHours() - hours);

    const result = await this.getAuditLogs({
      action: 'SECURITY_',
      startDate,
      limit,
    });

    return result.logs;
  }

  /**
   * Get authentication statistics
   */
  async getAuthStats(days: number = 7): Promise<{
    totalLogins: number;
    failedLogins: number;
    uniqueUsers: number;
    topIpAddresses: Array<{ ip: string; count: number }>;
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get total successful logins
    const totalLogins = await this.auditLogRepository.count({
      where: {
        action: 'AUTH_LOGIN_SUCCESS',
        createdAt: startDate,
      },
    });

    // Get failed logins
    const failedLogins = await this.auditLogRepository.count({
      where: {
        action: 'AUTH_LOGIN_FAILED',
        createdAt: startDate,
      },
    });

    // Get unique users who logged in
    const uniqueUsersResult = await this.auditLogRepository
      .createQueryBuilder('audit_log')
      .select('COUNT(DISTINCT audit_log.userId)', 'count')
      .where('audit_log.action = :action', { action: 'AUTH_LOGIN_SUCCESS' })
      .andWhere('audit_log.createdAt >= :startDate', { startDate })
      .andWhere('audit_log.userId IS NOT NULL')
      .getRawOne();

    const uniqueUsers = parseInt(uniqueUsersResult?.count || '0', 10);

    // Get top IP addresses
    const topIpAddressesResult = await this.auditLogRepository
      .createQueryBuilder('audit_log')
      .select('audit_log.ipAddress', 'ip')
      .addSelect('COUNT(*)', 'count')
      .where('audit_log.action LIKE :action', { action: 'AUTH_%' })
      .andWhere('audit_log.createdAt >= :startDate', { startDate })
      .andWhere('audit_log.ipAddress IS NOT NULL')
      .groupBy('audit_log.ipAddress')
      .orderBy('count', 'DESC')
      .limit(10)
      .getRawMany();

    const topIpAddresses = topIpAddressesResult.map((row) => ({
      ip: row.ip,
      count: parseInt(row.count, 10),
    }));

    return {
      totalLogins,
      failedLogins,
      uniqueUsers,
      topIpAddresses,
    };
  }

  /**
   * Clean up old audit logs (for maintenance)
   */
  async cleanupOldLogs(daysToKeep: number = 365): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.auditLogRepository
      .createQueryBuilder()
      .delete()
      .where('createdAt < :cutoffDate', { cutoffDate })
      .execute();

    const deletedCount = result.affected || 0;

    this.logger.log(
      `Cleaned up ${deletedCount} old audit logs older than ${daysToKeep} days`,
    );

    return deletedCount;
  }

  /**
   * Extract IP address from request, handling proxies
   */
  private extractIpAddress(request: Request): string | null {
    const forwarded = request.headers['x-forwarded-for'];

    if (forwarded) {
      // Handle comma-separated list of IPs (first one is the original client)
      const ips = Array.isArray(forwarded) ? forwarded[0] : forwarded;
      return ips.split(',')[0].trim();
    }

    return (
      (request.headers['x-real-ip'] as string) ||
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress ||
      request.ip ||
      null
    );
  }
}
