import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Request } from 'express';
import { AdminAuditLog } from '../entities/admin-audit-log.entity';

/**
 * Admin Audit Service
 *
 * Specialized audit service for administrative actions with detailed tracking
 */
@Injectable()
export class AdminAuditService {
  private readonly logger = new Logger(AdminAuditService.name);

  constructor(
    @InjectRepository(AdminAuditLog)
    private readonly adminAuditRepository: Repository<AdminAuditLog>,
  ) {}

  /**
   * Log administrative action
   */
  async logAdminAction(
    adminId: string,
    action: string,
    resourceType: string,
    resourceId?: string,
    beforeState?: any,
    afterState?: any,
    request?: Request,
  ): Promise<AdminAuditLog> {
    try {
      const auditLog = this.adminAuditRepository.create({
        adminId,
        action,
        resourceType,
        resourceId: resourceId || null,
        beforeState,
        afterState,
        ipAddress: this.extractIpAddress(request),
        userAgent: request?.headers['user-agent'] || null,
        success: true,
        riskLevel: this.determineRiskLevel(action, resourceType),
      });

      const savedLog = await this.adminAuditRepository.save(auditLog);

      this.logger.debug(`Admin action logged: ${action} on ${resourceType}`, {
        adminId,
        resourceId,
        action,
      });

      return savedLog;
    } catch (error) {
      this.logger.error('Failed to log admin action', error, {
        adminId,
        action,
        resourceType,
      });
      throw error;
    }
  }

  /**
   * Log failed administrative action
   */
  async logFailedAction(
    adminId: string,
    action: string,
    resourceType: string,
    error: string,
    request?: Request,
  ): Promise<AdminAuditLog> {
    try {
      const auditLog = this.adminAuditRepository.create({
        adminId,
        action,
        resourceType,
        success: false,
        errorMessage: error,
        ipAddress: this.extractIpAddress(request),
        userAgent: request?.headers['user-agent'] || null,
        riskLevel: this.determineRiskLevel(action, resourceType),
      });

      const savedLog = await this.adminAuditRepository.save(auditLog);

      this.logger.warn(`Admin action failed: ${action} on ${resourceType}`, {
        adminId,
        error,
      });

      return savedLog;
    } catch (logError) {
      this.logger.error('Failed to log admin action failure', logError, {
        adminId,
        action,
        resourceType,
        originalError: error,
      });
      throw logError;
    }
  }

  /**
   * Log access denied event
   */
  async logAccessDenied(
    adminId: string | undefined,
    request: Request,
  ): Promise<AdminAuditLog> {
    return this.logFailedAction(
      adminId || 'unknown',
      'access_denied',
      'admin_panel',
      'Insufficient permissions or invalid credentials',
      request,
    );
  }

  /**
   * Log insufficient permissions
   */
  async logInsufficientPermissions(
    adminId: string,
    requiredPermissions: string[],
    request: Request,
  ): Promise<AdminAuditLog> {
    return this.logFailedAction(
      adminId,
      'insufficient_permissions',
      'admin_panel',
      `Required permissions: ${requiredPermissions.join(', ')}`,
      request,
    );
  }

  /**
   * Get admin audit logs with filtering
   */
  async getAdminAuditLogs(filters: {
    adminId?: string;
    action?: string;
    resourceType?: string;
    success?: boolean;
    riskLevel?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }) {
    const {
      adminId,
      action,
      resourceType,
      success,
      riskLevel,
      startDate,
      endDate,
      page = 1,
      limit = 50,
    } = filters;

    const queryBuilder = this.adminAuditRepository
      .createQueryBuilder('audit')
      .leftJoinAndSelect('audit.admin', 'admin')
      .orderBy('audit.createdAt', 'DESC');

    if (adminId) {
      queryBuilder.andWhere('audit.adminId = :adminId', { adminId });
    }

    if (action) {
      queryBuilder.andWhere('audit.action ILIKE :action', {
        action: `%${action}%`,
      });
    }

    if (resourceType) {
      queryBuilder.andWhere('audit.resourceType ILIKE :resourceType', {
        resourceType: `%${resourceType}%`,
      });
    }

    if (success !== undefined) {
      queryBuilder.andWhere('audit.success = :success', { success });
    }

    if (riskLevel) {
      queryBuilder.andWhere('audit.riskLevel = :riskLevel', { riskLevel });
    }

    if (startDate) {
      queryBuilder.andWhere('audit.createdAt >= :startDate', { startDate });
    }

    if (endDate) {
      queryBuilder.andWhere('audit.createdAt <= :endDate', { endDate });
    }

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
   * Get admin activity summary
   */
  async getAdminActivitySummary(adminId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [totalActions, successfulActions, failedActions, resourceCounts] =
      await Promise.all([
        this.adminAuditRepository.count({
          where: { adminId, createdAt: startDate },
        }),
        this.adminAuditRepository.count({
          where: { adminId, success: true, createdAt: startDate },
        }),
        this.adminAuditRepository.count({
          where: { adminId, success: false, createdAt: startDate },
        }),
        this.adminAuditRepository
          .createQueryBuilder('audit')
          .select('audit.resourceType', 'resourceType')
          .addSelect('COUNT(*)', 'count')
          .where('audit.adminId = :adminId', { adminId })
          .andWhere('audit.createdAt >= :startDate', { startDate })
          .groupBy('audit.resourceType')
          .orderBy('count', 'DESC')
          .getRawMany(),
      ]);

    return {
      totalActions,
      successfulActions,
      failedActions,
      successRate:
        totalActions > 0 ? (successfulActions / totalActions) * 100 : 0,
      resourceActivity: resourceCounts.map((row) => ({
        resourceType: row.resourceType,
        count: parseInt(row.count, 10),
      })),
    };
  }

  /**
   * Determine risk level based on action and resource type
   */
  private determineRiskLevel(
    action: string,
    resourceType: string,
  ): 'low' | 'medium' | 'high' | 'critical' {
    // Critical actions
    if (
      action.includes('delete') ||
      action.includes('remove') ||
      action.includes('purge')
    ) {
      return 'critical';
    }

    // High risk actions
    if (
      action.includes('create') ||
      action.includes('update') ||
      action.includes('modify')
    ) {
      if (
        resourceType.includes('user') ||
        resourceType.includes('admin') ||
        resourceType.includes('security')
      ) {
        return 'high';
      }
    }

    // Medium risk actions
    if (
      action.includes('approve') ||
      action.includes('reject') ||
      action.includes('assign')
    ) {
      return 'medium';
    }

    // Default to low risk
    return 'low';
  }

  /**
   * Extract IP address from request
   */
  private extractIpAddress(request?: Request): string | null {
    if (!request) return null;

    const forwarded = request.headers['x-forwarded-for'];
    if (forwarded) {
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
