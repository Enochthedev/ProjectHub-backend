import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { InputSanitizationService } from '../services/input-sanitization.service';
import { RateLimitingService } from '../services/rate-limiting.service';
import { MalformedSearchQueryException } from '../exceptions/project.exception';

export interface SecurityOptions {
  rateLimit?: {
    endpoint: string;
    maxRequests?: number;
    windowMs?: number;
  };
  inputValidation?: {
    sanitizeQuery?: boolean;
    sanitizeBody?: boolean;
    maxQueryLength?: number;
    maxBodySize?: number;
  };
  skipRateLimit?: boolean;
  skipInputValidation?: boolean;
}

/**
 * Decorator to configure security options for endpoints
 */
export const Security = (options: SecurityOptions) => {
  return (
    target: any,
    propertyKey?: string,
    descriptor?: PropertyDescriptor,
  ) => {
    if (descriptor) {
      Reflect.defineMetadata('security-options', options, descriptor.value);
    } else {
      Reflect.defineMetadata('security-options', options, target);
    }
  };
};

/**
 * Security guard that handles rate limiting and input validation
 */
@Injectable()
export class SecurityGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly inputSanitizationService: InputSanitizationService,
    private readonly rateLimitingService: RateLimitingService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const handler = context.getHandler();

    // Get security options from decorator
    const securityOptions =
      this.reflector.get<SecurityOptions>('security-options', handler) || {};

    // Apply rate limiting
    if (!securityOptions.skipRateLimit && securityOptions.rateLimit) {
      await this.applyRateLimit(request, securityOptions.rateLimit);
    }

    // Apply input validation
    if (
      !securityOptions.skipInputValidation &&
      securityOptions.inputValidation
    ) {
      await this.validateInput(request, securityOptions.inputValidation);
    }

    return true;
  }

  private async applyRateLimit(
    request: Request,
    rateLimitConfig: SecurityOptions['rateLimit'],
  ): Promise<void> {
    if (!rateLimitConfig?.endpoint) {
      return;
    }

    const identifier = (request as any).user?.id || request.ip;

    await this.rateLimitingService.enforceRateLimit(
      identifier,
      rateLimitConfig.endpoint,
      {
        maxRequests: rateLimitConfig.maxRequests,
        windowMs: rateLimitConfig.windowMs,
      },
    );
  }

  private async validateInput(
    request: Request,
    inputConfig: SecurityOptions['inputValidation'],
  ): Promise<void> {
    // Validate query parameters
    if (inputConfig?.sanitizeQuery && request.query) {
      this.validateQueryParameters(request.query, inputConfig);
    }

    // Validate request body
    if (inputConfig?.sanitizeBody && request.body) {
      this.validateRequestBody(request.body, inputConfig);
    }
  }

  private validateQueryParameters(
    query: any,
    config: SecurityOptions['inputValidation'],
  ): void {
    // Check for security threats in query parameters
    for (const [key, value] of Object.entries(query)) {
      if (typeof value === 'string') {
        // Check query parameter length
        if (config?.maxQueryLength && value.length > config.maxQueryLength) {
          throw new MalformedSearchQueryException(
            value.substring(0, 100),
            `Query parameter '${key}' exceeds maximum length`,
          );
        }

        // Check for security threats
        if (this.inputSanitizationService.containsSecurityThreats(value)) {
          throw new MalformedSearchQueryException(
            value.substring(0, 100),
            `Query parameter '${key}' contains potentially dangerous content`,
          );
        }
      }
    }
  }

  private validateRequestBody(
    body: any,
    config: SecurityOptions['inputValidation'],
  ): void {
    // Check body size
    const bodyString = JSON.stringify(body);
    if (config?.maxBodySize && bodyString.length > config.maxBodySize) {
      throw new MalformedSearchQueryException(
        'Request body too large',
        `Body size exceeds maximum allowed size of ${config.maxBodySize} characters`,
      );
    }

    // Recursively check all string values in the body
    this.validateObjectValues(body, '');
  }

  private validateObjectValues(obj: any, path: string): void {
    if (typeof obj === 'string') {
      if (this.inputSanitizationService.containsSecurityThreats(obj)) {
        throw new MalformedSearchQueryException(
          obj.substring(0, 100),
          `Field '${path}' contains potentially dangerous content`,
        );
      }
    } else if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        this.validateObjectValues(item, `${path}[${index}]`);
      });
    } else if (obj && typeof obj === 'object') {
      Object.entries(obj).forEach(([key, value]) => {
        const newPath = path ? `${path}.${key}` : key;
        this.validateObjectValues(value, newPath);
      });
    }
  }
}
