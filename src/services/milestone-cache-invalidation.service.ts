import { Injectable, Logger } from '@nestjs/common';
import { MilestoneCacheService } from './milestone-cache.service';
import { Milestone } from '../entities/milestone.entity';
import { MilestoneStatus } from '../common/enums/milestone-status.enum';

export interface CacheInvalidationStrategy {
  shouldInvalidateProgress(
    milestone: Milestone,
    changes: Partial<Milestone>,
  ): boolean;
  shouldInvalidateAnalytics(
    milestone: Milestone,
    changes: Partial<Milestone>,
  ): boolean;
  shouldInvalidateSupervisorCaches(
    milestone: Milestone,
    changes: Partial<Milestone>,
  ): boolean;
  getAffectedStudents(
    milestone: Milestone,
    changes: Partial<Milestone>,
  ): string[];
  getAffectedSupervisors(
    milestone: Milestone,
    changes: Partial<Milestone>,
  ): string[];
}

@Injectable()
export class MilestoneCacheInvalidationService
  implements CacheInvalidationStrategy
{
  private readonly logger = new Logger(MilestoneCacheInvalidationService.name);

  constructor(private readonly cacheService: MilestoneCacheService) {}

  // Main invalidation method called when milestones are updated
  async invalidateCachesForMilestoneUpdate(
    milestone: Milestone,
    changes: Partial<Milestone>,
  ): Promise<void> {
    this.logger.log(
      `Processing cache invalidation for milestone ${milestone.id}`,
    );

    try {
      const affectedStudents = this.getAffectedStudents(milestone, changes);
      const affectedSupervisors = this.getAffectedSupervisors(
        milestone,
        changes,
      );

      // Invalidate student-specific caches
      for (const studentId of affectedStudents) {
        if (this.shouldInvalidateProgress(milestone, changes)) {
          await this.cacheService.invalidateProgressCache(studentId);
        }

        if (this.shouldInvalidateAnalytics(milestone, changes)) {
          await this.cacheService.invalidateAnalyticsCache(studentId);
        }
      }

      // Invalidate supervisor-specific caches
      if (this.shouldInvalidateSupervisorCaches(milestone, changes)) {
        for (const supervisorId of affectedSupervisors) {
          await this.cacheService.invalidateAllSupervisorCaches(supervisorId);
        }
      }

      this.logger.debug(
        `Cache invalidation completed for milestone ${milestone.id}`,
      );
    } catch (error) {
      this.logger.error(
        `Error invalidating caches for milestone ${milestone.id}:`,
        error,
      );
    }
  }

  // Invalidation for milestone creation
  async invalidateCachesForMilestoneCreation(
    milestone: Milestone,
  ): Promise<void> {
    this.logger.log(
      `Processing cache invalidation for new milestone ${milestone.id}`,
    );

    try {
      // Always invalidate progress and analytics for the student
      await this.cacheService.invalidateAllStudentCaches(milestone.studentId);

      // Invalidate supervisor caches if milestone affects reporting
      const supervisors = await this.getSupervisorsForStudent(
        milestone.studentId,
      );
      for (const supervisorId of supervisors) {
        await this.cacheService.invalidateAllSupervisorCaches(supervisorId);
      }

      this.logger.debug(
        `Cache invalidation completed for new milestone ${milestone.id}`,
      );
    } catch (error) {
      this.logger.error(
        `Error invalidating caches for new milestone ${milestone.id}:`,
        error,
      );
    }
  }

  // Invalidation for milestone deletion
  async invalidateCachesForMilestoneDeletion(
    milestone: Milestone,
  ): Promise<void> {
    this.logger.log(
      `Processing cache invalidation for deleted milestone ${milestone.id}`,
    );

    try {
      // Always invalidate all caches for the student
      await this.cacheService.invalidateAllStudentCaches(milestone.studentId);

      // Invalidate supervisor caches
      const supervisors = await this.getSupervisorsForStudent(
        milestone.studentId,
      );
      for (const supervisorId of supervisors) {
        await this.cacheService.invalidateAllSupervisorCaches(supervisorId);
      }

      this.logger.debug(
        `Cache invalidation completed for deleted milestone ${milestone.id}`,
      );
    } catch (error) {
      this.logger.error(
        `Error invalidating caches for deleted milestone ${milestone.id}:`,
        error,
      );
    }
  }

  // Bulk invalidation for multiple milestones
  async invalidateCachesForBulkMilestoneUpdate(
    milestones: Milestone[],
  ): Promise<void> {
    this.logger.log(
      `Processing bulk cache invalidation for ${milestones.length} milestones`,
    );

    try {
      const affectedStudents = new Set<string>();
      const affectedSupervisors = new Set<string>();

      // Collect all affected students and supervisors
      for (const milestone of milestones) {
        affectedStudents.add(milestone.studentId);

        const supervisors = await this.getSupervisorsForStudent(
          milestone.studentId,
        );
        supervisors.forEach((id) => affectedSupervisors.add(id));
      }

      // Invalidate all caches for affected students
      const studentInvalidations = Array.from(affectedStudents).map(
        (studentId) => this.cacheService.invalidateAllStudentCaches(studentId),
      );

      // Invalidate all caches for affected supervisors
      const supervisorInvalidations = Array.from(affectedSupervisors).map(
        (supervisorId) =>
          this.cacheService.invalidateAllSupervisorCaches(supervisorId),
      );

      await Promise.all([...studentInvalidations, ...supervisorInvalidations]);

      this.logger.debug(
        `Bulk cache invalidation completed for ${milestones.length} milestones`,
      );
    } catch (error) {
      this.logger.error(`Error in bulk cache invalidation:`, error);
    }
  }

  // Strategy implementation methods
  shouldInvalidateProgress(
    milestone: Milestone,
    changes: Partial<Milestone>,
  ): boolean {
    // Invalidate progress cache if any of these fields change
    const progressAffectingFields = [
      'status',
      'completedAt',
      'dueDate',
      'priority',
      'estimatedHours',
      'actualHours',
    ];

    return progressAffectingFields.some(
      (field) =>
        changes.hasOwnProperty(field) && changes[field] !== milestone[field],
    );
  }

  shouldInvalidateAnalytics(
    milestone: Milestone,
    changes: Partial<Milestone>,
  ): boolean {
    // Analytics are more sensitive to changes, invalidate for most updates
    const analyticsAffectingFields = [
      'status',
      'completedAt',
      'dueDate',
      'priority',
      'estimatedHours',
      'actualHours',
      'blockingReason',
    ];

    return analyticsAffectingFields.some(
      (field) =>
        changes.hasOwnProperty(field) && changes[field] !== milestone[field],
    );
  }

  shouldInvalidateSupervisorCaches(
    milestone: Milestone,
    changes: Partial<Milestone>,
  ): boolean {
    // Supervisor caches should be invalidated for significant changes
    const supervisorAffectingFields = [
      'status',
      'completedAt',
      'dueDate',
      'priority',
      'blockingReason',
    ];

    // Always invalidate if milestone becomes overdue or blocked
    if (
      changes.status === MilestoneStatus.BLOCKED ||
      changes.status === MilestoneStatus.COMPLETED ||
      (changes.dueDate && new Date(changes.dueDate) < new Date())
    ) {
      return true;
    }

    return supervisorAffectingFields.some(
      (field) =>
        changes.hasOwnProperty(field) && changes[field] !== milestone[field],
    );
  }

  getAffectedStudents(
    milestone: Milestone,
    changes: Partial<Milestone>,
  ): string[] {
    const affectedStudents = [milestone.studentId];

    // If student ID is changing (rare case), include both old and new
    if (changes.studentId && changes.studentId !== milestone.studentId) {
      affectedStudents.push(changes.studentId);
    }

    return affectedStudents;
  }

  getAffectedSupervisors(
    milestone: Milestone,
    changes: Partial<Milestone>,
  ): string[] {
    // For now, return empty array as supervisor relationships need to be implemented
    // In a real implementation, this would query the database for supervisors
    return [];
  }

  // Scheduled cache invalidation for time-based changes
  async invalidateTimeBasedCaches(): Promise<void> {
    this.logger.log('Running scheduled time-based cache invalidation');

    try {
      // This would typically be called by a cron job to handle:
      // 1. Milestones that become overdue
      // 2. Progress calculations that need daily updates
      // 3. Analytics that should be refreshed periodically

      // For now, we'll implement a simple approach
      // In a real implementation, you would query for milestones that became overdue
      // and invalidate caches for their students and supervisors

      this.logger.debug('Time-based cache invalidation completed');
    } catch (error) {
      this.logger.error('Error in time-based cache invalidation:', error);
    }
  }

  // Cache warming strategies
  async warmupCriticalCaches(): Promise<void> {
    this.logger.log('Warming up critical caches');

    try {
      // This could be called during low-traffic periods to pre-populate caches
      // for frequently accessed data like supervisor dashboards

      this.logger.debug('Critical cache warmup completed');
    } catch (error) {
      this.logger.error('Error warming up critical caches:', error);
    }
  }

  // Smart invalidation based on usage patterns
  async smartInvalidation(
    milestone: Milestone,
    changes: Partial<Milestone>,
  ): Promise<void> {
    this.logger.log(`Running smart invalidation for milestone ${milestone.id}`);

    try {
      // Implement intelligent invalidation based on:
      // 1. Cache access patterns
      // 2. Data freshness requirements
      // 3. User activity patterns

      const isHighPriority =
        milestone.priority === 'high' || milestone.priority === 'critical';
      const isStatusChange =
        changes.status && changes.status !== milestone.status;
      const isOverdue = milestone.dueDate < new Date();

      // Prioritize invalidation for high-impact changes
      if (isHighPriority || isStatusChange || isOverdue) {
        await this.invalidateCachesForMilestoneUpdate(milestone, changes);
      } else {
        // For low-impact changes, use delayed invalidation
        setTimeout(async () => {
          await this.invalidateCachesForMilestoneUpdate(milestone, changes);
        }, 5000); // 5-second delay
      }

      this.logger.debug(
        `Smart invalidation completed for milestone ${milestone.id}`,
      );
    } catch (error) {
      this.logger.error(
        `Error in smart invalidation for milestone ${milestone.id}:`,
        error,
      );
    }
  }

  // Private helper methods
  private async getSupervisorsForStudent(studentId: string): Promise<string[]> {
    // Placeholder implementation
    // In a real implementation, this would query the database for supervisors
    // associated with the student's projects
    return [];
  }

  // Cache invalidation patterns for different scenarios
  async invalidateForStatusChange(
    milestone: Milestone,
    newStatus: MilestoneStatus,
  ): Promise<void> {
    const changes = { status: newStatus };

    // Status changes always require immediate invalidation
    await this.invalidateCachesForMilestoneUpdate(milestone, changes);

    // Special handling for completion
    if (newStatus === MilestoneStatus.COMPLETED) {
      // Warm up analytics cache as it's likely to be accessed soon
      await this.cacheService.warmupCache(milestone.studentId);
    }
  }

  async invalidateForDueDateChange(
    milestone: Milestone,
    newDueDate: Date,
  ): Promise<void> {
    const changes = { dueDate: newDueDate };

    // Due date changes affect scheduling and risk calculations
    await this.invalidateCachesForMilestoneUpdate(milestone, changes);
  }

  async invalidateForProgressUpdate(
    milestone: Milestone,
    actualHours: number,
  ): Promise<void> {
    const changes = { actualHours };

    // Progress updates primarily affect analytics
    if (this.shouldInvalidateAnalytics(milestone, changes)) {
      await this.cacheService.invalidateAnalyticsCache(milestone.studentId);
    }
  }
}
