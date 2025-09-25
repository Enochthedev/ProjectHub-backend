import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../enums/user-role.enum';
import { User } from '../../entities/user.entity';

/**
 * Role-Based Access Control (RBAC) Guard
 *
 * This guard enforces role-based access control by checking if the authenticated
 * user has one of the required roles to access a specific route. It works in
 * conjunction with the @Roles() decorator and JwtAuthGuard.
 *
 * Features:
 * - Role-based route protection
 * - Support for multiple roles per route
 * - Proper error handling with descriptive messages
 * - Logging for security auditing
 *
 * Usage:
 * 1. Apply JwtAuthGuard first to ensure user is authenticated
 * 2. Apply RolesGuard to check user roles
 * 3. Use @Roles() decorator to specify required roles
 */
@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private reflector: Reflector) {}

  /**
   * Determines if the current user has the required role(s) to access the route
   */
  canActivate(context: ExecutionContext): boolean {
    // Get required roles from the @Roles() decorator
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      'roles',
      [context.getHandler(), context.getClass()],
    );

    // If no roles are specified, allow access
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // Get the authenticated user from the request
    const request = context.switchToHttp().getRequest();
    const user: User = request.user;

    // This guard should only be used after authentication
    if (!user) {
      this.logger.error(
        'RolesGuard used without authentication. Ensure JwtAuthGuard is applied first.',
      );
      throw new ForbiddenException(
        'Authentication required before role checking',
      );
    }

    // Check if user has one of the required roles
    const hasRequiredRole = requiredRoles.includes(user.role);

    if (!hasRequiredRole) {
      this.logger.warn(
        `Access denied for user ${user.email} (${user.role}) to ${request.method} ${request.url}. Required roles: [${requiredRoles.join(', ')}]`,
      );

      throw new ForbiddenException(
        `Access denied. Required role(s): ${requiredRoles.join(', ')}`,
      );
    }

    // Log successful authorization
    this.logger.debug(
      `Access granted for user ${user.email} (${user.role}) to ${request.method} ${request.url}`,
    );

    return true;
  }
}
