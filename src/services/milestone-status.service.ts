import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Milestone } from '../entities/milestone.entity';
import { MilestoneNote } from '../entities/milestone-note.entity';
import { User } from '../entities/user.entity';
import {
  UpdateMilestoneStatusDto,
  CreateMilestoneNoteDto,
} from '../dto/milestone';
import {
  MilestoneNotFoundException,
  InvalidMilestoneStatusException,
  MilestoneValidationException,
  MilestonePermissionException,
} from '../common/exceptions';
import { MilestoneStatus } from '../common/enums/milestone-status.enum';
import { NoteType } from '../common/enums/note-type.enum';
import { UserRole } from '../common/enums/user-role.enum';

export interface StatusTransitionResult {
  milestone: Milestone;
  note?: MilestoneNote;
  supervisorNotified: boolean;
}

export interface StatusTransitionHistory {
  fromStatus: MilestoneStatus;
  toStatus: MilestoneStatus;
  timestamp: Date;
  reason?: string;
  userId: string;
}

export interface CompletionMetrics {
  estimatedHours: number;
  actualHours: number;
  variance: number;
  variancePercentage: number;
  isOverEstimate: boolean;
  isUnderEstimate: boolean;
}

@Injectable()
export class MilestoneStatusService {
  private readonly logger = new Logger(MilestoneStatusService.name);

  constructor(
    @InjectRepository(Milestone)
    private readonly milestoneRepository: Repository<Milestone>,
    @InjectRepository(MilestoneNote)
    private readonly milestoneNoteRepository: Repository<MilestoneNote>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async updateStatus(
    milestoneId: string,
    statusDto: UpdateMilestoneStatusDto,
    userId: string,
  ): Promise<StatusTransitionResult> {
    this.logger.log(
      `Updating milestone ${milestoneId} status to ${statusDto.status} by user ${userId}`,
    );

    const milestone = await this.getMilestoneWithPermissionCheck(
      milestoneId,
      userId,
    );
    const previousStatus = milestone.status;

    // Validate status transition
    if (!this.canTransitionTo(milestone.status, statusDto.status)) {
      throw new InvalidMilestoneStatusException(
        milestone.status,
        statusDto.status,
      );
    }

    // Handle specific status transitions
    const result = await this.handleStatusTransition(
      milestone,
      statusDto,
      userId,
      previousStatus,
    );

    this.logger.log(
      `Successfully updated milestone ${milestoneId} status from ${previousStatus} to ${statusDto.status}`,
    );

    return result;
  }

  async getStatusHistory(
    milestoneId: string,
    userId: string,
  ): Promise<StatusTransitionHistory[]> {
    this.logger.log(`Getting status history for milestone ${milestoneId}`);

    // Verify user has permission to view this milestone
    await this.getMilestoneWithPermissionCheck(milestoneId, userId);

    // Get status change notes
    const statusNotes = await this.milestoneNoteRepository.find({
      where: {
        milestoneId,
        type: NoteType.PROGRESS,
      },
      relations: ['author'],
      order: { createdAt: 'ASC' },
    });

    // Convert notes to status history (simplified implementation)
    // In a full implementation, you might want a dedicated status_history table
    const history: StatusTransitionHistory[] = statusNotes.map(
      (note, index) => ({
        fromStatus:
          index === 0
            ? MilestoneStatus.NOT_STARTED
            : MilestoneStatus.IN_PROGRESS,
        toStatus: MilestoneStatus.IN_PROGRESS,
        timestamp: note.createdAt,
        reason: note.content,
        userId: note.authorId,
      }),
    );

    return history;
  }

  async getCompletionMetrics(
    milestoneId: string,
    userId: string,
  ): Promise<CompletionMetrics | null> {
    this.logger.log(`Getting completion metrics for milestone ${milestoneId}`);

    const milestone = await this.getMilestoneWithPermissionCheck(
      milestoneId,
      userId,
    );

    if (milestone.status !== MilestoneStatus.COMPLETED) {
      return null;
    }

    const estimatedHours = milestone.estimatedHours || 0;
    const actualHours = milestone.actualHours || 0;
    const variance = actualHours - estimatedHours;
    const variancePercentage =
      estimatedHours > 0 ? (variance / estimatedHours) * 100 : 0;

    return {
      estimatedHours,
      actualHours,
      variance,
      variancePercentage: Math.round(variancePercentage * 100) / 100,
      isOverEstimate: variance > 0,
      isUnderEstimate: variance < 0,
    };
  }

  async validateStatusTransition(
    currentStatus: MilestoneStatus,
    targetStatus: MilestoneStatus,
  ): Promise<{ isValid: boolean; reason?: string }> {
    if (this.canTransitionTo(currentStatus, targetStatus)) {
      return { isValid: true };
    }

    const reason = this.getTransitionErrorReason(currentStatus, targetStatus);
    return { isValid: false, reason };
  }

  async getBlockedMilestones(supervisorId: string): Promise<Milestone[]> {
    this.logger.log(
      `Getting blocked milestones for supervisor ${supervisorId}`,
    );

    // Get all blocked milestones for students supervised by this supervisor
    // Note: This would need to be implemented based on the actual supervisor-student relationship
    const blockedMilestones = await this.milestoneRepository.find({
      where: {
        status: MilestoneStatus.BLOCKED,
      },
      relations: ['student', 'project'],
    });

    // Filter by supervisor (simplified - would need proper relationship)
    return blockedMilestones.filter(
      (milestone) => milestone.project?.supervisorId === supervisorId,
    );
  }

  async unblockMilestone(
    milestoneId: string,
    userId: string,
    resolution: string,
  ): Promise<StatusTransitionResult> {
    this.logger.log(`Unblocking milestone ${milestoneId} by user ${userId}`);

    const milestone = await this.getMilestoneWithPermissionCheck(
      milestoneId,
      userId,
    );

    if (milestone.status !== MilestoneStatus.BLOCKED) {
      throw new MilestoneValidationException(
        'Milestone is not currently blocked',
      );
    }

    const statusDto: UpdateMilestoneStatusDto = {
      status: MilestoneStatus.IN_PROGRESS,
      notes: `Unblocked: ${resolution}`,
    };

    return this.updateStatus(milestoneId, statusDto, userId);
  }

  private async handleStatusTransition(
    milestone: Milestone,
    statusDto: UpdateMilestoneStatusDto,
    userId: string,
    previousStatus: MilestoneStatus,
  ): Promise<StatusTransitionResult> {
    let note: MilestoneNote | undefined;
    let supervisorNotified = false;

    // Handle completion
    if (statusDto.status === MilestoneStatus.COMPLETED) {
      milestone.completedAt = new Date();
      if (statusDto.actualHours !== undefined) {
        milestone.actualHours = statusDto.actualHours;
      }
    } else if (previousStatus === MilestoneStatus.COMPLETED) {
      // Reopening completed milestone
      milestone.completedAt = null;
    }

    // Handle blocking
    if (statusDto.status === MilestoneStatus.BLOCKED) {
      if (!statusDto.blockingReason) {
        throw new MilestoneValidationException(
          'Blocking reason is required when marking milestone as blocked',
        );
      }
      milestone.blockingReason = statusDto.blockingReason;

      // Notify supervisor about blocked milestone
      supervisorNotified =
        await this.notifySupervisorAboutBlockedMilestone(milestone);
    } else {
      milestone.blockingReason = null;
    }

    milestone.status = statusDto.status;

    // Add status change note if notes provided
    if (statusDto.notes) {
      const noteDto: CreateMilestoneNoteDto = {
        content: statusDto.notes,
        type: this.getNoteTypeForStatus(statusDto.status),
      };

      note = await this.createStatusNote(milestone.id, noteDto, userId);
    }

    const updatedMilestone = await this.milestoneRepository.save(milestone);

    return {
      milestone: updatedMilestone,
      note,
      supervisorNotified,
    };
  }

  private canTransitionTo(
    currentStatus: MilestoneStatus,
    targetStatus: MilestoneStatus,
  ): boolean {
    const validTransitions: Record<MilestoneStatus, MilestoneStatus[]> = {
      [MilestoneStatus.NOT_STARTED]: [
        MilestoneStatus.IN_PROGRESS,
        MilestoneStatus.BLOCKED,
        MilestoneStatus.CANCELLED,
      ],
      [MilestoneStatus.IN_PROGRESS]: [
        MilestoneStatus.COMPLETED,
        MilestoneStatus.BLOCKED,
        MilestoneStatus.CANCELLED,
        MilestoneStatus.NOT_STARTED, // Allow going back
      ],
      [MilestoneStatus.BLOCKED]: [
        MilestoneStatus.IN_PROGRESS,
        MilestoneStatus.CANCELLED,
        MilestoneStatus.NOT_STARTED, // Allow reset
      ],
      [MilestoneStatus.COMPLETED]: [
        MilestoneStatus.IN_PROGRESS, // Allow reopening
      ],
      [MilestoneStatus.CANCELLED]: [
        MilestoneStatus.NOT_STARTED, // Allow reactivation
      ],
    };

    return validTransitions[currentStatus]?.includes(targetStatus) || false;
  }

  private getTransitionErrorReason(
    currentStatus: MilestoneStatus,
    targetStatus: MilestoneStatus,
  ): string {
    const statusNames = {
      [MilestoneStatus.NOT_STARTED]: 'Not Started',
      [MilestoneStatus.IN_PROGRESS]: 'In Progress',
      [MilestoneStatus.COMPLETED]: 'Completed',
      [MilestoneStatus.BLOCKED]: 'Blocked',
      [MilestoneStatus.CANCELLED]: 'Cancelled',
    };

    return `Cannot transition from ${statusNames[currentStatus]} to ${statusNames[targetStatus]}`;
  }

  private getNoteTypeForStatus(status: MilestoneStatus): NoteType {
    switch (status) {
      case MilestoneStatus.BLOCKED:
        return NoteType.ISSUE;
      case MilestoneStatus.COMPLETED:
        return NoteType.PROGRESS;
      case MilestoneStatus.CANCELLED:
        return NoteType.ISSUE;
      default:
        return NoteType.PROGRESS;
    }
  }

  private async createStatusNote(
    milestoneId: string,
    noteDto: CreateMilestoneNoteDto,
    authorId: string,
  ): Promise<MilestoneNote> {
    const note = this.milestoneNoteRepository.create({
      ...noteDto,
      milestoneId,
      authorId,
    });

    const savedNote = await this.milestoneNoteRepository.save(note);

    const noteWithAuthor = await this.milestoneNoteRepository.findOne({
      where: { id: savedNote.id },
      relations: ['author'],
    });

    if (!noteWithAuthor) {
      throw new MilestoneValidationException('Failed to retrieve saved note');
    }

    return noteWithAuthor;
  }

  private async getMilestoneWithPermissionCheck(
    milestoneId: string,
    userId: string,
  ): Promise<Milestone> {
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
      throw new MilestonePermissionException(
        'Insufficient permissions to modify this milestone',
      );
    }

    return milestone;
  }

  private async notifySupervisorAboutBlockedMilestone(
    milestone: Milestone,
  ): Promise<boolean> {
    try {
      // TODO: Implement actual supervisor notification logic
      // This could involve:
      // 1. Finding the supervisor for the student
      // 2. Sending email notification
      // 3. Creating in-app notification
      // 4. Logging the notification for audit purposes

      this.logger.log(
        `Milestone ${milestone.id} is blocked: ${milestone.blockingReason}`,
      );

      // For now, just log the blocking. In a full implementation, this would:
      // - Find supervisor through project or student relationship
      // - Send notification via email service
      // - Create in-app notification record
      // - Return true if notification was sent successfully

      return true; // Simulate successful notification
    } catch (error) {
      this.logger.error(
        `Failed to notify supervisor about blocked milestone ${milestone.id}`,
        error,
      );
      return false;
    }
  }
}
