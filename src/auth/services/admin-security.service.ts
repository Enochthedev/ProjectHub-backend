import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { AdminAuditLog } from '../../entities/admin-audit-log.entity';
import { User } from '../../entities/user.entity';
import { AdminSecurityViolationException } from '../../common/exceptions/admin.exception';
import { AdminAuditService } from './admin-audit.service';

/**
 * Admin Security Monitoring Service
 *
 * Provides comprehensive security monitoring for admin activities including:
 * - Suspicious activity detection
 * - Threat response mechanisms
 * - Security policy enforcement
 * - Real-time monitoring and alerting
 */
@Injectable()
export class AdminSecurityService {
  private readonly logger = new Logger(AdminSecurityService.name);

  // Security thresholds
  private readonly FAILED_LOGIN_THRESHOLD = 5;
  private readonly FAILED_LOGIN_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
  private readonly HIGH_RISK_ACTION_THRESHOLD = 10;
  private readonly HIGH_RISK_ACTION_WINDOW_MS = 60 * 60 * 1000; // 1 hour
  private readonly IP_CHANGE_THRESHOLD = 3;
  private readonly IP_CHANGE_WINDOW_MS = 30 * 60 * 1000; // 30 minutes
  private readonly BULK_OPERATION_THRESHOLD = 50;
  private readonly SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

  constructor(
    @InjectRepository(AdminAuditLog)
    private readonly adminAuditLogRepository: Repository<AdminAuditLog>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly adminAuditService: AdminAuditService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Monitor admin login attempts for suspicious patterns
   */
  async monitorLoginAttempt(
    adminId: string,
    ipAddress: string,
    userAgent: string,
    success: boolean,
  ): Promise<void> {
    // Log the login attempt
    await this.adminAuditService.logSecurityAction({
      adminId,
      action: success ? 'login_success' : 'login_failure',
      resourceType: 'admin_session',
      description: `Admin login ${success ? 'successful' : 'failed'} from ${ipAddress}`,
      metadata: { ipAddress, userAgent, success },
      ipAddress,
      userAgent,
    });

    if (!success) {
      await this.checkFailedLoginPattern(adminId, ipAddress);
    } else {
      await this.checkIPAddressPattern(adminId, ipAddress);
    }
  }

  /**
   * Monitor admin actions for suspicious patterns
   */
  async monitorAdminAction(
    adminId: string,
    action: string,
    resourceType: string,
    resourceId?: string,
    riskLevel?: 'low' | 'medium' | 'high' | 'critical',
    metadata?: Record<string, any>,
  ): Promise<void> {
    // Check for high-risk action patterns
    if (riskLevel === 'high' || riskLevel === 'critical') {
      await this.checkHighRiskActionPattern(adminId, action, resourceType);
    }

    // Check for bulk operation patterns
    if (
      action.includes('bulk') ||
      (metadata?.affectedCount &&
        metadata.affectedCount > this.BULK_OPERATION_THRESHOLD)
    ) {
      await this.checkBulkOperationPattern(
        adminId,
        action,
        metadata?.affectedCount,
      );
    }

    // Check for privilege escalation attempts
    if (
      resourceType === 'user' &&
      (action === 'create' || action === 'update')
    ) {
      await this.checkPrivilegeEscalationPattern(
        adminId,
        action,
        resourceId,
        metadata,
      );
    }

    // Check for data exfiltration patterns
    if (
      action.includes('export') ||
      action.includes('download') ||
      action.includes('backup')
    ) {
      await this.checkDataExfiltrationPattern(
        adminId,
        action,
        resourceType,
        metadata,
      );
    }
  }

  /**
   * Detect and respond to security threats
   */
  async detectAndRespondToThreats(adminId: string): Promise<{
    threatsDetected: string[];
    actionsRequired: string[];
    riskScore: number;
  }> {
    const threats: string[] = [];
    const actions: string[] = [];
    let riskScore = 0;

    // Check recent activity patterns
    const recentLogs = await this.getRecentAdminLogs(
      adminId,
      24 * 60 * 60 * 1000,
    ); // Last 24 hours

    // Analyze failed login attempts
    const failedLogins = recentLogs.filter(
      (log) => log.action === 'login_failure' && !log.success,
    );
    if (failedLogins.length >= this.FAILED_LOGIN_THRESHOLD) {
      threats.push('excessive_failed_logins');
      actions.push('temporary_account_lock');
      riskScore += 30;
    }

    // Analyze high-risk actions
    const highRiskActions = recentLogs.filter(
      (log) => log.riskLevel === 'high' || log.riskLevel === 'critical',
    );
    if (highRiskActions.length >= this.HIGH_RISK_ACTION_THRESHOLD) {
      threats.push('excessive_high_risk_actions');
      actions.push('require_additional_authentication');
      riskScore += 40;
    }

    // Analyze IP address changes
    const uniqueIPs = new Set(
      recentLogs.map((log) => log.ipAddress).filter(Boolean),
    );
    if (uniqueIPs.size >= this.IP_CHANGE_THRESHOLD) {
      threats.push('multiple_ip_addresses');
      actions.push('verify_admin_identity');
      riskScore += 25;
    }

    // Analyze bulk operations
    const bulkOperations = recentLogs.filter(
      (log) =>
        log.action.includes('bulk') ||
        log.metadata?.affectedCount > this.BULK_OPERATION_THRESHOLD,
    );
    if (bulkOperations.length > 0) {
      threats.push('bulk_operations_detected');
      actions.push('review_bulk_operations');
      riskScore += 20;
    }

    // Analyze off-hours activity
    const offHoursActivity = recentLogs.filter((log) => {
      const hour = log.createdAt.getHours();
      return hour < 6 || hour > 22; // Outside 6 AM - 10 PM
    });
    if (offHoursActivity.length > 5) {
      threats.push('off_hours_activity');
      actions.push('verify_admin_authorization');
      riskScore += 15;
    }

    // Log threat detection results
    if (threats.length > 0) {
      await this.adminAuditService.logSecurityAction({
        adminId,
        action: 'threat_detection',
        resourceType: 'security_monitoring',
        description: `Security threats detected: ${threats.join(', ')}`,
        metadata: {
          threats,
          actions,
          riskScore,
          analysisTimestamp: new Date(),
        },
      });

      this.logger.warn(
        `Security threats detected for admin ${adminId}: ${threats.join(', ')} (Risk Score: ${riskScore})`,
      );
    }

    return {
      threatsDetected: threats,
      actionsRequired: actions,
      riskScore,
    };
  }

  /**
   * Automatically respond to detected threats
   */
  async respondToThreat(
    adminId: string,
    threatType: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    metadata?: Record<string, any>,
  ): Promise<void> {
    const responseActions: string[] = [];

    switch (threatType) {
      case 'excessive_failed_logins':
        if (severity === 'high' || severity === 'critical') {
          await this.temporarilyLockAdmin(adminId, 'excessive_failed_logins');
          responseActions.push('admin_account_locked');
        }
        break;

      case 'suspicious_ip_activity':
        if (severity === 'high' || severity === 'critical') {
          await this.requireAdditionalAuthentication(
            adminId,
            'suspicious_ip_activity',
          );
          responseActions.push('additional_auth_required');
        }
        break;

      case 'bulk_operations_detected':
        if (severity === 'medium' || severity === 'high') {
          await this.flagForReview(adminId, 'bulk_operations', metadata);
          responseActions.push('flagged_for_review');
        }
        break;

      case 'privilege_escalation_attempt':
        if (severity === 'high' || severity === 'critical') {
          await this.temporarilyLockAdmin(
            adminId,
            'privilege_escalation_attempt',
          );
          await this.alertSecurityTeam(adminId, threatType, severity, metadata);
          responseActions.push('admin_locked_security_alerted');
        }
        break;

      case 'data_exfiltration_pattern':
        if (severity === 'critical') {
          await this.temporarilyLockAdmin(adminId, 'data_exfiltration_pattern');
          await this.alertSecurityTeam(adminId, threatType, severity, metadata);
          responseActions.push('admin_locked_security_alerted');
        }
        break;
    }

    // Log the threat response
    await this.adminAuditService.logSecurityAction({
      adminId,
      action: 'threat_response',
      resourceType: 'security_monitoring',
      description: `Automatic threat response for ${threatType}`,
      metadata: {
        threatType,
        severity,
        responseActions,
        originalMetadata: metadata,
      },
    });

    this.logger.warn(
      `Threat response executed for admin ${adminId}: ${threatType} (${severity}) - Actions: ${responseActions.join(', ')}`,
    );
  }

  /**
   * Get security metrics for monitoring dashboard
   */
  async getSecurityMetrics(
    timeWindowMs: number = 24 * 60 * 60 * 1000,
  ): Promise<{
    totalAdminActions: number;
    highRiskActions: number;
    failedLogins: number;
    uniqueAdmins: number;
    threatsDetected: number;
    averageRiskScore: number;
  }> {
    const startTime = new Date(Date.now() - timeWindowMs);

    const [
      totalActions,
      highRiskActions,
      failedLogins,
      uniqueAdmins,
      threatDetections,
    ] = await Promise.all([
      this.adminAuditLogRepository.count({
        where: { createdAt: { $gte: startTime } as any },
      }),
      this.adminAuditLogRepository.count({
        where: {
          createdAt: { $gte: startTime } as any,
          riskLevel: { $in: ['high', 'critical'] } as any,
        },
      }),
      this.adminAuditLogRepository.count({
        where: {
          createdAt: { $gte: startTime } as any,
          action: 'login_failure',
          success: false,
        },
      }),
      this.adminAuditLogRepository
        .createQueryBuilder('log')
        .select('COUNT(DISTINCT log.adminId)', 'count')
        .where('log.createdAt >= :startTime', { startTime })
        .getRawOne(),
      this.adminAuditLogRepository.count({
        where: {
          createdAt: { $gte: startTime } as any,
          action: 'threat_detection',
        },
      }),
    ]);

    // Calculate average risk score (simplified)
    const riskScoreSum = highRiskActions * 30 + failedLogins * 10;
    const averageRiskScore = totalActions > 0 ? riskScoreSum / totalActions : 0;

    return {
      totalAdminActions: totalActions,
      highRiskActions,
      failedLogins,
      uniqueAdmins: parseInt(uniqueAdmins?.count || '0'),
      threatsDetected: threatDetections,
      averageRiskScore: Math.round(averageRiskScore * 100) / 100,
    };
  }

  /**
   * Check for failed login patterns
   */
  private async checkFailedLoginPattern(
    adminId: string,
    ipAddress: string,
  ): Promise<void> {
    const recentFailedLogins = await this.adminAuditLogRepository.count({
      where: {
        adminId,
        action: 'login_failure',
        success: false,
        createdAt: {
          $gte: new Date(Date.now() - this.FAILED_LOGIN_WINDOW_MS),
        } as any,
      },
    });

    if (recentFailedLogins >= this.FAILED_LOGIN_THRESHOLD) {
      throw new AdminSecurityViolationException(
        'Excessive failed login attempts detected',
        adminId,
        'rate_limit',
        'login_failure',
        'admin_session',
        undefined,
        {
          failedAttempts: recentFailedLogins,
          ipAddress,
          timeWindow: this.FAILED_LOGIN_WINDOW_MS,
        },
      );
    }
  }

  /**
   * Check for IP address change patterns
   */
  private async checkIPAddressPattern(
    adminId: string,
    currentIP: string,
  ): Promise<void> {
    const recentLogs = await this.getRecentAdminLogs(
      adminId,
      this.IP_CHANGE_WINDOW_MS,
    );
    const uniqueIPs = new Set(
      recentLogs.map((log) => log.ipAddress).filter(Boolean),
    );

    if (
      uniqueIPs.size >= this.IP_CHANGE_THRESHOLD &&
      !uniqueIPs.has(currentIP)
    ) {
      await this.respondToThreat(adminId, 'suspicious_ip_activity', 'high', {
        currentIP,
        recentIPs: Array.from(uniqueIPs),
        timeWindow: this.IP_CHANGE_WINDOW_MS,
      });
    }
  }

  /**
   * Check for high-risk action patterns
   */
  private async checkHighRiskActionPattern(
    adminId: string,
    action: string,
    resourceType: string,
  ): Promise<void> {
    const recentHighRiskActions = await this.adminAuditLogRepository.count({
      where: {
        adminId,
        riskLevel: { $in: ['high', 'critical'] } as any,
        createdAt: {
          $gte: new Date(Date.now() - this.HIGH_RISK_ACTION_WINDOW_MS),
        } as any,
      },
    });

    if (recentHighRiskActions >= this.HIGH_RISK_ACTION_THRESHOLD) {
      await this.respondToThreat(
        adminId,
        'excessive_high_risk_actions',
        'high',
        {
          currentAction: action,
          resourceType,
          recentHighRiskCount: recentHighRiskActions,
          timeWindow: this.HIGH_RISK_ACTION_WINDOW_MS,
        },
      );
    }
  }

  /**
   * Check for bulk operation patterns
   */
  private async checkBulkOperationPattern(
    adminId: string,
    action: string,
    affectedCount?: number,
  ): Promise<void> {
    if (affectedCount && affectedCount > this.BULK_OPERATION_THRESHOLD) {
      await this.respondToThreat(
        adminId,
        'bulk_operations_detected',
        'medium',
        {
          action,
          affectedCount,
          threshold: this.BULK_OPERATION_THRESHOLD,
        },
      );
    }
  }

  /**
   * Check for privilege escalation patterns
   */
  private async checkPrivilegeEscalationPattern(
    adminId: string,
    action: string,
    resourceId?: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    // Check if admin is trying to create/modify other admin accounts
    if (metadata?.role === 'admin' || metadata?.afterState?.role === 'admin') {
      await this.respondToThreat(
        adminId,
        'privilege_escalation_attempt',
        'critical',
        {
          action,
          targetUserId: resourceId,
          metadata,
        },
      );
    }
  }

  /**
   * Check for data exfiltration patterns
   */
  private async checkDataExfiltrationPattern(
    adminId: string,
    action: string,
    resourceType: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    const dataSize = metadata?.dataSize || metadata?.recordCount || 0;
    const largeDataThreshold = 10000; // 10k records or equivalent

    if (dataSize > largeDataThreshold) {
      await this.respondToThreat(
        adminId,
        'data_exfiltration_pattern',
        'critical',
        {
          action,
          resourceType,
          dataSize,
          threshold: largeDataThreshold,
        },
      );
    }
  }

  /**
   * Get recent admin logs for analysis
   */
  private async getRecentAdminLogs(
    adminId: string,
    timeWindowMs: number,
  ): Promise<AdminAuditLog[]> {
    return this.adminAuditLogRepository.find({
      where: {
        adminId,
        createdAt: { $gte: new Date(Date.now() - timeWindowMs) } as any,
      },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Temporarily lock admin account
   */
  private async temporarilyLockAdmin(
    adminId: string,
    reason: string,
  ): Promise<void> {
    // This would integrate with the user management system
    // For now, we'll just log the action
    this.logger.warn(
      `Admin account ${adminId} temporarily locked due to: ${reason}`,
    );

    await this.adminAuditService.logSecurityAction({
      adminId,
      action: 'admin_account_locked',
      resourceType: 'admin_account',
      resourceId: adminId,
      description: `Admin account temporarily locked due to: ${reason}`,
      metadata: { reason, lockTimestamp: new Date() },
    });
  }

  /**
   * Require additional authentication for admin
   */
  private async requireAdditionalAuthentication(
    adminId: string,
    reason: string,
  ): Promise<void> {
    this.logger.warn(
      `Additional authentication required for admin ${adminId} due to: ${reason}`,
    );

    await this.adminAuditService.logSecurityAction({
      adminId,
      action: 'additional_auth_required',
      resourceType: 'admin_session',
      resourceId: adminId,
      description: `Additional authentication required due to: ${reason}`,
      metadata: { reason, timestamp: new Date() },
    });
  }

  /**
   * Flag admin activity for manual review
   */
  private async flagForReview(
    adminId: string,
    reviewType: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    this.logger.warn(`Admin ${adminId} flagged for review: ${reviewType}`);

    await this.adminAuditService.logSecurityAction({
      adminId,
      action: 'flagged_for_review',
      resourceType: 'security_review',
      resourceId: adminId,
      description: `Admin activity flagged for review: ${reviewType}`,
      metadata: { reviewType, ...metadata, flaggedAt: new Date() },
    });
  }

  /**
   * Alert security team about critical threats
   */
  private async alertSecurityTeam(
    adminId: string,
    threatType: string,
    severity: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    this.logger.error(
      `SECURITY ALERT: ${threatType} (${severity}) detected for admin ${adminId}`,
    );

    await this.adminAuditService.logSecurityAction({
      adminId,
      action: 'security_team_alerted',
      resourceType: 'security_alert',
      resourceId: adminId,
      description: `Security team alerted about ${threatType} (${severity})`,
      metadata: { threatType, severity, ...metadata, alertedAt: new Date() },
    });

    // In a real implementation, this would send notifications to security team
    // via email, Slack, PagerDuty, etc.
  }
}
