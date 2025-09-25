import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
  ValidationPipe as NestValidationPipe,
} from '@nestjs/common';
import { ValidationError } from 'class-validator';

/**
 * Enhanced validation pipe with custom error formatting
 * Provides detailed validation error messages for better API responses
 */
@Injectable()
export class CustomValidationPipe extends NestValidationPipe {
  constructor() {
    super({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      exceptionFactory: (errors: ValidationError[]) => {
        const formattedErrors = this.formatValidationErrors(errors);
        return new BadRequestException({
          success: false,
          errorCode: 'VALIDATION_ERROR',
          message: 'Validation failed',
          errors: formattedErrors,
        });
      },
    });
  }

  /**
   * Formats validation errors into a structured format
   * @param errors - Array of validation errors from class-validator
   * @returns Formatted error object with field-specific messages
   */
  private formatValidationErrors(
    errors: ValidationError[],
  ): Record<string, string[]> {
    const formattedErrors: Record<string, string[]> = {};

    const processError = (error: ValidationError, parentPath = '') => {
      const fieldPath = parentPath
        ? `${parentPath}.${error.property}`
        : error.property;

      if (error.constraints) {
        formattedErrors[fieldPath] = Object.values(error.constraints);
      }

      if (error.children && error.children.length > 0) {
        error.children.forEach((childError) => {
          processError(childError, fieldPath);
        });
      }
    };

    errors.forEach((error) => processError(error));
    return formattedErrors;
  }
}

/**
 * Validation pipe specifically for query parameters
 * Handles optional fields and type transformations for URL parameters
 */
@Injectable()
export class QueryValidationPipe implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata) {
    if (metadata.type !== 'query') {
      return value;
    }

    // Handle boolean query parameters
    if (typeof value === 'object' && value !== null) {
      Object.keys(value).forEach((key) => {
        if (value[key] === 'true') {
          value[key] = true;
        } else if (value[key] === 'false') {
          value[key] = false;
        } else if (value[key] === 'null' || value[key] === 'undefined') {
          value[key] = undefined;
        }
      });
    }

    return value;
  }
}
