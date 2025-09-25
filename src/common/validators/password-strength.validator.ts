import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

/**
 * Password strength requirements
 */
export interface PasswordStrengthOptions {
  minLength?: number;
  requireUppercase?: boolean;
  requireLowercase?: boolean;
  requireNumbers?: boolean;
  requireSpecialChars?: boolean;
  allowedSpecialChars?: string;
}

/**
 * Custom validator for password strength requirements
 */
@ValidatorConstraint({ name: 'isStrongPassword', async: false })
export class IsStrongPasswordConstraint
  implements ValidatorConstraintInterface
{
  validate(password: string, args: ValidationArguments) {
    if (!password || typeof password !== 'string') {
      return false;
    }

    const options: PasswordStrengthOptions = args.constraints[0] || {};
    const {
      minLength = 8,
      requireUppercase = true,
      requireLowercase = true,
      requireNumbers = true,
      requireSpecialChars = true,
      allowedSpecialChars = '@$!%*?&',
    } = options;

    // Check minimum length
    if (password.length < minLength) {
      return false;
    }

    // Check for uppercase letters
    if (requireUppercase && !/[A-Z]/.test(password)) {
      return false;
    }

    // Check for lowercase letters
    if (requireLowercase && !/[a-z]/.test(password)) {
      return false;
    }

    // Check for numbers
    if (requireNumbers && !/\d/.test(password)) {
      return false;
    }

    // Check for special characters
    if (requireSpecialChars) {
      const specialCharRegex = new RegExp(
        `[${allowedSpecialChars.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}]`,
      );
      if (!specialCharRegex.test(password)) {
        return false;
      }
    }

    return true;
  }

  defaultMessage(args: ValidationArguments) {
    const options: PasswordStrengthOptions = args.constraints[0] || {};
    const {
      minLength = 8,
      requireUppercase = true,
      requireLowercase = true,
      requireNumbers = true,
      requireSpecialChars = true,
      allowedSpecialChars = '@$!%*?&',
    } = options;

    const requirements: string[] = [];
    requirements.push(`at least ${minLength} characters`);

    if (requireUppercase) requirements.push('one uppercase letter');
    if (requireLowercase) requirements.push('one lowercase letter');
    if (requireNumbers) requirements.push('one number');
    if (requireSpecialChars)
      requirements.push(`one special character (${allowedSpecialChars})`);

    return `Password must contain ${requirements.join(', ')}`;
  }
}

/**
 * Decorator for validating password strength
 * @param options - Password strength options
 * @param validationOptions - Optional validation options
 */
export function IsStrongPassword(
  options?: PasswordStrengthOptions,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [options],
      validator: IsStrongPasswordConstraint,
    });
  };
}
