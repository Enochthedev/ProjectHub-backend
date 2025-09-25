import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { MilestoneStatus } from '../enums/milestone-status.enum';

/**
 * Valid status transitions for milestones
 */
const VALID_TRANSITIONS: Record<MilestoneStatus, MilestoneStatus[]> = {
  [MilestoneStatus.NOT_STARTED]: [
    MilestoneStatus.IN_PROGRESS,
    MilestoneStatus.BLOCKED,
    MilestoneStatus.CANCELLED,
  ],
  [MilestoneStatus.IN_PROGRESS]: [
    MilestoneStatus.COMPLETED,
    MilestoneStatus.BLOCKED,
    MilestoneStatus.CANCELLED,
    MilestoneStatus.NOT_STARTED, // Allow going back to not started
  ],
  [MilestoneStatus.BLOCKED]: [
    MilestoneStatus.IN_PROGRESS,
    MilestoneStatus.NOT_STARTED,
    MilestoneStatus.CANCELLED,
  ],
  [MilestoneStatus.COMPLETED]: [
    MilestoneStatus.IN_PROGRESS, // Allow reopening completed milestones
  ],
  [MilestoneStatus.CANCELLED]: [
    MilestoneStatus.NOT_STARTED,
    MilestoneStatus.IN_PROGRESS,
  ],
};

/**
 * Options for status transition validation
 */
export interface StatusTransitionOptions {
  /**
   * Current status of the milestone (to be provided at runtime)
   */
  getCurrentStatus?: () => MilestoneStatus | null;
  /**
   * Allow any transition (for admin operations)
   */
  allowAnyTransition?: boolean;
}

/**
 * Custom validator to ensure valid milestone status transitions
 */
@ValidatorConstraint({ name: 'isValidStatusTransition', async: false })
export class IsValidStatusTransitionConstraint
  implements ValidatorConstraintInterface
{
  validate(newStatus: MilestoneStatus, args: ValidationArguments) {
    if (!newStatus || !Object.values(MilestoneStatus).includes(newStatus)) {
      return false;
    }

    const options: StatusTransitionOptions = args.constraints[0] || {};
    const { getCurrentStatus, allowAnyTransition = false } = options;

    // If any transition is allowed (admin mode), skip validation
    if (allowAnyTransition) {
      return true;
    }

    // If no current status provider, we can't validate transition
    if (!getCurrentStatus) {
      return true; // Let other validators handle basic enum validation
    }

    const currentStatus = getCurrentStatus();

    // If no current status, allow any status (new milestone)
    if (!currentStatus) {
      return true;
    }

    // Check if transition is valid
    const validTransitions = VALID_TRANSITIONS[currentStatus] || [];
    return validTransitions.includes(newStatus);
  }

  defaultMessage(args: ValidationArguments) {
    const options: StatusTransitionOptions = args.constraints[0] || {};
    const { getCurrentStatus } = options;

    if (getCurrentStatus) {
      const currentStatus = getCurrentStatus();
      if (currentStatus) {
        const validTransitions = VALID_TRANSITIONS[currentStatus] || [];
        return `Invalid status transition from ${currentStatus}. Valid transitions are: ${validTransitions.join(', ')}`;
      }
    }

    return 'Invalid status transition';
  }
}

/**
 * Decorator for validating milestone status transitions
 * @param options - Status transition validation options
 * @param validationOptions - Optional validation options
 */
export function IsValidStatusTransition(
  options?: StatusTransitionOptions,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [options],
      validator: IsValidStatusTransitionConstraint,
    });
  };
}

/**
 * Get valid transitions for a given status
 */
export function getValidTransitions(
  status: MilestoneStatus,
): MilestoneStatus[] {
  return VALID_TRANSITIONS[status] || [];
}

/**
 * Check if a status transition is valid
 */
export function isValidTransition(
  from: MilestoneStatus,
  to: MilestoneStatus,
): boolean {
  const validTransitions = VALID_TRANSITIONS[from] || [];
  return validTransitions.includes(to);
}
