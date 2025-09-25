import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { SPECIALIZATIONS } from '../constants';

/**
 * Custom validator to ensure specializations are from predefined list
 */
@ValidatorConstraint({ name: 'isValidSpecialization', async: false })
export class IsValidSpecializationConstraint
  implements ValidatorConstraintInterface
{
  validate(specializations: string[], args: ValidationArguments) {
    if (!Array.isArray(specializations)) {
      return false;
    }

    // Check if all specializations are valid
    return specializations.every(
      (spec) =>
        typeof spec === 'string' && SPECIALIZATIONS.includes(spec as any),
    );
  }

  defaultMessage(args: ValidationArguments) {
    return `Each specialization must be one of: ${SPECIALIZATIONS.join(', ')}`;
  }
}

/**
 * Decorator for validating specialization arrays
 * @param validationOptions - Optional validation options
 */
export function IsValidSpecialization(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsValidSpecializationConstraint,
    });
  };
}

/**
 * Custom validator for role-based conditional validation
 */
@ValidatorConstraint({ name: 'isRequiredForRole', async: false })
export class IsRequiredForRoleConstraint
  implements ValidatorConstraintInterface
{
  validate(value: any, args: ValidationArguments) {
    const [requiredRole, roleProperty] = args.constraints;
    const object = args.object as any;
    const userRole = object[roleProperty];

    // If the user has the required role, the field must be present and valid
    if (userRole === requiredRole) {
      return value !== undefined && value !== null && value !== '';
    }

    // For other roles, the field is optional
    return true;
  }

  defaultMessage(args: ValidationArguments) {
    const [requiredRole] = args.constraints;
    return `This field is required for ${requiredRole} role`;
  }
}

/**
 * Decorator for role-based conditional validation
 * @param requiredRole - The role for which this field is required
 * @param roleProperty - The property name that contains the user role (default: 'role')
 * @param validationOptions - Optional validation options
 */
export function IsRequiredForRole(
  requiredRole: string,
  roleProperty: string = 'role',
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [requiredRole, roleProperty],
      validator: IsRequiredForRoleConstraint,
    });
  };
}
