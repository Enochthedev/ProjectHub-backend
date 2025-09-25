import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import ical, {
  ICalCalendar,
  ICalEvent,
  ICalEventStatus,
  ICalAlarmType,
} from 'ical-generator';
import { Milestone } from '../entities/milestone.entity';
import { User } from '../entities/user.entity';
import { MilestoneStatus, Priority, UserRole } from '../common/enums';
import {
  MilestoneNotFoundException,
  MilestonePermissionException,
  ICalExportException,
} from '../common/exceptions';

export interface ICalExportOptions {
  includeCompleted?: boolean;
  includeCancelled?: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
  projectId?: string;
}

export interface ICalExportResult {
  calendar: string;
  filename: string;
  mimeType: string;
}

@Injectable()
export class ICalExportService {
  private readonly logger = new Logger(ICalExportService.name);

  constructor(
    @InjectRepository(Milestone)
    private readonly milestoneRepository: Repository<Milestone>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Export milestones for a specific student as iCal format
   */
  async exportStudentMilestones(
    studentId: string,
    options: ICalExportOptions = {},
  ): Promise<ICalExportResult> {
    this.logger.log(`Exporting milestones for student ${studentId}`);

    // Validate student exists
    const student = await this.userRepository.findOne({
      where: { id: studentId },
    });

    if (!student) {
      throw new MilestoneNotFoundException(
        `Student with ID ${studentId} not found`,
      );
    }

    // Build query for milestones
    const queryBuilder = this.milestoneRepository
      .createQueryBuilder('milestone')
      .leftJoinAndSelect('milestone.project', 'project')
      .where('milestone.studentId = :studentId', { studentId });

    // Apply filters based on options
    if (!options.includeCompleted) {
      queryBuilder.andWhere('milestone.status != :completed', {
        completed: MilestoneStatus.COMPLETED,
      });
    }

    if (!options.includeCancelled) {
      queryBuilder.andWhere('milestone.status != :cancelled', {
        cancelled: MilestoneStatus.CANCELLED,
      });
    }

    if (options.dateRange) {
      queryBuilder.andWhere('milestone.dueDate BETWEEN :start AND :end', {
        start: options.dateRange.start.toISOString().split('T')[0],
        end: options.dateRange.end.toISOString().split('T')[0],
      });
    }

    if (options.projectId) {
      queryBuilder.andWhere('milestone.projectId = :projectId', {
        projectId: options.projectId,
      });
    }

    queryBuilder.orderBy('milestone.dueDate', 'ASC');

    const milestones = await queryBuilder.getMany();

    // Generate iCal calendar
    const calendar = this.generateICalCalendar(milestones, student);

    const filename = this.generateFilename(student, options);

    return {
      calendar: calendar.toString(),
      filename,
      mimeType: 'text/calendar',
    };
  }

  /**
   * Export a single milestone as iCal format
   */
  async exportSingleMilestone(
    milestoneId: string,
    userId: string,
  ): Promise<ICalExportResult> {
    this.logger.log(
      `Exporting single milestone ${milestoneId} for user ${userId}`,
    );

    const milestone = await this.milestoneRepository.findOne({
      where: { id: milestoneId },
      relations: ['student', 'project'],
    });

    if (!milestone) {
      throw new MilestoneNotFoundException(milestoneId);
    }

    // Check permissions
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new MilestonePermissionException('User not found');
    }

    const canAccess =
      milestone.studentId === userId || // Student owns the milestone
      user.role === UserRole.ADMIN || // Admin can access all
      (user.role === UserRole.SUPERVISOR &&
        milestone.project?.supervisorId === userId); // Supervisor can access their students' milestones

    if (!canAccess) {
      throw new MilestonePermissionException();
    }

    // Generate iCal calendar with single milestone
    const calendar = this.generateICalCalendar([milestone], milestone.student);

    const filename = `milestone-${milestone.title.replace(/[^a-zA-Z0-9]/g, '-')}.ics`;

    return {
      calendar: calendar.toString(),
      filename,
      mimeType: 'text/calendar',
    };
  }

  /**
   * Export milestones for multiple students (supervisor/admin use)
   */
  async exportMultipleStudentMilestones(
    studentIds: string[],
    requesterId: string,
    options: ICalExportOptions = {},
  ): Promise<ICalExportResult> {
    this.logger.log(
      `Exporting milestones for ${studentIds.length} students by user ${requesterId}`,
    );

    // Validate requester permissions
    const requester = await this.userRepository.findOne({
      where: { id: requesterId },
    });

    if (!requester) {
      throw new MilestonePermissionException('Requester not found');
    }

    if (
      requester.role !== UserRole.ADMIN &&
      requester.role !== UserRole.SUPERVISOR
    ) {
      throw new MilestonePermissionException(
        'Only supervisors and admins can export multiple student milestones',
      );
    }

    // Build query for milestones
    const queryBuilder = this.milestoneRepository
      .createQueryBuilder('milestone')
      .leftJoinAndSelect('milestone.student', 'student')
      .leftJoinAndSelect('milestone.project', 'project')
      .where('milestone.studentId IN (:...studentIds)', { studentIds });

    // For supervisors, ensure they can only access their students
    if (requester.role === UserRole.SUPERVISOR) {
      queryBuilder.andWhere('project.supervisorId = :supervisorId', {
        supervisorId: requesterId,
      });
    }

    // Apply filters
    if (!options.includeCompleted) {
      queryBuilder.andWhere('milestone.status != :completed', {
        completed: MilestoneStatus.COMPLETED,
      });
    }

    if (!options.includeCancelled) {
      queryBuilder.andWhere('milestone.status != :cancelled', {
        cancelled: MilestoneStatus.CANCELLED,
      });
    }

    if (options.dateRange) {
      queryBuilder.andWhere('milestone.dueDate BETWEEN :start AND :end', {
        start: options.dateRange.start.toISOString().split('T')[0],
        end: options.dateRange.end.toISOString().split('T')[0],
      });
    }

    if (options.projectId) {
      queryBuilder.andWhere('milestone.projectId = :projectId', {
        projectId: options.projectId,
      });
    }

    queryBuilder.orderBy('milestone.dueDate', 'ASC');

    const milestones = await queryBuilder.getMany();

    // Generate iCal calendar
    const calendar = this.generateICalCalendar(milestones, requester, true);

    const filename = `milestones-export-${new Date().toISOString().split('T')[0]}.ics`;

    return {
      calendar: calendar.toString(),
      filename,
      mimeType: 'text/calendar',
    };
  }

  /**
   * Generate iCal calendar from milestones
   */
  private generateICalCalendar(
    milestones: Milestone[],
    user: User,
    isMultiStudent = false,
  ): ICalCalendar {
    try {
      const userName =
        user.studentProfile?.name ||
        user.supervisorProfile?.name ||
        user.email.split('@')[0];
      const calendar = ical({
        name: isMultiStudent
          ? 'FYP Milestones - Multiple Students'
          : `FYP Milestones - ${userName}`,
        description: isMultiStudent
          ? 'Final Year Project milestones for multiple students'
          : `Final Year Project milestones for ${userName}`,
        timezone: 'UTC',
      });

      milestones.forEach((milestone) => {
        const event = calendar.createEvent({
          start: this.getMilestoneStartDate(milestone),
          end: this.getMilestoneEndDate(milestone),
          summary: this.formatEventSummary(milestone, isMultiStudent),
          description: this.formatEventDescription(milestone),
          location: milestone.project?.title || 'Final Year Project',
          status: this.mapMilestoneStatusToICalStatus(milestone.status),
        });

        // Add reminders based on milestone priority
        this.addRemindersToEvent(event, milestone);

        // Set UID after creation
        event.uid(`milestone-${milestone.id}@fyp-platform.com`);
      });

      return calendar;
    } catch (error) {
      this.logger.error('Failed to generate iCal calendar', error);
      throw new ICalExportException('Failed to generate calendar export', {
        error: error.message,
      });
    }
  }

  /**
   * Get milestone start date (due date at 9 AM)
   */
  private getMilestoneStartDate(milestone: Milestone): Date {
    const startDate = new Date(milestone.dueDate);
    startDate.setHours(9, 0, 0, 0); // Set to 9 AM
    return startDate;
  }

  /**
   * Get milestone end date (due date at 5 PM)
   */
  private getMilestoneEndDate(milestone: Milestone): Date {
    const endDate = new Date(milestone.dueDate);
    endDate.setHours(17, 0, 0, 0); // Set to 5 PM
    return endDate;
  }

  /**
   * Format event summary
   */
  private formatEventSummary(
    milestone: Milestone,
    isMultiStudent: boolean,
  ): string {
    const statusEmoji = this.getStatusEmoji(milestone.status);
    const priorityEmoji = this.getPriorityEmoji(milestone.priority);

    let summary = `${statusEmoji}${priorityEmoji}${milestone.title}`;

    if (isMultiStudent && milestone.student) {
      const studentName =
        milestone.student.studentProfile?.name ||
        milestone.student.email.split('@')[0];
      summary += ` (${studentName})`;
    }

    return summary;
  }

  /**
   * Format event description
   */
  private formatEventDescription(milestone: Milestone): string {
    let description = milestone.description;

    description += `\n\nStatus: ${milestone.status}`;
    description += `\nPriority: ${milestone.priority}`;

    if (milestone.estimatedHours > 0) {
      description += `\nEstimated Hours: ${milestone.estimatedHours}`;
    }

    if (milestone.actualHours > 0) {
      description += `\nActual Hours: ${milestone.actualHours}`;
    }

    if (milestone.blockingReason) {
      description += `\nBlocking Reason: ${milestone.blockingReason}`;
    }

    if (milestone.project) {
      description += `\nProject: ${milestone.project.title}`;
    }

    description += `\n\nCreated: ${milestone.createdAt.toLocaleDateString()}`;
    description += `\nLast Updated: ${milestone.updatedAt.toLocaleDateString()}`;

    return description;
  }

  /**
   * Map milestone status to iCal status
   */
  private mapMilestoneStatusToICalStatus(
    status: MilestoneStatus,
  ): ICalEventStatus {
    switch (status) {
      case MilestoneStatus.COMPLETED:
        return ICalEventStatus.CONFIRMED;
      case MilestoneStatus.IN_PROGRESS:
        return ICalEventStatus.TENTATIVE;
      case MilestoneStatus.CANCELLED:
        return ICalEventStatus.CANCELLED;
      case MilestoneStatus.BLOCKED:
      case MilestoneStatus.NOT_STARTED:
      default:
        return ICalEventStatus.TENTATIVE;
    }
  }

  /**
   * Get milestone categories for iCal
   */
  private getMilestoneCategories(milestone: Milestone): string[] {
    const categories = ['FYP', 'Milestone'];

    categories.push(milestone.status);
    categories.push(milestone.priority);

    if (milestone.project) {
      categories.push('Project');
    }

    return categories;
  }

  /**
   * Map priority to iCal priority (1-9 scale, 1 = highest)
   */
  private mapPriorityToICalPriority(priority: Priority): number {
    switch (priority) {
      case Priority.CRITICAL:
        return 1;
      case Priority.HIGH:
        return 3;
      case Priority.MEDIUM:
        return 5;
      case Priority.LOW:
        return 7;
      default:
        return 5;
    }
  }

  /**
   * Add reminders to event based on milestone priority
   */
  private addRemindersToEvent(event: ICalEvent, milestone: Milestone): void {
    // Add reminders based on priority
    switch (milestone.priority) {
      case Priority.CRITICAL:
        event.createAlarm({
          type: ICalAlarmType.display,
          trigger: 60 * 60 * 24 * 7, // 7 days before
          description: `Critical milestone due in 1 week: ${milestone.title}`,
        });
        event.createAlarm({
          type: ICalAlarmType.display,
          trigger: 60 * 60 * 24 * 3, // 3 days before
          description: `Critical milestone due in 3 days: ${milestone.title}`,
        });
        event.createAlarm({
          type: ICalAlarmType.display,
          trigger: 60 * 60 * 24, // 1 day before
          description: `Critical milestone due tomorrow: ${milestone.title}`,
        });
        break;
      case Priority.HIGH:
        event.createAlarm({
          type: ICalAlarmType.display,
          trigger: 60 * 60 * 24 * 3, // 3 days before
          description: `High priority milestone due in 3 days: ${milestone.title}`,
        });
        event.createAlarm({
          type: ICalAlarmType.display,
          trigger: 60 * 60 * 24, // 1 day before
          description: `High priority milestone due tomorrow: ${milestone.title}`,
        });
        break;
      case Priority.MEDIUM:
        event.createAlarm({
          type: ICalAlarmType.display,
          trigger: 60 * 60 * 24, // 1 day before
          description: `Milestone due tomorrow: ${milestone.title}`,
        });
        break;
      case Priority.LOW:
        // No automatic reminders for low priority
        break;
    }
  }

  /**
   * Get status emoji
   */
  private getStatusEmoji(status: MilestoneStatus): string {
    switch (status) {
      case MilestoneStatus.COMPLETED:
        return '✅ ';
      case MilestoneStatus.IN_PROGRESS:
        return '🔄 ';
      case MilestoneStatus.BLOCKED:
        return '🚫 ';
      case MilestoneStatus.CANCELLED:
        return '❌ ';
      case MilestoneStatus.NOT_STARTED:
      default:
        return '📋 ';
    }
  }

  /**
   * Get priority emoji
   */
  private getPriorityEmoji(priority: Priority): string {
    switch (priority) {
      case Priority.CRITICAL:
        return '🔴 ';
      case Priority.HIGH:
        return '🟠 ';
      case Priority.MEDIUM:
        return '🟡 ';
      case Priority.LOW:
        return '🟢 ';
      default:
        return '';
    }
  }

  /**
   * Generate filename for export
   */
  private generateFilename(user: User, options: ICalExportOptions): string {
    const date = new Date().toISOString().split('T')[0];
    const displayName =
      user.studentProfile?.name ||
      user.supervisorProfile?.name ||
      user.email.split('@')[0];
    const userName = displayName.replace(/[^a-zA-Z0-9]/g, '-');

    let filename = `milestones-${userName}-${date}`;

    if (options.projectId) {
      filename += `-project-${options.projectId}`;
    }

    if (options.dateRange) {
      const startDate = options.dateRange.start.toISOString().split('T')[0];
      const endDate = options.dateRange.end.toISOString().split('T')[0];
      filename += `-${startDate}-to-${endDate}`;
    }

    return `${filename}.ics`;
  }
}
