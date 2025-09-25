import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Between, Like, In } from 'typeorm';
import { Milestone } from '../entities/milestone.entity';
import { MilestoneNote } from '../entities/milestone-note.entity';
import { User } from '../entities/user.entity';
import { Project } from '../entities/project.entity';
import {
  CreateMilestoneDto,
  UpdateMilestoneDto,
  UpdateMilestoneStatusDto,
  MilestoneFiltersDto,
  CreateMilestoneNoteDto,
  ProjectProgressDto,
  MilestoneProgressDto,
} from '../dto/milestone';
import {
  MilestoneNotFoundException,
  InvalidMilestoneStatusException,
  MilestoneValidationException,
  MilestonePermissionException,
  MilestoneDependencyException,
  AcademicCalendarException,
} from '../common/exceptions';
import { MilestoneStatus } from '../common/enums/milestone-status.enum';
import { UserRole } from '../common/enums/user-role.enum';
import { NoteType } from '../common/enums/note-type.enum';
import { MilestoneCacheService } from './milestone-cache.service';
import { MilestoneCacheInvalidationService } from './milestone-cache-invalidation.service';

export interface MilestoneServiceInterface {
  createMilestone(
    createDto: CreateMilestoneDto,
    studentId: string,
  ): Promise<Milestone>;
  updateMilestone(
    id: string,
    updateDto: UpdateMilestoneDto,
    userId: string,
  ): Promise<Milestone>;
  updateMilestoneStatus(
    id: string,
    statusDto: UpdateMilestoneStatusDto,
    userId: string,
  ): Promise<Milestone>;
  deleteMilestone(id: string, userId: string): Promise<void>;
  getStudentMilestones(
    studentId: string,
    filters?: MilestoneFiltersDto,
  ): Promise<{ milestones: Milestone[]; total: number }>;
  getMilestoneById(id: string, userId: string): Promise<Milestone>;
  addMilestoneNote(
    milestoneId: string,
    noteDto: CreateMilestoneNoteDto,
    authorId: string,
  ): Promise<MilestoneNote>;
  calculateProjectProgress(studentId: string): Promise<ProjectProgressDto>;
}

@Injectable()
export class MilestoneService implements MilestoneServiceInterface {
  private readonly logger = new Logger(MilestoneService.name);

  constructor(
    @InjectRepository(Milestone)
    private readonly milestoneRepository: Repository<Milestone>,
    @InjectRepository(MilestoneNote)
    private readonly milestoneNoteRepository: Repository<MilestoneNote>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    private readonly dataSource: DataSource,
    private readonly cacheService: MilestoneCacheService,
    private readonly cacheInvalidationService: MilestoneCacheInvalidationService,
  ) {}

  async createMilestone(
    createDto: CreateMilestoneDto,
    studentId: string,
  ): Promise<Milestone> {
    this.logger.log(`Creating milestone for student ${studentId}`);

    // Validate student exists
    const student = await this.userRepository.findOne({
      where: { id: studentId },
    });

    if (!student) {
      throw new MilestoneValidationException('Student not found');
    }

    // Validate due date is in the future
    const dueDate = new Date(createDto.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);

    if (dueDate <= today) {
      throw new MilestoneValidationException('Due date must be in the future');
    }

    // Validate academic calendar (basic validation - can be extended)
    await this.validateAcademicCalendar(dueDate);

    // Validate project if provided
    if (createDto.projectId) {
      const project = await this.projectRepository.findOne({
        where: { id: createDto.projectId },
      });

      if (!project) {
        throw new MilestoneValidationException('Project not found');
      }

      // Note: Project validation would need to be implemented based on actual project-student relationship
      // For now, we'll skip this validation as the Project entity structure needs clarification
    }

    // Check for scheduling conflicts
    await this.checkSchedulingConflicts(studentId, dueDate);

    const milestone = this.milestoneRepository.create({
      ...createDto,
      studentId,
      dueDate,
      status: MilestoneStatus.NOT_STARTED,
    });

    const savedMilestone = await this.milestoneRepository.save(milestone);

    // Invalidate caches after milestone creation
    await this.cacheInvalidationService.invalidateCachesForMilestoneCreation(
      savedMilestone,
    );

    this.logger.log(
      `Created milestone ${savedMilestone.id} for student ${studentId}`,
    );

    return this.getMilestoneById(savedMilestone.id, studentId);
  }

  async updateMilestone(
    id: string,
    updateDto: UpdateMilestoneDto,
    userId: string,
  ): Promise<Milestone> {
    this.logger.log(`Updating milestone ${id} by user ${userId}`);

    const milestone = await this.getMilestoneWithPermissionCheck(id, userId);

    // Validate due date if provided
    if (updateDto.dueDate) {
      const dueDate = new Date(updateDto.dueDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (dueDate <= today) {
        throw new MilestoneValidationException(
          'Due date must be in the future',
        );
      }

      await this.validateAcademicCalendar(dueDate);
      await this.checkSchedulingConflicts(milestone.studentId, dueDate, id);
    }

    // Validate project if provided
    if (updateDto.projectId) {
      const project = await this.projectRepository.findOne({
        where: { id: updateDto.projectId },
      });

      if (!project) {
        throw new MilestoneValidationException('Project not found');
      }

      // Note: Project validation would need to be implemented based on actual project-student relationship
      // For now, we'll skip this validation as the Project entity structure needs clarification
    }

    const originalMilestone = { ...milestone } as Milestone;
    Object.assign(milestone, updateDto);

    if (updateDto.dueDate) {
      milestone.dueDate = new Date(updateDto.dueDate);
    }

    const updatedMilestone = await this.milestoneRepository.save(milestone);

    // Invalidate caches after milestone update
    const updateChanges: Partial<Milestone> = {
      ...updateDto,
      dueDate: updateDto.dueDate ? new Date(updateDto.dueDate) : undefined,
    };
    await this.cacheInvalidationService.invalidateCachesForMilestoneUpdate(
      originalMilestone,
      updateChanges,
    );

    this.logger.log(`Updated milestone ${id}`);

    return this.getMilestoneById(updatedMilestone.id, userId);
  }

  async updateMilestoneStatus(
    id: string,
    statusDto: UpdateMilestoneStatusDto,
    userId: string,
  ): Promise<Milestone> {
    this.logger.log(
      `Updating milestone ${id} status to ${statusDto.status} by user ${userId}`,
    );

    const milestone = await this.getMilestoneWithPermissionCheck(id, userId);

    // Validate status transition
    if (!milestone.canTransitionTo(statusDto.status)) {
      throw new InvalidMilestoneStatusException(
        milestone.status,
        statusDto.status,
      );
    }

    // Handle completion
    if (statusDto.status === MilestoneStatus.COMPLETED) {
      milestone.completedAt = new Date();
      if (statusDto.actualHours !== undefined) {
        milestone.actualHours = statusDto.actualHours;
      }
    } else if (milestone.status === MilestoneStatus.COMPLETED) {
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

      // TODO: Notify supervisor about blocked milestone
      await this.notifySupervisorAboutBlockedMilestone(milestone);
    } else {
      milestone.blockingReason = null;
    }

    milestone.status = statusDto.status;

    // Add status change note if notes provided
    if (statusDto.notes) {
      const noteDto: CreateMilestoneNoteDto = {
        content: statusDto.notes,
        type:
          statusDto.status === MilestoneStatus.BLOCKED
            ? NoteType.ISSUE
            : NoteType.PROGRESS,
      };

      await this.addMilestoneNote(id, noteDto, userId);
    }

    const updatedMilestone = await this.milestoneRepository.save(milestone);

    // Invalidate caches after status update
    await this.cacheInvalidationService.invalidateForStatusChange(
      milestone,
      statusDto.status,
    );

    this.logger.log(`Updated milestone ${id} status to ${statusDto.status}`);

    return this.getMilestoneById(updatedMilestone.id, userId);
  }

  async deleteMilestone(id: string, userId: string): Promise<void> {
    this.logger.log(`Deleting milestone ${id} by user ${userId}`);

    const milestone = await this.getMilestoneWithPermissionCheck(id, userId);

    // Check for dependencies (e.g., related notes, reminders)
    const noteCount = await this.milestoneNoteRepository.count({
      where: { milestoneId: id },
    });

    if (noteCount > 0) {
      throw new MilestoneDependencyException(
        'Cannot delete milestone with existing notes. Consider marking as cancelled instead.',
        { noteCount },
      );
    }

    await this.milestoneRepository.remove(milestone);

    // Invalidate caches after milestone deletion
    await this.cacheInvalidationService.invalidateCachesForMilestoneDeletion(
      milestone,
    );

    this.logger.log(`Deleted milestone ${id}`);
  }

  async getStudentMilestones(
    studentId: string,
    filters: MilestoneFiltersDto = {},
  ): Promise<{ milestones: Milestone[]; total: number }> {
    this.logger.log(
      `Getting milestones for student ${studentId} with filters`,
      filters,
    );

    const queryBuilder = this.milestoneRepository
      .createQueryBuilder('milestone')
      .leftJoinAndSelect('milestone.project', 'project')
      .leftJoinAndSelect('milestone.notes', 'notes')
      .where('milestone.studentId = :studentId', { studentId });

    // Apply filters
    if (filters.status) {
      queryBuilder.andWhere('milestone.status = :status', {
        status: filters.status,
      });
    }

    if (filters.priority) {
      queryBuilder.andWhere('milestone.priority = :priority', {
        priority: filters.priority,
      });
    }

    if (filters.projectId) {
      queryBuilder.andWhere('milestone.projectId = :projectId', {
        projectId: filters.projectId,
      });
    }

    if (filters.dueDateFrom) {
      queryBuilder.andWhere('milestone.dueDate >= :dueDateFrom', {
        dueDateFrom: filters.dueDateFrom,
      });
    }

    if (filters.dueDateTo) {
      queryBuilder.andWhere('milestone.dueDate <= :dueDateTo', {
        dueDateTo: filters.dueDateTo,
      });
    }

    if (filters.isOverdue !== undefined) {
      const today = new Date().toISOString().split('T')[0];
      if (filters.isOverdue) {
        queryBuilder.andWhere(
          'milestone.dueDate < :today AND milestone.status != :completed',
          {
            today,
            completed: MilestoneStatus.COMPLETED,
          },
        );
      } else {
        queryBuilder.andWhere(
          'milestone.dueDate >= :today OR milestone.status = :completed',
          {
            today,
            completed: MilestoneStatus.COMPLETED,
          },
        );
      }
    }

    if (filters.search) {
      queryBuilder.andWhere(
        '(milestone.title ILIKE :search OR milestone.description ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    // Get total count
    const total = await queryBuilder.getCount();

    // Apply pagination
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    queryBuilder
      .orderBy('milestone.dueDate', 'ASC')
      .addOrderBy('milestone.priority', 'DESC')
      .skip(offset)
      .take(limit);

    const milestones = await queryBuilder.getMany();

    return { milestones, total };
  }

  async getMilestoneById(id: string, userId: string): Promise<Milestone> {
    const milestone = await this.milestoneRepository.findOne({
      where: { id },
      relations: ['student', 'project', 'notes', 'notes.author'],
    });

    if (!milestone) {
      throw new MilestoneNotFoundException(id);
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

    return milestone;
  }

  async addMilestoneNote(
    milestoneId: string,
    noteDto: CreateMilestoneNoteDto,
    authorId: string,
  ): Promise<MilestoneNote> {
    this.logger.log(
      `Adding note to milestone ${milestoneId} by user ${authorId}`,
    );

    // Verify milestone exists and user has permission
    await this.getMilestoneById(milestoneId, authorId);

    const note = this.milestoneNoteRepository.create({
      ...noteDto,
      milestoneId,
      authorId,
    });

    const savedNote = await this.milestoneNoteRepository.save(note);

    this.logger.log(`Added note ${savedNote.id} to milestone ${milestoneId}`);

    const noteWithAuthor = await this.milestoneNoteRepository.findOne({
      where: { id: savedNote.id },
      relations: ['author'],
    });

    if (!noteWithAuthor) {
      throw new MilestoneValidationException('Failed to retrieve saved note');
    }

    return noteWithAuthor;
  }

  async calculateProjectProgress(
    studentId: string,
  ): Promise<ProjectProgressDto> {
    this.logger.log(`Calculating project progress for student ${studentId}`);

    // Try to get cached progress first
    const cachedProgress = await this.cacheService.getCachedProgress(studentId);
    if (cachedProgress) {
      this.logger.debug(`Returning cached progress for student ${studentId}`);
      return cachedProgress;
    }

    const milestones = await this.milestoneRepository.find({
      where: { studentId },
      order: { dueDate: 'ASC' },
    });

    if (milestones.length === 0) {
      return {
        overallProgress: 0,
        totalMilestones: 0,
        completedMilestones: 0,
        inProgressMilestones: 0,
        blockedMilestones: 0,
        overdueMilestones: 0,
        estimatedCompletionDate: null,
        progressVelocity: 0,
        milestones: [],
        nextMilestone: null,
      };
    }

    const totalMilestones = milestones.length;
    const completedMilestones = milestones.filter(
      (m) => m.status === MilestoneStatus.COMPLETED,
    ).length;
    const inProgressMilestones = milestones.filter(
      (m) => m.status === MilestoneStatus.IN_PROGRESS,
    ).length;
    const blockedMilestones = milestones.filter(
      (m) => m.status === MilestoneStatus.BLOCKED,
    ).length;
    const overdueMilestones = milestones.filter((m) => m.isOverdue()).length;

    // Calculate overall progress based on milestone completion
    const totalProgress = milestones.reduce(
      (sum, milestone) => sum + milestone.getProgressPercentage(),
      0,
    );
    const overallProgress = totalProgress / totalMilestones;

    // Calculate progress velocity (milestones completed per week)
    const completedMilestonesWithDates = milestones.filter(
      (m) => m.completedAt,
    );
    let progressVelocity = 0;

    if (completedMilestonesWithDates.length > 1) {
      const firstCompletion = new Date(
        Math.min(
          ...completedMilestonesWithDates.map((m) => m.completedAt!.getTime()),
        ),
      );
      const lastCompletion = new Date(
        Math.max(
          ...completedMilestonesWithDates.map((m) => m.completedAt!.getTime()),
        ),
      );
      const weeksDiff =
        (lastCompletion.getTime() - firstCompletion.getTime()) /
        (1000 * 60 * 60 * 24 * 7);

      if (weeksDiff > 0) {
        progressVelocity = completedMilestonesWithDates.length / weeksDiff;
      }
    }

    // Estimate completion date
    let estimatedCompletionDate: string | null = null;
    const remainingMilestones = totalMilestones - completedMilestones;

    if (progressVelocity > 0 && remainingMilestones > 0) {
      const weeksToComplete = remainingMilestones / progressVelocity;
      const estimatedDate = new Date();
      estimatedDate.setDate(estimatedDate.getDate() + weeksToComplete * 7);
      estimatedCompletionDate = estimatedDate.toISOString().split('T')[0];
    }

    // Find next milestone
    const nextMilestone = milestones.find(
      (m) =>
        m.status !== MilestoneStatus.COMPLETED &&
        m.status !== MilestoneStatus.CANCELLED,
    );

    // Map milestones to progress DTOs
    const milestoneProgress: MilestoneProgressDto[] = milestones.map(
      (milestone) => ({
        id: milestone.id,
        title: milestone.title,
        status: milestone.status,
        progressPercentage: milestone.getProgressPercentage(),
        dueDate: milestone.dueDate.toISOString().split('T')[0],
        isOverdue: milestone.isOverdue(),
      }),
    );

    const nextMilestoneProgress = nextMilestone
      ? {
          id: nextMilestone.id,
          title: nextMilestone.title,
          status: nextMilestone.status,
          progressPercentage: nextMilestone.getProgressPercentage(),
          dueDate: nextMilestone.dueDate.toISOString().split('T')[0],
          isOverdue: nextMilestone.isOverdue(),
        }
      : null;

    const progressResult = {
      overallProgress: Math.round(overallProgress * 100) / 100,
      totalMilestones,
      completedMilestones,
      inProgressMilestones,
      blockedMilestones,
      overdueMilestones,
      estimatedCompletionDate,
      progressVelocity: Math.round(progressVelocity * 100) / 100,
      milestones: milestoneProgress,
      nextMilestone: nextMilestoneProgress,
    };

    // Cache the calculated progress
    await this.cacheService.setCachedProgress(studentId, progressResult);

    return progressResult;
  }

  private async getMilestoneWithPermissionCheck(
    id: string,
    userId: string,
  ): Promise<Milestone> {
    const milestone = await this.milestoneRepository.findOne({
      where: { id },
      relations: ['student'],
    });

    if (!milestone) {
      throw new MilestoneNotFoundException(id);
    }

    // Check permissions - only student can modify their own milestones
    if (milestone.studentId !== userId) {
      throw new MilestonePermissionException(
        'Only the milestone owner can modify this milestone',
      );
    }

    return milestone;
  }

  private async validateAcademicCalendar(dueDate: Date): Promise<void> {
    // Basic academic calendar validation
    // This can be extended to check against actual academic calendar data

    const currentYear = new Date().getFullYear();
    const academicYearStart = new Date(currentYear, 8, 1); // September 1st
    const academicYearEnd = new Date(currentYear + 1, 5, 30); // June 30th next year

    if (dueDate < academicYearStart || dueDate > academicYearEnd) {
      throw new AcademicCalendarException(
        'Due date must be within the current academic year',
        { dueDate: dueDate.toISOString(), academicYearStart, academicYearEnd },
      );
    }

    // Check for major holidays (basic implementation)
    const month = dueDate.getMonth();
    const day = dueDate.getDate();

    // Christmas period
    if (month === 11 && day >= 20 && day <= 31) {
      throw new AcademicCalendarException(
        'Due date cannot be during Christmas break',
        { dueDate: dueDate.toISOString() },
      );
    }

    // New Year period
    if (month === 0 && day <= 7) {
      throw new AcademicCalendarException(
        'Due date cannot be during New Year break',
        { dueDate: dueDate.toISOString() },
      );
    }
  }

  private async checkSchedulingConflicts(
    studentId: string,
    dueDate: Date,
    excludeMilestoneId?: string,
  ): Promise<void> {
    // Check for milestones due within 3 days of the new due date
    const threeDaysBefore = new Date(dueDate);
    threeDaysBefore.setDate(threeDaysBefore.getDate() - 3);

    const threeDaysAfter = new Date(dueDate);
    threeDaysAfter.setDate(threeDaysAfter.getDate() + 3);

    const queryBuilder = this.milestoneRepository
      .createQueryBuilder('milestone')
      .where('milestone.studentId = :studentId', { studentId })
      .andWhere('milestone.dueDate BETWEEN :start AND :end', {
        start: threeDaysBefore.toISOString().split('T')[0],
        end: threeDaysAfter.toISOString().split('T')[0],
      })
      .andWhere('milestone.status != :cancelled', {
        cancelled: MilestoneStatus.CANCELLED,
      });

    if (excludeMilestoneId) {
      queryBuilder.andWhere('milestone.id != :excludeId', {
        excludeId: excludeMilestoneId,
      });
    }

    const conflictingMilestones = await queryBuilder.getMany();

    if (conflictingMilestones.length > 0) {
      this.logger.warn(
        `Scheduling conflict detected for student ${studentId} on ${dueDate.toISOString()}`,
      );
      // This is a warning, not an error - allow but log the conflict
    }
  }

  private async notifySupervisorAboutBlockedMilestone(
    milestone: Milestone,
  ): Promise<void> {
    // TODO: Implement supervisor notification logic
    // This could involve sending emails, creating notifications, etc.
    this.logger.log(
      `Milestone ${milestone.id} is blocked: ${milestone.blockingReason}`,
    );

    // For now, just log the blocking. In a full implementation, this would:
    // 1. Find the supervisor for the student
    // 2. Send email notification
    // 3. Create in-app notification
    // 4. Log the notification for audit purposes
  }
}
