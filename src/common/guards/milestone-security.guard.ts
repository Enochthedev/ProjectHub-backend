import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  MilestoneAccessControlService,
  AccessContext,
} from '../../services/milestone-access-control.service';
import { MilestoneInputSanitizationService } from '../../services/milestone-input-sanitization.service';
import { MilestoneRateLimitingService } from '../../services/milestone-rate-limiting.service';
import { UserRole } from '../enums/user-role.enum';
import {
  MilestonePermissionException,
  MilestoneContentSanitizationException,
  MilestoneRateLimitException,
} from '../exceptions/milestone.exception';

export interface MilestoneSecurityOptions {
  requireOwnership?: boolean;
  allowSupervisorAccess?: boolean;
  allowAdminAccess?: boolean;
  requiredPermission?: 'read' | 'write' | 'delete' | 'manage_reminders';
  rateLimitOperation?: string;
  sanitizeInput?: boolean;
  validateMilestoneId?: boolean;
}

/**
 * Comprehensive security guard for milestone operations
 */
@Injectable()
export class MilestoneSecurityGuard implements CanActivate {
  private readonly logger = new Logger(MilestoneSecurityGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly accessControlService: MilestoneAccessControlService,
    private readonly sanitizationService: MilestoneInputSanitizationService,
    private readonly rateLimitingService: MilestoneRateLimitingService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const handler = context.getHandler();
    const controller = context.getClass();

    // Get security options from metadata
    const options =
      this.reflector.getAllAndOverride<MilestoneSecurityOptions>(
        'milestone-security',
        [handler, controller],
      ) || {};

    try {
      // 1. Validate user authentication
      if (!request.user) {
        throw new ForbiddenException('Authentication required');
      }

      const user = request.user;
      const userContext: AccessContext = {
        userId: user.id,
        userRole: user.role,
        supervisorId: user.supervisorId,
        projectIds: user.projectIds || [],
      };

      // 2. Apply rate limiting if specified
      if (options.rateLimitOperation) {
        await this.applyRateLimit(user.id, options.rateLimitOperation, request);
      }

      // 3. Sanitize input if specified
      if (options.sanitizeInput) {
        await this.sanitizeRequestInput(request);
      }

      // 4. Validate milestone access if milestone ID is provided
      if (options.validateMilestoneId) {
        await this.validateMilestoneAccess(request, userContext, options);
      }

      // 5. Check role-based permissions
      await this.checkRolePermissions(userContext, options);

      return true;
    } catch (error) {
      this.logger.error('Milestone security check failed', {
        userId: request.user?.id,
        path: request.path,
        method: request.method,
        error: error.message,
      });

      throw error;
    }
  }

  /**
   * Apply rate limiting for the operation
   */
  private async applyRateLimit(
    userId: string,
    operation: string,
    request: any,
  ): Promise<void> {
    try {
      // Check for project-specific rate limiting
      const projectId = request.params?.projectId || request.body?.projectId;

      if (projectId) {
        await this.rateLimitingService.enforceProjectRateLimit(
          userId,
          projectId,
          operation,
        );
      } else {
        await this.rateLimitingService.enforceMilestoneRateLimit(
          userId,
          operation,
        );
      }
    } catch (error) {
      if (error instanceof MilestoneRateLimitException) {
        throw error;
      }

      this.logger.error('Rate limiting check failed', {
        userId,
        operation,
        error: error.message,
      });

      throw new MilestoneRateLimitException(
        operation,
        'Rate limiting service unavailable',
        60,
      );
    }
  }

  /**
   * Sanitize request input data
   */
  private async sanitizeRequestInput(request: any): Promise<void> {
    if (!request.body) {
      return;
    }

    try {
      const sanitizedBody = { ...request.body };

      // Sanitize milestone-specific fields
      if (sanitizedBody.title) {
        sanitizedBody.title = this.sanitizationService.sanitizeTitle(
          sanitizedBody.title,
        );
      }

      if (sanitizedBody.description) {
        sanitizedBody.description =
          this.sanitizationService.sanitizeDescription(
            sanitizedBody.description,
          );
      }

      if (sanitizedBody.blockingReason) {
        sanitizedBody.blockingReason =
          this.sanitizationService.sanitizeBlockingReason(
            sanitizedBody.blockingReason,
          );
      }

      if (sanitizedBody.content) {
        sanitizedBody.content = this.sanitizationService.sanitizeNoteContent(
          sanitizedBody.content,
        );
      }

      // Validate comprehensive milestone data if multiple fields present
      if (
        sanitizedBody.title ||
        sanitizedBody.description ||
        sanitizedBody.blockingReason
      ) {
        const validationResult = this.sanitizationService.validateMilestoneData(
          {
            title: sanitizedBody.title,
            description: sanitizedBody.description,
            blockingReason: sanitizedBody.blockingReason,
          },
        );

        // Update sanitized values
        Object.assign(sanitizedBody, validationResult);

        // Log warnings if content was modified
        if (validationResult.warnings && validationResult.warnings.length > 0) {
          this.logger.warn('Content was sanitized during validation', {
            warnings: validationResult.warnings,
            userId: request.user?.id,
          });
        }
      }

      // Replace request body with sanitized version
      request.body = sanitizedBody;
    } catch (error) {
      if (error instanceof MilestoneContentSanitizationException) {
        throw error;
      }

      this.logger.error('Input sanitization failed', {
        error: error.message,
        userId: request.user?.id,
      });

      throw new BadRequestException('Invalid input data');
    }
  }

  /**
   * Validate milestone access permissions
   */
  private async validateMilestoneAccess(
    request: any,
    userContext: AccessContext,
    options: MilestoneSecurityOptions,
  ): Promise<void> {
    const milestoneId = request.params?.id || request.params?.milestoneId;

    if (!milestoneId) {
      return; // No milestone ID to validate
    }

    try {
      // Check if milestone exists and user has access
      const requiredPermission = options.requiredPermission || 'read';

      await this.accessControlService.enforceAccess(
        milestoneId,
        userContext,
        requiredPermission,
      );

      // Additional ownership check if required
      if (
        options.requireOwnership &&
        userContext.userRole === UserRole.STUDENT
      ) {
        await this.accessControlService.validateOwnership(
          milestoneId,
          userContext.userId,
        );
      }

      // Supervisor access validation
      if (
        options.allowSupervisorAccess &&
        userContext.userRole === UserRole.SUPERVISOR
      ) {
        await this.accessControlService.validateSupervisorAccess(
          milestoneId,
          userContext.userId,
        );
      }
    } catch (error) {
      if (error instanceof MilestonePermissionException) {
        throw error;
      }

      this.logger.error('Milestone access validation failed', {
        milestoneId,
        userId: userContext.userId,
        requiredPermission: options.requiredPermission,
        error: error.message,
      });

      throw new ForbiddenException('Access denied to milestone');
    }
  }

  /**
   * Check role-based permissions
   */
  private async checkRolePermissions(
    userContext: AccessContext,
    options: MilestoneSecurityOptions,
  ): Promise<void> {
    const { userRole } = userContext;

    // Admin access check
    if (options.allowAdminAccess === false && userRole === UserRole.ADMIN) {
      throw new ForbiddenException(
        'Admin access not allowed for this operation',
      );
    }

    // Supervisor access check
    if (
      options.allowSupervisorAccess === false &&
      userRole === UserRole.SUPERVISOR
    ) {
      throw new ForbiddenException(
        'Supervisor access not allowed for this operation',
      );
    }

    // Student-only operations
    if (options.requireOwnership && userRole !== UserRole.STUDENT) {
      throw new ForbiddenException(
        'This operation is only available to students',
      );
    }
  }
}

/**
 * Decorator to apply milestone security options
 */
export const MilestoneSecurity = (options: MilestoneSecurityOptions = {}) => {
  return (
    target: any,
    propertyKey?: string,
    descriptor?: PropertyDescriptor,
  ) => {
    if (propertyKey && descriptor) {
      // Method decorator
      Reflect.defineMetadata('milestone-security', options, descriptor.value);
    } else {
      // Class decorator
      Reflect.defineMetadata('milestone-security', options, target);
    }
  };
};

/**
 * Decorator for milestone ownership validation
 */
export const RequireMilestoneOwnership = () => {
  return MilestoneSecurity({
    requireOwnership: true,
    validateMilestoneId: true,
    requiredPermission: 'write',
    sanitizeInput: true,
  });
};

/**
 * Decorator for milestone read access
 */
export const RequireMilestoneReadAccess = () => {
  return MilestoneSecurity({
    validateMilestoneId: true,
    requiredPermission: 'read',
    allowSupervisorAccess: true,
    allowAdminAccess: true,
  });
};

/**
 * Decorator for milestone write access
 */
export const RequireMilestoneWriteAccess = () => {
  return MilestoneSecurity({
    validateMilestoneId: true,
    requiredPermission: 'write',
    sanitizeInput: true,
    allowAdminAccess: true,
  });
};

/**
 * Decorator for milestone deletion
 */
export const RequireMilestoneDeleteAccess = () => {
  return MilestoneSecurity({
    requireOwnership: true,
    validateMilestoneId: true,
    requiredPermission: 'delete',
    rateLimitOperation: 'milestone_deletion',
  });
};

/**
 * Decorator for rate-limited operations
 */
export const MilestoneRateLimit = (operation: string) => {
  return MilestoneSecurity({
    rateLimitOperation: operation,
    sanitizeInput: true,
  });
};

/**
 * Decorator for supervisor-only operations
 */
export const RequireSupervisorAccess = () => {
  return MilestoneSecurity({
    allowSupervisorAccess: true,
    allowAdminAccess: true,
    requiredPermission: 'manage_reminders',
  });
};
