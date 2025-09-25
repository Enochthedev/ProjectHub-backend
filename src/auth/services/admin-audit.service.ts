import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminAuditLog } from '../../entities/admin-audit-log.entity';
import { User } from '../../entities/user.entity';

/**
 * Admin Audit Service
 *
 * Provides comprehensive audit logging for all administrative actions.
 * This service automatically tracks admin activities with detailed context
 * for security monitoring, compliance, and forensic analysis.
 */
@Injectable()
export class AdminAuditService {
  private readonly logger = new Logger(AdminAuditService.name);

  constructor(
    @InjectRepository(AdminAuditLog)
    private readonly adminAuditLogRepository: Repository<AdminAuditLog>,
  ) {}

  /**
   * Log an admin action with full context
   */
  async logAdminAction(params: {
    adminId: string;
    action: string;
    resourceType: string;
    resourceId?: string;
    description?: string;
    beforeState?: Record<string, any>;
    afterState?: Record<string, any>;
    metadata?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
    sessionId?: string;
    riskLevel?: 'low' | 'medium' | 'high' | 'critical';
    success?: boolean;
    errorMessage?: string;
    duration?: number;
  }): Promise<AdminAuditLog> {
    try {
      const auditLog = this.adminAuditLogRepository.create({
        adminId: params.adminId,
        action: params.action,
        resourceType: params.resourceType,
        resourceId: params.resourceId || null,
        description: params.description || null,
        beforeState: params.beforeState || null,
        afterState: params.afterState || null,
        metadata: params.metadata || null,
        ipAddress: params.ipAddress || null,
        userAgent: params.userAgent || null,
        sessionId: params.sessionId || null,
        riskLevel: params.riskLevel || 'medium',
        success: params.success !== undefined ? params.success : true,
        errorMessage: params.errorMessage || null,
        duration: params.duration || null,
      });

      const savedLog = await this.adminAuditLogRepository.save(auditLog);

      // Log high-risk actions for immediate attention
      if (savedLog.isHighRisk()) {
        this.logger.warn(
          `HIGH RISK admin action: ${savedLog.getSummary()} by admin ${params.adminId}`,
        );
      }

      return savedLog;
    } catch (error) {
      this.logger.error('Failed to log admin action:', error);
      throw error;
    }
  }

  /**
   * Log user management actions
   */
  async logUserManagement(params: {
    adminId: string;
    action:
      | 'create'
      | 'update'
      | 'delete'
      | 'activate'
      | 'deactivate'
      | 'reset_password';
    userId: string;
    beforeState?: Record<string, any>;
    afterState?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
    sessionId?: string;
  }): Promise<AdminAuditLog> {
    const riskLevel = this.determineUserManagementRisk(params.action);

    return this.logAdminAction({
      ...params,
      resourceType: 'user',
      resourceId: params.userId,
      description: `Admin ${params.action} user ${params.userId}`,
      riskLevel,
    });
  }

  /**
   * Log project management actions
   */
  async logProjectManagement(params: {
    adminId: string;
    action: 'approve' | 'reject' | 'reassign' | 'moderate' | 'bulk_update';
    projectId: string;
    beforeState?: Record<string, any>;
    afterState?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
    sessionId?: string;
  }): Promise<AdminAuditLog> {
    const riskLevel = this.determineProjectManagementRisk(params.action);

    return this.logAdminAction({
      ...params,
      resourceType: 'project',
      resourceId: params.projectId,
      description: `Admin ${params.action} project ${params.projectId}`,
      riskLevel,
    });
  }

  /**
   * Log system configuration changes
   */
  async logSystemConfiguration(params: {
    adminId: string;
    action: 'create' | 'update' | 'delete';
    configKey: string;
    beforeState?: Record<string, any>;
    afterState?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
    sessionId?: string;
  }): Promise<AdminAuditLog> {
    return this.logAdminAction({
      ...params,
      resourceType: 'system_config',
      resourceId: params.configKey,
      description: `Admin ${params.action} system configuration ${params.configKey}`,
      riskLevel: 'high', // System config changes are always high risk
    });
  }

  /**
   * Log security-related actions
   */
  async logSecurityAction(params: {
    adminId: string;
    action: string;
    resourceType: string;
    resourceId?: string;
    description: string;
    metadata?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
    sessionId?: string;
  }): Promise<AdminAuditLog> {
    return this.logAdminAction({
      ...params,
      riskLevel: 'critical', // Security actions are always critical
    });
  }

  /**
   * Log bulk operations
   */
  async logBulkOperation(params: {
    adminId: string;
    action: string;
    resourceType: string;
    affectedCount: number;
    metadata?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
    sessionId?: string;
  }): Promise<AdminAuditLog> {
    return this.logAdminAction({
      ...params,
      resourceId: `bulk_${params.affectedCount}`,
      description: `Admin performed bulk ${params.action} on ${params.affectedCount} ${params.resourceType}s`,
      riskLevel: params.affectedCount > 10 ? 'high' : 'medium',
    });
  }

  /**
   * Get audit logs for a specific admin
   */
  async getAdminAuditLogs(
    adminId: string,
    options?: {
      limit?: number;
      offset?: number;
      startDate?: Date;
      endDate?: Date;
      action?: string;
      resourceType?: string;
      riskLevel?: string;
    },
  ): Promise<{ logs: AdminAuditLog[]; total: number }> {
    const queryBuilder = this.adminAuditLogRepository
      .createQueryBuilder('log')
      .where('log.adminId = :adminId', { adminId })
      .leftJoinAndSelect('log.admin', 'admin');

    if (options?.startDate) {
      queryBuilder.andWhere('log.createdAt >= :startDate', {
        startDate: options.startDate,
      });
    }

    if (options?.endDate) {
      queryBuilder.andWhere('log.createdAt <= :endDate', {
        endDate: options.endDate,
      });
    }

    if (options?.action) {
      queryBuilder.andWhere('log.action = :action', { action: options.action });
    }

    if (options?.resourceType) {
      queryBuilder.andWhere('log.resourceType = :resourceType', {
        resourceType: options.resourceType,
      });
    }

    if (options?.riskLevel) {
      queryBuilder.andWhere('log.riskLevel = :riskLevel', {
        riskLevel: options.riskLevel,
      });
    }

    const total = await queryBuilder.getCount();

    queryBuilder
      .orderBy('log.createdAt', 'DESC')
      .limit(options?.limit || 50)
      .offset(options?.offset || 0);

    const logs = await queryBuilder.getMany();

    return { logs, total };
  }

  /**
   * Get high-risk audit logs for security monitoring
   */
  async getHighRiskAuditLogs(options?: {
    limit?: number;
    offset?: number;
    startDate?: Date;
    endDate?: Date;
  }): Promise<{ logs: AdminAuditLog[]; total: number }> {
    const queryBuilder = this.adminAuditLogRepository
      .createQueryBuilder('log')
      .where('log.riskLevel IN (:...riskLevels)', {
        riskLevels: ['high', 'critical'],
      })
      .leftJoinAndSelect('log.admin', 'admin');

    if (options?.startDate) {
      queryBuilder.andWhere('log.createdAt >= :startDate', {
        startDate: options.startDate,
      });
    }

    if (options?.endDate) {
      queryBuilder.andWhere('log.createdAt <= :endDate', {
        endDate: options.endDate,
      });
    }

    const total = await queryBuilder.getCount();

    queryBuilder
      .orderBy('log.createdAt', 'DESC')
      .limit(options?.limit || 50)
      .offset(options?.offset || 0);

    const logs = await queryBuilder.getMany();

    return { logs, total };
  }

  /**
   * Get audit statistics
   */
  async getAuditStatistics(
    startDate?: Date,
    endDate?: Date,
  ): Promise<{
    totalActions: number;
    actionsByRiskLevel: Record<string, number>;
    actionsByType: Record<string, number>;
    failedActions: number;
    topAdmins: Array<{ adminId: string; actionCount: number }>;
  }> {
    const queryBuilder = this.adminAuditLogRepository.createQueryBuilder('log');

    if (startDate) {
      queryBuilder.andWhere('log.createdAt >= :startDate', { startDate });
    }

    if (endDate) {
      queryBuilder.andWhere('log.createdAt <= :endDate', { endDate });
    }

    const [
      totalActions,
      riskLevelStats,
      resourceTypeStats,
      failedActions,
      topAdmins,
    ] = await Promise.all([
      queryBuilder.getCount(),
      queryBuilder
        .select('log.riskLevel', 'riskLevel')
        .addSelect('COUNT(*)', 'count')
        .groupBy('log.riskLevel')
        .getRawMany(),
      queryBuilder
        .select('log.resourceType', 'resourceType')
        .addSelect('COUNT(*)', 'count')
        .groupBy('log.resourceType')
        .getRawMany(),
      queryBuilder
        .andWhere('log.success = :success', { success: false })
        .getCount(),
      queryBuilder
        .select('log.adminId', 'adminId')
        .addSelect('COUNT(*)', 'actionCount')
        .groupBy('log.adminId')
        .orderBy('COUNT(*)', 'DESC')
        .limit(10)
        .getRawMany(),
    ]);

    return {
      totalActions,
      actionsByRiskLevel: riskLevelStats.reduce(
        (acc, stat) => ({ ...acc, [stat.riskLevel]: parseInt(stat.count) }),
        {},
      ),
      actionsByType: resourceTypeStats.reduce(
        (acc, stat) => ({ ...acc, [stat.resourceType]: parseInt(stat.count) }),
        {},
      ),
      failedActions,
      topAdmins: topAdmins.map((admin) => ({
        adminId: admin.adminId,
        actionCount: parseInt(admin.actionCount),
      })),
    };
  }

  /**
   * Determine risk level for user management actions
   */
  private determineUserManagementRisk(
    action:
      | 'create'
      | 'update'
      | 'delete'
      | 'activate'
      | 'deactivate'
      | 'reset_password',
  ): 'low' | 'medium' | 'high' | 'critical' {
    switch (action) {
      case 'delete':
        return 'critical';
      case 'deactivate':
      case 'reset_password':
        return 'high';
      case 'create':
      case 'activate':
        return 'medium';
      case 'update':
        return 'low';
      default:
        return 'medium';
    }
  }

  /**
   * Determine risk level for project management actions
   */
  private determineProjectManagementRisk(
    action: 'approve' | 'reject' | 'reassign' | 'moderate' | 'bulk_update',
  ): 'low' | 'medium' | 'high' | 'critical' {
    switch (action) {
      case 'bulk_update':
        return 'high';
      case 'reassign':
        return 'medium';
      case 'approve':
      case 'reject':
      case 'moderate':
        return 'low';
      default:
        return 'medium';
    }
  }
}
