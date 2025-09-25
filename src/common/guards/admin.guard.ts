import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../enums/user-role.enum';
import { User } from '../../entities/user.entity';

/**
 * Admin Authentication and Authorization Guard
 *
 * This guard provides enhanced security for admin-specific routes by:
 * 1. Ensuring the user is authenticated
 * 2. Verifying the user has admin role
 * 3. Checking granular permissions if specified
 * 4. Logging all access attempts for security auditing
 *
 * Features:
 * - Admin role validation
 * - Granular permission checking
 * - Enhanced security logging
 * - Session validation
 * - Automatic audit trail generation
 */
@Injectable()
export class AdminGuard implements CanActivate {
  private readonly logger = new Logger(AdminGuard.name);

  constructor(private reflector: Reflector) {}

  /**
   * Determines if the current user can access the admin route
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user: User = request.user;
    const requiredPermissions = this.reflector.get<string[]>(
      'permissions',
      context.getHandler(),
    );

    // Log access attempt for security monitoring
    this.logAccessAttempt(request, user);

    // Check if user is authenticated
    if (!user) {
      this.logger.warn(
        `Unauthenticated admin access attempt to ${request.method} ${request.url} from IP: ${this.getClientIP(request)}`,
      );
      throw new UnauthorizedException(
        'Authentication required for admin access',
      );
    }

    // Check if user has admin role
    if (user.role !== UserRole.ADMIN) {
      this.logger.warn(
        `Non-admin user ${user.email} (${user.role}) attempted to access admin route ${request.method} ${request.url} from IP: ${this.getClientIP(request)}`,
      );
      throw new ForbiddenException(
        'Admin privileges required to access this resource',
      );
    }

    // Check if user account is active
    if (!user.isActive) {
      this.logger.warn(
        `Deactivated admin user ${user.email} attempted access to ${request.method} ${request.url} from IP: ${this.getClientIP(request)}`,
      );
      throw new ForbiddenException('Admin account has been deactivated');
    }

    // Check if email is verified
    if (!user.isEmailVerified) {
      this.logger.warn(
        `Unverified admin user ${user.email} attempted access to ${request.method} ${request.url} from IP: ${this.getClientIP(request)}`,
      );
      throw new ForbiddenException(
        'Email verification required for admin access',
      );
    }

    // Check granular permissions if specified
    if (requiredPermissions && requiredPermissions.length > 0) {
      const hasPermission = await this.checkPermissions(
        user,
        requiredPermissions,
        request,
      );
      if (!hasPermission) {
        this.logger.warn(
          `Admin user ${user.email} lacks required permissions [${requiredPermissions.join(', ')}] for ${request.method} ${request.url}`,
        );
        throw new ForbiddenException(
          `Insufficient permissions. Required: ${requiredPermissions.join(', ')}`,
        );
      }
    }

    // Log successful admin access
    this.logger.log(
      `Admin access granted to ${user.email} for ${request.method} ${request.url}`,
    );

    // Add admin context to request for audit logging
    request.adminContext = {
      adminId: user.id,
      adminEmail: user.email,
      ipAddress: this.getClientIP(request),
      userAgent: request.headers['user-agent'] || 'unknown',
      timestamp: new Date(),
    };

    return true;
  }

  /**
   * Check if admin user has required permissions
   */
  private async checkPermissions(
    user: User,
    requiredPermissions: string[],
    request: any,
  ): Promise<boolean> {
    // For now, all admin users have all permissions
    // This can be extended to support granular permissions from database
    // TODO: Implement permission checking from admin_permissions table

    // Log permission check for audit
    this.logger.debug(
      `Permission check for admin ${user.email}: required [${requiredPermissions.join(', ')}]`,
    );

    // Currently, all active admin users have full permissions
    // In future iterations, this should check against a permissions table
    return true;
  }

  /**
   * Log access attempt for security monitoring
   */
  private logAccessAttempt(request: any, user?: User): void {
    const ipAddress = this.getClientIP(request);
    const userAgent = request.headers['user-agent'] || 'unknown';
    const endpoint = `${request.method} ${request.url}`;

    if (user) {
      this.logger.debug(
        `Admin access attempt by ${user.email} (${user.role}) to ${endpoint} from IP: ${ipAddress}`,
      );
    } else {
      this.logger.debug(
        `Unauthenticated admin access attempt to ${endpoint} from IP: ${ipAddress}`,
      );
    }
  }

  /**
   * Extract client IP address from request
   */
  private getClientIP(request: any): string {
    return (
      request.headers['x-forwarded-for']?.split(',')[0] ||
      request.headers['x-real-ip'] ||
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress ||
      'unknown'
    );
  }
}
