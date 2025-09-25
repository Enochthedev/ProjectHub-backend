import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { Injectable } from '@nestjs/common';
import { UniversityValidationService } from '../services/university-validation.service';

/**
 * Custom validator to ensure email belongs to University of Ibadan domain
 */
@ValidatorConstraint({ name: 'isUniversityEmail', async: false })
@Injectable()
export class IsUniversityEmailConstraint
  implements ValidatorConstraintInterface
{
  constructor(
    private readonly universityValidationService: UniversityValidationService,
  ) {}

  validate(email: string, args: ValidationArguments) {
    if (!email || typeof email !== 'string') {
      return false;
    }

    return this.universityValidationService.isValidUniversityEmail(email);
  }

  defaultMessage(args: ValidationArguments) {
    const allowedDomains = this.universityValidationService
      .getAllowedDomains()
      .map((d) => d.domain)
      .join(', ');

    return `Email must be from University of Ibadan. Allowed domains: ${allowedDomains}`;
  }
}

/**
 * Decorator for validating University of Ibadan email addresses
 * @param validationOptions - Optional validation options
 */
export function IsUniversityEmail(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsUniversityEmailConstraint,
    });
  };
}

/**
 * Decorator for validating email for specific role
 * @param validationOptions - Optional validation options
 */
export function IsUniversityEmailForRole(
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: class implements ValidatorConstraintInterface {
        constructor(
          private readonly universityValidationService: UniversityValidationService,
        ) {}

        validate(email: string, args: ValidationArguments) {
          if (!email || typeof email !== 'string') {
            return false;
          }

          const obj = args.object as any;
          const role = obj.role;

          if (!role) {
            return this.universityValidationService.isValidUniversityEmail(
              email,
            );
          }

          return this.universityValidationService.isValidEmailForRole(
            email,
            role,
          );
        }

        defaultMessage(args: ValidationArguments) {
          const obj = args.object as any;
          const role = obj.role;

          if (role) {
            const allowedDomains = this.universityValidationService
              .getAllowedDomainsForRole(role)
              .map((d) => `${d.domain} (${d.description})`)
              .join(', ');

            return `Email must be from University of Ibadan domain valid for ${role} role. Allowed: ${allowedDomains}`;
          }

          const allowedDomains = this.universityValidationService
            .getAllowedDomains()
            .map((d) => d.domain)
            .join(', ');

          return `Email must be from University of Ibadan. Allowed domains: ${allowedDomains}`;
        }
      },
    });
  };
}
