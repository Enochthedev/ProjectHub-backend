import { SetMetadata } from '@nestjs/common';

/**
 * Admin Permissions Decorator
 *
 * Use this decorator to specify granular permissions required for admin routes.
 * This decorator works in conjunction with the AdminGuard to enforce
 * permission-based access control for administrative functions.
 *
 * @param permissions - Array of permission strings required to access the route
 *
 * @example
 * ```typescript
 * @Permissions('user.create', 'user.update')
 * @Post('users')
 * createUser(@Body() createUserDto: CreateUserDto) {
 *   // Only admins with user.create and user.update permissions can access
 * }
 *
 * @Permissions('system.config.update')
 * @Put('config/:key')
 * updateConfig(@Param('key') key: string, @Body() value: any) {
 *   // Only admins with system.config.update permission can access
 * }
 * ```
 */
export const Permissions = (...permissions: string[]) =>
  SetMetadata('permissions', permissions);

/**
 * Admin Permission Constants
 *
 * Defines all available admin permissions in the system.
 * These constants should be used with the @Permissions decorator
 * to ensure consistency and prevent typos.
 */
export const ADMIN_PERMISSIONS = {
  // User Management Permissions
  USER_CREATE: 'user.create',
  USER_READ: 'user.read',
  USER_UPDATE: 'user.update',
  USER_DELETE: 'user.delete',
  USER_BULK_OPERATIONS: 'user.bulk_operations',

  // Project Management Permissions
  PROJECT_APPROVE: 'project.approve',
  PROJECT_REJECT: 'project.reject',
  PROJECT_MODERATE: 'project.moderate',
  PROJECT_REASSIGN: 'project.reassign',
  PROJECT_BULK_OPERATIONS: 'project.bulk_operations',

  // Supervisor Management Permissions
  SUPERVISOR_ASSIGN: 'supervisor.assign',
  SUPERVISOR_REASSIGN: 'supervisor.reassign',
  SUPERVISOR_MANAGE_WORKLOAD: 'supervisor.manage_workload',

  // System Configuration Permissions
  SYSTEM_CONFIG_READ: 'system.config.read',
  SYSTEM_CONFIG_UPDATE: 'system.config.update',
  SYSTEM_CONFIG_CREATE: 'system.config.create',
  SYSTEM_CONFIG_DELETE: 'system.config.delete',

  // Analytics and Reporting Permissions
  ANALYTICS_READ: 'analytics.read',
  ANALYTICS_EXPORT: 'analytics.export',
  REPORTS_GENERATE: 'reports.generate',
  REPORTS_SCHEDULE: 'reports.schedule',

  // AI Service Management Permissions
  AI_CONFIG_READ: 'ai.config.read',
  AI_CONFIG_UPDATE: 'ai.config.update',
  AI_KNOWLEDGE_MANAGE: 'ai.knowledge.manage',
  AI_MONITORING: 'ai.monitoring',

  // Milestone Template Permissions
  MILESTONE_TEMPLATE_CREATE: 'milestone.template.create',
  MILESTONE_TEMPLATE_UPDATE: 'milestone.template.update',
  MILESTONE_TEMPLATE_DELETE: 'milestone.template.delete',
  MILESTONE_TEMPLATE_MANAGE: 'milestone.template.manage',

  // Security and Audit Permissions
  SECURITY_MONITOR: 'security.monitor',
  SECURITY_AUDIT: 'security.audit',
  SECURITY_THREAT_RESPONSE: 'security.threat_response',

  // Communication Permissions
  ANNOUNCEMENT_CREATE: 'announcement.create',
  ANNOUNCEMENT_UPDATE: 'announcement.update',
  ANNOUNCEMENT_DELETE: 'announcement.delete',
  ANNOUNCEMENT_PUBLISH: 'announcement.publish',

  // Data Management Permissions
  DATA_BACKUP: 'data.backup',
  DATA_RESTORE: 'data.restore',
  DATA_EXPORT: 'data.export',
  DATA_MIGRATION: 'data.migration',

  // Super Admin Permissions (highest level)
  SUPER_ADMIN: 'super.admin',
  SYSTEM_MAINTENANCE: 'system.maintenance',
} as const;

/**
 * Permission Groups for easier management
 */
export const PERMISSION_GROUPS = {
  USER_MANAGEMENT: [
    ADMIN_PERMISSIONS.USER_CREATE,
    ADMIN_PERMISSIONS.USER_READ,
    ADMIN_PERMISSIONS.USER_UPDATE,
    ADMIN_PERMISSIONS.USER_DELETE,
    ADMIN_PERMISSIONS.USER_BULK_OPERATIONS,
  ],
  PROJECT_MANAGEMENT: [
    ADMIN_PERMISSIONS.PROJECT_APPROVE,
    ADMIN_PERMISSIONS.PROJECT_REJECT,
    ADMIN_PERMISSIONS.PROJECT_MODERATE,
    ADMIN_PERMISSIONS.PROJECT_REASSIGN,
    ADMIN_PERMISSIONS.PROJECT_BULK_OPERATIONS,
  ],
  SYSTEM_CONFIGURATION: [
    ADMIN_PERMISSIONS.SYSTEM_CONFIG_READ,
    ADMIN_PERMISSIONS.SYSTEM_CONFIG_UPDATE,
    ADMIN_PERMISSIONS.SYSTEM_CONFIG_CREATE,
    ADMIN_PERMISSIONS.SYSTEM_CONFIG_DELETE,
  ],
  ANALYTICS_REPORTING: [
    ADMIN_PERMISSIONS.ANALYTICS_READ,
    ADMIN_PERMISSIONS.ANALYTICS_EXPORT,
    ADMIN_PERMISSIONS.REPORTS_GENERATE,
    ADMIN_PERMISSIONS.REPORTS_SCHEDULE,
  ],
  SECURITY_AUDIT: [
    ADMIN_PERMISSIONS.SECURITY_MONITOR,
    ADMIN_PERMISSIONS.SECURITY_AUDIT,
    ADMIN_PERMISSIONS.SECURITY_THREAT_RESPONSE,
  ],
} as const;
