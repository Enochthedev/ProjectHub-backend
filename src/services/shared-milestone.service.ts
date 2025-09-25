import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import {
  SharedMilestone,
  SharedMilestoneAssignment,
  User,
  Project,
} from '../entities';
import {
  CreateSharedMilestoneDto,
  UpdateSharedMilestoneDto,
  UpdateSharedMilestoneStatusDto,
  UpdateAssignmentStatusDto,
  SharedMilestoneResponseDto,
  AssignmentResponseDto,
} from '../dto/milestone';
import { MilestoneStatus } from '../common/enums';

@Injectable()
export class SharedMilestoneService {
  constructor(
    @InjectRepository(SharedMilestone)
    private readonly sharedMilestoneRepository: Repository<SharedMilestone>,
    @InjectRepository(SharedMilestoneAssignment)
    private readonly assignmentRepository: Repository<SharedMilestoneAssignment>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
  ) {}

  async createSharedMilestone(
    createDto: CreateSharedMilestoneDto,
    createdById: string,
  ): Promise<SharedMilestoneResponseDto> {
    // Validate project exists and is a group project
    const project = await this.projectRepository.findOne({
      where: { id: createDto.projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (!project.isGroupProject) {
      throw new BadRequestException(
        'Shared milestones can only be created for group projects',
      );
    }

    // Validate assignees exist
    const assignees = await this.userRepository.find({
      where: { id: In(createDto.assigneeIds) },
      relations: ['studentProfile'],
    });

    if (assignees.length !== createDto.assigneeIds.length) {
      throw new BadRequestException('One or more assignees not found');
    }

    // Create shared milestone
    const sharedMilestone = this.sharedMilestoneRepository.create({
      title: createDto.title,
      description: createDto.description,
      dueDate: new Date(createDto.dueDate),
      priority: createDto.priority,
      projectId: createDto.projectId,
      createdById,
      estimatedHours: createDto.estimatedHours || 0,
      requiresAllApproval: createDto.requiresAllApproval || false,
      assignees,
    });

    const savedMilestone =
      await this.sharedMilestoneRepository.save(sharedMilestone);

    // Create task assignments if provided
    if (createDto.taskAssignments && createDto.taskAssignments.length > 0) {
      const assignments = createDto.taskAssignments.map((taskDto) => {
        return this.assignmentRepository.create({
          milestoneId: savedMilestone.id,
          assigneeId: taskDto.assigneeId,
          taskTitle: taskDto.taskTitle,
          taskDescription: taskDto.taskDescription,
          estimatedHours: taskDto.estimatedHours || 0,
          assignedById: createdById,
        });
      });

      await this.assignmentRepository.save(assignments);
    }

    return this.getSharedMilestoneById(savedMilestone.id);
  }

  async getSharedMilestoneById(
    id: string,
  ): Promise<SharedMilestoneResponseDto> {
    const milestone = await this.sharedMilestoneRepository.findOne({
      where: { id },
      relations: [
        'createdBy',
        'createdBy.studentProfile',
        'project',
        'assignees',
        'assignees.studentProfile',
        'assignments',
        'assignments.assignee',
        'assignments.assignee.studentProfile',
        'assignments.assignedBy',
        'assignments.assignedBy.studentProfile',
      ],
    });

    if (!milestone) {
      throw new NotFoundException('Shared milestone not found');
    }

    return this.mapToResponseDto(milestone);
  }

  async getSharedMilestonesByProject(
    projectId: string,
  ): Promise<SharedMilestoneResponseDto[]> {
    const milestones = await this.sharedMilestoneRepository.find({
      where: { projectId },
      relations: [
        'createdBy',
        'createdBy.studentProfile',
        'project',
        'assignees',
        'assignees.studentProfile',
        'assignments',
        'assignments.assignee',
        'assignments.assignee.studentProfile',
        'assignments.assignedBy',
        'assignments.assignedBy.studentProfile',
      ],
      order: { dueDate: 'ASC' },
    });

    return milestones.map((milestone) => this.mapToResponseDto(milestone));
  }

  async getSharedMilestonesByUser(
    userId: string,
  ): Promise<SharedMilestoneResponseDto[]> {
    const milestones = await this.sharedMilestoneRepository
      .createQueryBuilder('milestone')
      .leftJoinAndSelect('milestone.createdBy', 'createdBy')
      .leftJoinAndSelect('createdBy.studentProfile', 'createdByProfile')
      .leftJoinAndSelect('milestone.project', 'project')
      .leftJoinAndSelect('milestone.assignees', 'assignees')
      .leftJoinAndSelect('assignees.studentProfile', 'assigneeProfile')
      .leftJoinAndSelect('milestone.assignments', 'assignments')
      .leftJoinAndSelect('assignments.assignee', 'assignmentAssignee')
      .leftJoinAndSelect(
        'assignmentAssignee.studentProfile',
        'assignmentAssigneeProfile',
      )
      .leftJoinAndSelect('assignments.assignedBy', 'assignedBy')
      .leftJoinAndSelect('assignedBy.studentProfile', 'assignedByProfile')
      .where('assignees.id = :userId', { userId })
      .orderBy('milestone.dueDate', 'ASC')
      .getMany();

    return milestones.map((milestone) => this.mapToResponseDto(milestone));
  }

  async updateSharedMilestone(
    id: string,
    updateDto: UpdateSharedMilestoneDto,
    userId: string,
  ): Promise<SharedMilestoneResponseDto> {
    const milestone = await this.sharedMilestoneRepository.findOne({
      where: { id },
      relations: ['assignees'],
    });

    if (!milestone) {
      throw new NotFoundException('Shared milestone not found');
    }

    // Check if user has permission to update (creator or assignee)
    const canUpdate =
      milestone.createdById === userId ||
      milestone.assignees.some((assignee) => assignee.id === userId);

    if (!canUpdate) {
      throw new ForbiddenException(
        'You do not have permission to update this milestone',
      );
    }

    // Update basic fields
    if (updateDto.title) milestone.title = updateDto.title;
    if (updateDto.description) milestone.description = updateDto.description;
    if (updateDto.dueDate) milestone.dueDate = new Date(updateDto.dueDate);
    if (updateDto.priority) milestone.priority = updateDto.priority;
    if (updateDto.estimatedHours !== undefined)
      milestone.estimatedHours = updateDto.estimatedHours;
    if (updateDto.requiresAllApproval !== undefined)
      milestone.requiresAllApproval = updateDto.requiresAllApproval;

    // Update assignees if provided
    if (updateDto.assigneeIds) {
      const assignees = await this.userRepository.find({
        where: { id: In(updateDto.assigneeIds) },
      });

      if (assignees.length !== updateDto.assigneeIds.length) {
        throw new BadRequestException('One or more assignees not found');
      }

      milestone.assignees = assignees;
    }

    await this.sharedMilestoneRepository.save(milestone);

    // Update task assignments if provided
    if (updateDto.taskAssignments) {
      // Remove existing assignments
      await this.assignmentRepository.delete({ milestoneId: id });

      // Create new assignments
      const assignments = updateDto.taskAssignments.map((taskDto) => {
        return this.assignmentRepository.create({
          milestoneId: id,
          assigneeId: taskDto.assigneeId,
          taskTitle: taskDto.taskTitle,
          taskDescription: taskDto.taskDescription,
          estimatedHours: taskDto.estimatedHours || 0,
          assignedById: userId,
        });
      });

      await this.assignmentRepository.save(assignments);
    }

    return this.getSharedMilestoneById(id);
  }

  async updateSharedMilestoneStatus(
    id: string,
    updateDto: UpdateSharedMilestoneStatusDto,
    userId: string,
  ): Promise<SharedMilestoneResponseDto> {
    const milestone = await this.sharedMilestoneRepository.findOne({
      where: { id },
      relations: ['assignees', 'assignments'],
    });

    if (!milestone) {
      throw new NotFoundException('Shared milestone not found');
    }

    // Check if user can complete the milestone
    if (updateDto.status === MilestoneStatus.COMPLETED) {
      if (!milestone.canBeCompletedBy(userId)) {
        throw new ForbiddenException('You cannot complete this milestone');
      }
    } else {
      // For other status changes, check if user is assignee or creator
      const canUpdate =
        milestone.createdById === userId ||
        milestone.assignees.some((assignee) => assignee.id === userId);

      if (!canUpdate) {
        throw new ForbiddenException(
          'You do not have permission to update this milestone',
        );
      }
    }

    // Validate status transition
    if (!milestone.canTransitionTo(updateDto.status)) {
      throw new BadRequestException(
        `Cannot transition from ${milestone.status} to ${updateDto.status}`,
      );
    }

    milestone.status = updateDto.status;
    if (updateDto.actualHours !== undefined)
      milestone.actualHours = updateDto.actualHours;
    if (updateDto.blockingReason)
      milestone.blockingReason = updateDto.blockingReason;

    if (updateDto.status === MilestoneStatus.COMPLETED) {
      milestone.completedAt = new Date();
    } else if (milestone.completedAt) {
      milestone.completedAt = null;
    }

    await this.sharedMilestoneRepository.save(milestone);

    return this.getSharedMilestoneById(id);
  }

  async updateAssignmentStatus(
    milestoneId: string,
    assignmentId: string,
    updateDto: UpdateAssignmentStatusDto,
    userId: string,
  ): Promise<AssignmentResponseDto> {
    const assignment = await this.assignmentRepository.findOne({
      where: { id: assignmentId, milestoneId },
      relations: [
        'milestone',
        'assignee',
        'assignee.studentProfile',
        'assignedBy',
        'assignedBy.studentProfile',
      ],
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    // Check if user is the assignee
    if (assignment.assigneeId !== userId) {
      throw new ForbiddenException('You can only update your own assignments');
    }

    // Validate status transition
    if (!assignment.canTransitionTo(updateDto.status)) {
      throw new BadRequestException(
        `Cannot transition from ${assignment.status} to ${updateDto.status}`,
      );
    }

    assignment.status = updateDto.status;
    if (updateDto.notes) assignment.notes = updateDto.notes;
    if (updateDto.actualHours !== undefined)
      assignment.actualHours = updateDto.actualHours;
    if (updateDto.blockingReason)
      assignment.blockingReason = updateDto.blockingReason;

    if (updateDto.status === MilestoneStatus.COMPLETED) {
      assignment.completedAt = new Date();
    } else if (assignment.completedAt) {
      assignment.completedAt = null;
    }

    await this.assignmentRepository.save(assignment);

    // Update milestone status if all assignments are completed
    await this.updateMilestoneStatusBasedOnAssignments(milestoneId);

    return this.mapAssignmentToResponseDto(assignment);
  }

  async deleteSharedMilestone(id: string, userId: string): Promise<void> {
    const milestone = await this.sharedMilestoneRepository.findOne({
      where: { id },
    });

    if (!milestone) {
      throw new NotFoundException('Shared milestone not found');
    }

    // Only creator can delete
    if (milestone.createdById !== userId) {
      throw new ForbiddenException(
        'Only the creator can delete this milestone',
      );
    }

    await this.sharedMilestoneRepository.remove(milestone);
  }

  private async updateMilestoneStatusBasedOnAssignments(
    milestoneId: string,
  ): Promise<void> {
    const milestone = await this.sharedMilestoneRepository.findOne({
      where: { id: milestoneId },
      relations: ['assignments'],
    });

    if (
      !milestone ||
      !milestone.assignments ||
      milestone.assignments.length === 0
    ) {
      return;
    }

    const completedAssignments = milestone.assignments.filter(
      (assignment) => assignment.status === MilestoneStatus.COMPLETED,
    );

    const inProgressAssignments = milestone.assignments.filter(
      (assignment) => assignment.status === MilestoneStatus.IN_PROGRESS,
    );

    const blockedAssignments = milestone.assignments.filter(
      (assignment) => assignment.status === MilestoneStatus.BLOCKED,
    );

    let newStatus: MilestoneStatus;

    if (completedAssignments.length === milestone.assignments.length) {
      newStatus = MilestoneStatus.COMPLETED;
      milestone.completedAt = new Date();
    } else if (blockedAssignments.length > 0) {
      newStatus = MilestoneStatus.BLOCKED;
    } else if (inProgressAssignments.length > 0) {
      newStatus = MilestoneStatus.IN_PROGRESS;
    } else {
      newStatus = MilestoneStatus.NOT_STARTED;
    }

    if (milestone.status !== newStatus) {
      milestone.status = newStatus;
      await this.sharedMilestoneRepository.save(milestone);
    }
  }

  private mapToResponseDto(
    milestone: SharedMilestone,
  ): SharedMilestoneResponseDto {
    return {
      id: milestone.id,
      title: milestone.title,
      description: milestone.description,
      dueDate: milestone.dueDate,
      status: milestone.status,
      priority: milestone.priority,
      estimatedHours: milestone.estimatedHours,
      actualHours: milestone.actualHours,
      completedAt: milestone.completedAt,
      blockingReason: milestone.blockingReason,
      requiresAllApproval: milestone.requiresAllApproval,
      progressPercentage: milestone.getProgressPercentage(),
      isOverdue: milestone.isOverdue(),
      daysUntilDue: milestone.getDaysUntilDue(),
      createdBy: {
        id: milestone.createdBy.id,
        email: milestone.createdBy.email,
        studentProfile: milestone.createdBy.studentProfile
          ? {
              name: milestone.createdBy.studentProfile.name,
            }
          : undefined,
      },
      project: {
        id: milestone.project.id,
        title: milestone.project.title,
        specialization: milestone.project.specialization,
        isGroupProject: milestone.project.isGroupProject,
      },
      assignees: milestone.assignees.map((assignee) => ({
        id: assignee.id,
        email: assignee.email,
        studentProfile: assignee.studentProfile
          ? {
              name: assignee.studentProfile.name,
            }
          : undefined,
      })),
      assignments:
        milestone.assignments?.map((assignment) =>
          this.mapAssignmentToResponseDto(assignment),
        ) || [],
      createdAt: milestone.createdAt,
      updatedAt: milestone.updatedAt,
    };
  }

  private mapAssignmentToResponseDto(
    assignment: SharedMilestoneAssignment,
  ): AssignmentResponseDto {
    return {
      id: assignment.id,
      taskTitle: assignment.taskTitle,
      taskDescription: assignment.taskDescription,
      status: assignment.status,
      estimatedHours: assignment.estimatedHours,
      actualHours: assignment.actualHours,
      notes: assignment.notes,
      completedAt: assignment.completedAt,
      blockingReason: assignment.blockingReason,
      assignee: {
        id: assignment.assignee.id,
        email: assignment.assignee.email,
        studentProfile: assignment.assignee.studentProfile
          ? {
              name: assignment.assignee.studentProfile.name,
            }
          : undefined,
      },
      assignedBy: assignment.assignedBy
        ? {
            id: assignment.assignedBy.id,
            email: assignment.assignedBy.email,
            studentProfile: assignment.assignedBy.studentProfile
              ? {
                  name: assignment.assignedBy.studentProfile.name,
                }
              : undefined,
          }
        : null,
      createdAt: assignment.createdAt,
      updatedAt: assignment.updatedAt,
    };
  }
}
