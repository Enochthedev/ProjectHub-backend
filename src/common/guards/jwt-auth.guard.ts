import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';

/**
 * JWT Authentication Guard
 *
 * This guard extends the Passport AuthGuard to provide JWT-based authentication
 * for protected routes. It validates JWT tokens and injects the authenticated
 * user into the request context.
 *
 * Features:
 * - JWT token validation using Passport JWT strategy
 * - User context injection into request object
 * - Proper error handling for invalid/expired tokens
 * - Support for optional authentication via @Public() decorator
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(private reflector: Reflector) {
    super();
  }

  /**
   * Determines if the route can be activated based on JWT authentication
   */
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // Proceed with JWT authentication
    return super.canActivate(context);
  }

  /**
   * Handles authentication errors and provides detailed error messages
   */
  handleRequest<TUser = any>(
    err: any,
    user: any,
    info: any,
    context: ExecutionContext,
  ): TUser {
    const request = context.switchToHttp().getRequest();

    // Log authentication attempt details (without sensitive info)
    this.logger.debug(
      `Authentication attempt for ${request.method} ${request.url}`,
    );

    if (err || !user) {
      // Log the authentication failure
      this.logger.warn(
        `Authentication failed: ${info?.message || err?.message || 'Unknown error'}`,
      );

      // Provide specific error messages based on the failure reason
      if (info?.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Access token has expired');
      }

      if (info?.name === 'JsonWebTokenError') {
        throw new UnauthorizedException('Invalid access token');
      }

      if (info?.name === 'NotBeforeError') {
        throw new UnauthorizedException('Access token not active yet');
      }

      if (err?.message === 'User not found') {
        throw new UnauthorizedException('User account not found');
      }

      if (err?.message === 'User account is deactivated') {
        throw new UnauthorizedException('User account has been deactivated');
      }

      if (err?.message === 'Email not verified') {
        throw new UnauthorizedException(
          'Email address must be verified before accessing this resource',
        );
      }

      // Generic authentication error
      throw new UnauthorizedException('Authentication required');
    }

    // Log successful authentication
    this.logger.debug(
      `User authenticated successfully: ${user.email} (${user.role})`,
    );

    return user;
  }
}
