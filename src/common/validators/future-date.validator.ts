import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

/**
 * Options for future date validation
 */
export interface FutureDateOptions {
  /**
   * Minimum days from now (default: 1)
   */
  minDaysFromNow?: number;
  /**
   * Maximum days from now (optional)
   */
  maxDaysFromNow?: number;
  /**
   * Allow today as valid (default: false)
   */
  allowToday?: boolean;
}

/**
 * Custom validator to ensure date is in the future
 */
@ValidatorConstraint({ name: 'isFutureDate', async: false })
export class IsFutureDateConstraint implements ValidatorConstraintInterface {
  validate(dateString: string, args: ValidationArguments) {
    if (!dateString || typeof dateString !== 'string') {
      return false;
    }

    const options: FutureDateOptions = args.constraints[0] || {};
    const { minDaysFromNow = 1, maxDaysFromNow, allowToday = false } = options;

    try {
      const inputDate = new Date(dateString);
      const now = new Date();

      // Reset time to start of day for accurate comparison
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const targetDate = new Date(
        inputDate.getFullYear(),
        inputDate.getMonth(),
        inputDate.getDate(),
      );

      // Check if date is valid
      if (isNaN(targetDate.getTime())) {
        return false;
      }

      // Calculate days difference
      const daysDifference = Math.ceil(
        (targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
      );

      // Check if today is allowed
      if (allowToday && daysDifference === 0) {
        return true;
      }

      // Check minimum days from now
      if (daysDifference < minDaysFromNow) {
        return false;
      }

      // Check maximum days from now if specified
      if (maxDaysFromNow && daysDifference > maxDaysFromNow) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  defaultMessage(args: ValidationArguments) {
    const options: FutureDateOptions = args.constraints[0] || {};
    const { minDaysFromNow = 1, maxDaysFromNow, allowToday = false } = options;

    if (allowToday && minDaysFromNow <= 1) {
      return 'Date must be today or in the future';
    }

    if (minDaysFromNow === 1) {
      const maxMessage = maxDaysFromNow
        ? ` and within ${maxDaysFromNow} days`
        : '';
      return `Date must be in the future${maxMessage}`;
    }

    const maxMessage = maxDaysFromNow
      ? ` and within ${maxDaysFromNow} days`
      : '';
    return `Date must be at least ${minDaysFromNow} days from now${maxMessage}`;
  }
}

/**
 * Decorator for validating future dates
 * @param options - Future date validation options
 * @param validationOptions - Optional validation options
 */
export function IsFutureDate(
  options?: FutureDateOptions,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [options],
      validator: IsFutureDateConstraint,
    });
  };
}

/**
 * Decorator for validating academic year dates (within current academic year)
 * Assumes academic year runs from September to August
 */
export function IsAcademicYearDate(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(dateString: string) {
          if (!dateString || typeof dateString !== 'string') {
            return false;
          }

          try {
            const inputDate = new Date(dateString);
            const now = new Date();

            // Check if date is valid
            if (isNaN(inputDate.getTime())) {
              return false;
            }

            // Calculate current academic year boundaries
            const currentYear = now.getFullYear();
            const currentMonth = now.getMonth(); // 0-based (0 = January)

            let academicYearStart: Date;
            let academicYearEnd: Date;

            if (currentMonth >= 8) {
              // September or later (month 8+)
              // Current academic year: Sept current year to Aug next year
              academicYearStart = new Date(currentYear, 8, 1); // September 1st
              academicYearEnd = new Date(currentYear + 1, 7, 31); // August 31st next year
            } else {
              // Current academic year: Sept previous year to Aug current year
              academicYearStart = new Date(currentYear - 1, 8, 1); // September 1st previous year
              academicYearEnd = new Date(currentYear, 7, 31); // August 31st current year
            }

            return (
              inputDate >= academicYearStart && inputDate <= academicYearEnd
            );
          } catch (error) {
            return false;
          }
        },
        defaultMessage() {
          return 'Date must be within the current academic year (September to August)';
        },
      },
    });
  };
}
