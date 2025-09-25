import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../enums/user-role.enum';

/**
 * Roles Decorator
 *
 * Use this decorator to specify which user roles are allowed to access
 * a specific route or controller. This decorator works in conjunction
 * with the RolesGuard to enforce role-based access control.
 *
 * @param roles - Array of UserRole values that are allowed to access the route
 *
 * @example
 * ```typescript
 * @Roles(UserRole.ADMIN)
 * @Delete('users/:id')
 * deleteUser(@Param('id') id: string) {
 *   // Only admins can access this endpoint
 * }
 *
 * @Roles(UserRole.STUDENT, UserRole.SUPERVISOR)
 * @Get('profile')
 * getProfile() {
 *   // Both students and supervisors can access this endpoint
 * }
 * ```
 */
export const Roles = (...roles: UserRole[]) => SetMetadata('roles', roles);
