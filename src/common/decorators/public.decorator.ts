import { SetMetadata } from '@nestjs/common';

/**
 * Public Decorator
 *
 * Use this decorator to mark routes as public (no authentication required).
 * This decorator works in conjunction with the JwtAuthGuard to bypass
 * authentication for specific endpoints.
 *
 * @example
 * ```typescript
 * @Public()
 * @Get('health')
 * getHealth() {
 *   return { status: 'ok' };
 * }
 * ```
 */
export const Public = () => SetMetadata('isPublic', true);
