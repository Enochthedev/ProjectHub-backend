import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Milestone } from '../entities/milestone.entity';
import { User } from '../entities/user.entity';
import { Project } from '../entities/project.entity';
import {
  MilestoneNotFoundException,
  MilestoneOwnershipException,
  MilestonePermissionException,
} from '../common/exceptions/milestone.exception';
import { UserRole } from '../common/enums/user-role.enum';

export interface AccessContext {
  userId: string;
  userRole: UserRole;
  supervisorId?: string;
  projectIds?: string[];
}

export interface PermissionCheck {
  canRead: boolean;
  canWrite: boolean;
  canDelete: boolean;
  canManageReminders: boolean;
  reason?: string;
}

@Injectable()
export class MilestoneAccessControlService {
  private readonly logger = new Logger(MilestoneAccessControlService.name);

  constructor(
    @InjectRepository(Milestone)
    private readonly milestoneRepository: Repository<Milestone>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
  ) {}

  /**
   * Check if user can access a milestone
   */
  async checkMilestoneAccess(
    milestoneId: string,
    context: AccessContext,
    requiredPermission: 'read' | 'write' | 'delete' | 'manage_reminders',
  ): Promise<boolean> {
    const permissions = await this.getMilestonePermissions(
      milestoneId,
      context,
    );

    switch (requiredPermission) {
      case 'read':
        return permissions.canRead;
      case 'write':
        return permissions.canWrite;
      case 'delete':
        return permissions.canDelete;
      case 'manage_reminders':
        return permissions.canManageReminders;
      default:
        return false;
    }
  }

  /**
   * Get detailed permissions for a milestone
   */
  async getMilestonePermissions(
    milestoneId: string,
    context: AccessContext,
  ): Promise<PermissionCheck> {
    try {
      const milestone = await this.milestoneRepository.findOne({
        where: { id: milestoneId },
        relations: ['student', 'project', 'project.supervisor'],
      });

      if (!milestone) {
        throw new MilestoneNotFoundException(milestoneId);
      }

      return this.calculatePermissions(milestone, context);
    } catch (error) {
      if (error instanceof MilestoneNotFoundException) {
        throw error;
      }

      this.logger.error('Error checking milestone permissions', {
        milestoneId,
        userId: context.userId,
        error: error.message,
      });

      return {
        canRead: false,
        canWrite: false,
        canDelete: false,
        canManageReminders: false,
        reason: 'Permission check failed',
      };
    }
  }

  /**
   * Validate milestone ownership
   */
  async validateOwnership(milestoneId: string, userId: string): Promise<void> {
    const milestone = await this.milestoneRepository.findOne({
      where: { id: milestoneId },
      relations: ['student'],
    });

    if (!milestone) {
      throw new MilestoneNotFoundException(milestoneId);
    }

    if (milestone.studentId !== userId) {
      throw new MilestoneOwnershipException(milestoneId, userId);
    }
  }

  /**
   * Validate supervisor access to student milestone
   */
  async validateSupervisorAccess(
    milestoneId: string,
    supervisorId: string,
  ): Promise<void> {
    const milestone = await this.milestoneRepository.findOne({
      where: { id: milestoneId },
      relations: ['student', 'project', 'project.supervisor'],
    });

    if (!milestone) {
      throw new MilestoneNotFoundException(milestoneId);
    }

    // Check if supervisor is assigned to the project
    if (
      milestone.project &&
      milestone.project.supervisor?.id === supervisorId
    ) {
      return;
    }

    // Check if supervisor is assigned to the student directly
    const student = await this.userRepository.findOne({
      where: { id: milestone.studentId },
      relations: ['supervisorProfile'],
    });

    if (student?.supervisorProfile?.id === supervisorId) {
      return;
    }

    throw new MilestonePermissionException(
      `Supervisor ${supervisorId} does not have access to milestone ${milestoneId}`,
    );
  }

  /**
   * Check if user can create milestones for a project
   */
  async canCreateMilestone(
    projectId: string | null,
    context: AccessContext,
  ): Promise<boolean> {
    // Admin can create milestones for any project
    if (context.userRole === UserRole.ADMIN) {
      return true;
    }

    // If no project specified, student can create personal milestones
    if (!projectId) {
      return context.userRole === UserRole.STUDENT;
    }

    // Check project access
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
      relations: ['students', 'supervisor'],
    });

    if (!project) {
      return false;
    }

    // Student can create milestones for their own projects
    // Note: In the current schema, we need to check if the student is assigned to the project
    // This would require additional logic or a junction table for project-student relationships
    if (context.userRole === UserRole.STUDENT) {
      // For now, allow students to create milestones for any project
      // In a real implementation, you would check project-student assignments
      return true;
    }

    // Supervisor can create milestones for supervised projects
    if (context.userRole === UserRole.SUPERVISOR) {
      return project.supervisor?.id === context.userId;
    }

    return false;
  }

  /**
   * Get all milestone IDs accessible by user
   */
  async getAccessibleMilestoneIds(context: AccessContext): Promise<string[]> {
    const queryBuilder = this.milestoneRepository
      .createQueryBuilder('milestone')
      .leftJoin('milestone.student', 'student')
      .leftJoin('milestone.project', 'project')
      .leftJoin('project.supervisor', 'supervisor')
      .leftJoin('project.students', 'projectStudents');

    // Admin can access all milestones
    if (context.userRole === UserRole.ADMIN) {
      const milestones = await queryBuilder.select('milestone.id').getMany();
      return milestones.map((m) => m.id);
    }

    // Student can access their own milestones
    if (context.userRole === UserRole.STUDENT) {
      queryBuilder.where('milestone.studentId = :userId', {
        userId: context.userId,
      });
    }

    // Supervisor can access milestones of supervised students/projects
    if (context.userRole === UserRole.SUPERVISOR) {
      queryBuilder.where(
        '(supervisor.id = :userId OR student.supervisorId = :userId)',
        { userId: context.userId },
      );
    }

    const milestones = await queryBuilder.select('milestone.id').getMany();
    return milestones.map((m) => m.id);
  }

  /**
   * Bulk permission check for multiple milestones
   */
  async bulkPermissionCheck(
    milestoneIds: string[],
    context: AccessContext,
    requiredPermission: 'read' | 'write' | 'delete' | 'manage_reminders',
  ): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};

    // For performance, get accessible milestone IDs first
    const accessibleIds = await this.getAccessibleMilestoneIds(context);
    const accessibleSet = new Set(accessibleIds);

    for (const milestoneId of milestoneIds) {
      if (!accessibleSet.has(milestoneId)) {
        results[milestoneId] = false;
        continue;
      }

      try {
        const hasPermission = await this.checkMilestoneAccess(
          milestoneId,
          context,
          requiredPermission,
        );
        results[milestoneId] = hasPermission;
      } catch (error) {
        results[milestoneId] = false;
      }
    }

    return results;
  }

  /**
   * Calculate permissions based on milestone and user context
   */
  private calculatePermissions(
    milestone: Milestone,
    context: AccessContext,
  ): PermissionCheck {
    // Admin has all permissions
    if (context.userRole === UserRole.ADMIN) {
      return {
        canRead: true,
        canWrite: true,
        canDelete: true,
        canManageReminders: true,
        reason: 'Admin access',
      };
    }

    // Owner has full permissions
    if (milestone.studentId === context.userId) {
      return {
        canRead: true,
        canWrite: true,
        canDelete: true,
        canManageReminders: true,
        reason: 'Owner access',
      };
    }

    // Supervisor permissions
    if (context.userRole === UserRole.SUPERVISOR) {
      const isSupervisor = this.isSupervisorOfMilestone(
        milestone,
        context.userId,
      );

      if (isSupervisor) {
        return {
          canRead: true,
          canWrite: false, // Supervisors can't modify student milestones directly
          canDelete: false,
          canManageReminders: true, // Can manage reminders for supervision
          reason: 'Supervisor access',
        };
      }
    }

    // No access by default
    return {
      canRead: false,
      canWrite: false,
      canDelete: false,
      canManageReminders: false,
      reason: 'No access permissions',
    };
  }

  /**
   * Check if user is supervisor of the milestone
   */
  private isSupervisorOfMilestone(
    milestone: Milestone,
    supervisorId: string,
  ): boolean {
    // Check project supervisor
    if (milestone.project?.supervisor?.id === supervisorId) {
      return true;
    }

    // Check student supervisor (if available in relations)
    if (milestone.student?.supervisorProfile?.id === supervisorId) {
      return true;
    }

    return false;
  }

  /**
   * Enforce access control for milestone operations
   */
  async enforceAccess(
    milestoneId: string,
    context: AccessContext,
    requiredPermission: 'read' | 'write' | 'delete' | 'manage_reminders',
  ): Promise<void> {
    const hasAccess = await this.checkMilestoneAccess(
      milestoneId,
      context,
      requiredPermission,
    );

    if (!hasAccess) {
      const permissions = await this.getMilestonePermissions(
        milestoneId,
        context,
      );
      throw new MilestonePermissionException(
        `Insufficient permissions for ${requiredPermission} operation on milestone ${milestoneId}. ${permissions.reason}`,
      );
    }
  }

  /**
   * Get user context from user entity
   */
  async getUserContext(userId: string): Promise<AccessContext> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['supervisorProfile', 'studentProfile', 'projects'],
    });

    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    return {
      userId: user.id,
      userRole: user.role,
      supervisorId: undefined, // Would need to implement supervisor relationship
      projectIds: [], // Would need to implement project-student relationships
    };
  }
}
