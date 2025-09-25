import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Project } from '../entities/project.entity';
import { ApprovalStatus } from '../common/enums';
import { ProjectAuditService } from './project-audit.service';

export interface StatusTransitionRule {
  fromStatus: ApprovalStatus;
  toStatus: ApprovalStatus;
  condition: (project: Project) => boolean;
  reason: string;
}

@Injectable()
export class ProjectStatusService {
  private readonly logger = new Logger(ProjectStatusService.name);

  // Business rules for automatic status transitions
  private readonly statusTransitionRules: StatusTransitionRule[] = [
    {
      fromStatus: ApprovalStatus.PENDING,
      toStatus: ApprovalStatus.REJECTED,
      condition: (project: Project) => {
        // Auto-reject projects pending for more than 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return project.createdAt < thirtyDaysAgo;
      },
      reason:
        'Automatically rejected due to pending status for more than 30 days',
    },
    {
      fromStatus: ApprovalStatus.APPROVED,
      toStatus: ApprovalStatus.ARCHIVED,
      condition: (project: Project) => {
        // Auto-archive approved projects older than 3 years
        const threeYearsAgo = new Date();
        threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
        return project.year < threeYearsAgo.getFullYear();
      },
      reason: 'Automatically archived due to project age (older than 3 years)',
    },
  ];

  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @Optional() private readonly projectAuditService: ProjectAuditService,
  ) {}

  async canTransitionStatus(
    project: Project,
    fromStatus: ApprovalStatus,
    toStatus: ApprovalStatus,
  ): Promise<{ canTransition: boolean; reason?: string }> {
    // Define valid status transitions
    const validTransitions: Record<ApprovalStatus, ApprovalStatus[]> = {
      [ApprovalStatus.PENDING]: [
        ApprovalStatus.APPROVED,
        ApprovalStatus.REJECTED,
      ],
      [ApprovalStatus.APPROVED]: [
        ApprovalStatus.ARCHIVED,
        ApprovalStatus.PENDING,
      ],
      [ApprovalStatus.REJECTED]: [ApprovalStatus.PENDING],
      [ApprovalStatus.ARCHIVED]: [], // Archived projects cannot be transitioned
    };

    if (project.approvalStatus !== fromStatus) {
      return {
        canTransition: false,
        reason: `Project status is ${project.approvalStatus}, not ${fromStatus}`,
      };
    }

    if (!validTransitions[fromStatus].includes(toStatus)) {
      return {
        canTransition: false,
        reason: `Cannot transition from ${fromStatus} to ${toStatus}`,
      };
    }

    // Additional business rule checks
    if (toStatus === ApprovalStatus.APPROVED) {
      // Check if project meets approval criteria
      const approvalCheck = await this.validateProjectForApproval(project);
      if (!approvalCheck.isValid) {
        return {
          canTransition: false,
          reason: approvalCheck.reason,
        };
      }
    }

    return { canTransition: true };
  }

  async transitionProjectStatus(
    projectId: string,
    toStatus: ApprovalStatus,
    userId: string,
    reason?: string,
  ): Promise<Project> {
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
      relations: ['supervisor'],
    });

    if (!project) {
      throw new Error(`Project with ID ${projectId} not found`);
    }

    const transitionCheck = await this.canTransitionStatus(
      project,
      project.approvalStatus,
      toStatus,
    );

    if (!transitionCheck.canTransition) {
      throw new Error(transitionCheck.reason);
    }

    const oldStatus = project.approvalStatus;

    // Update project status
    await this.projectRepository.update(projectId, {
      approvalStatus: toStatus,
      approvedAt: new Date(),
      approvedBy: userId,
      notes: reason || project.notes,
    });

    // Log status change
    await this.logStatusChange(projectId, oldStatus, toStatus, userId, reason);

    this.logger.log(
      `Project ${projectId} status changed from ${oldStatus} to ${toStatus} by ${userId}`,
    );

    const updatedProject = await this.projectRepository.findOne({
      where: { id: projectId },
      relations: ['supervisor', 'supervisor.supervisorProfile'],
    });

    if (!updatedProject) {
      throw new Error(`Failed to retrieve updated project ${projectId}`);
    }

    return updatedProject;
  }

  async bulkArchiveOldProjects(adminId: string): Promise<number> {
    this.logger.log('Starting bulk archive of old projects');

    const threeYearsAgo = new Date();
    threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);

    const oldProjects = await this.projectRepository.find({
      where: {
        approvalStatus: ApprovalStatus.APPROVED,
        year: LessThan(threeYearsAgo.getFullYear()),
      },
    });

    let archivedCount = 0;

    for (const project of oldProjects) {
      try {
        await this.transitionProjectStatus(
          project.id,
          ApprovalStatus.ARCHIVED,
          adminId,
          'Bulk archived due to age (older than 3 years)',
        );
        archivedCount++;
      } catch (error) {
        this.logger.error(
          `Failed to archive project ${project.id}: ${error.message}`,
          error.stack,
        );
      }
    }

    this.logger.log(`Bulk archived ${archivedCount} old projects`);
    return archivedCount;
  }

  async bulkRejectStaleProjects(adminId: string): Promise<number> {
    this.logger.log('Starting bulk rejection of stale pending projects');

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const staleProjects = await this.projectRepository.find({
      where: {
        approvalStatus: ApprovalStatus.PENDING,
        createdAt: LessThan(thirtyDaysAgo),
      },
    });

    let rejectedCount = 0;

    for (const project of staleProjects) {
      try {
        await this.transitionProjectStatus(
          project.id,
          ApprovalStatus.REJECTED,
          adminId,
          'Automatically rejected due to pending status for more than 30 days',
        );
        rejectedCount++;
      } catch (error) {
        this.logger.error(
          `Failed to reject stale project ${project.id}: ${error.message}`,
          error.stack,
        );
      }
    }

    this.logger.log(`Bulk rejected ${rejectedCount} stale projects`);
    return rejectedCount;
  }

  // Scheduled task to run automatic status updates daily at 2 AM
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async runAutomaticStatusUpdates(): Promise<void> {
    this.logger.log('Running automatic status updates');

    try {
      // Use system user ID for automatic updates
      const systemUserId = 'system';

      // Archive old projects
      const archivedCount = await this.bulkArchiveOldProjects(systemUserId);

      // Reject stale pending projects
      const rejectedCount = await this.bulkRejectStaleProjects(systemUserId);

      this.logger.log(
        `Automatic status updates completed: ${archivedCount} archived, ${rejectedCount} rejected`,
      );
    } catch (error) {
      this.logger.error('Failed to run automatic status updates', error.stack);
    }
  }

  async getProjectStatusStatistics(): Promise<{
    pending: number;
    approved: number;
    rejected: number;
    archived: number;
    total: number;
  }> {
    const [pending, approved, rejected, archived, total] = await Promise.all([
      this.projectRepository.count({
        where: { approvalStatus: ApprovalStatus.PENDING },
      }),
      this.projectRepository.count({
        where: { approvalStatus: ApprovalStatus.APPROVED },
      }),
      this.projectRepository.count({
        where: { approvalStatus: ApprovalStatus.REJECTED },
      }),
      this.projectRepository.count({
        where: { approvalStatus: ApprovalStatus.ARCHIVED },
      }),
      this.projectRepository.count(),
    ]);

    return { pending, approved, rejected, archived, total };
  }

  async getProjectsRequiringAttention(): Promise<{
    stalePending: Project[];
    oldApproved: Project[];
  }> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const threeYearsAgo = new Date();
    threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);

    const [stalePending, oldApproved] = await Promise.all([
      this.projectRepository.find({
        where: {
          approvalStatus: ApprovalStatus.PENDING,
          createdAt: LessThan(thirtyDaysAgo),
        },
        relations: ['supervisor'],
        order: { createdAt: 'ASC' },
      }),
      this.projectRepository.find({
        where: {
          approvalStatus: ApprovalStatus.APPROVED,
          year: LessThan(threeYearsAgo.getFullYear()),
        },
        relations: ['supervisor'],
        order: { year: 'ASC' },
      }),
    ]);

    return { stalePending, oldApproved };
  }

  private async validateProjectForApproval(project: Project): Promise<{
    isValid: boolean;
    reason?: string;
  }> {
    // Check if project has all required fields
    if (!project.title || project.title.length < 10) {
      return {
        isValid: false,
        reason: 'Project title is too short (minimum 10 characters)',
      };
    }

    if (!project.abstract || project.abstract.length < 100) {
      return {
        isValid: false,
        reason: 'Project abstract is too short (minimum 100 characters)',
      };
    }

    if (!project.specialization) {
      return {
        isValid: false,
        reason: 'Project specialization is required',
      };
    }

    if (!project.technologyStack || project.technologyStack.length === 0) {
      return {
        isValid: false,
        reason: 'Project must specify at least one technology',
      };
    }

    // Check if supervisor is still active
    if (!project.supervisor || !project.supervisor.isActive) {
      return {
        isValid: false,
        reason: 'Project supervisor is not active',
      };
    }

    return { isValid: true };
  }

  private async logStatusChange(
    projectId: string,
    fromStatus: ApprovalStatus,
    toStatus: ApprovalStatus,
    userId: string,
    reason?: string,
  ): Promise<void> {
    const action = this.getStatusChangeAction(toStatus);

    if (this.projectAuditService) {
      if (action === 'PROJECT_APPROVED') {
        await this.projectAuditService.logProjectApproval(
          projectId,
          userId,
          reason,
        );
      } else if (action === 'PROJECT_REJECTED') {
        await this.projectAuditService.logProjectRejection(
          projectId,
          userId,
          reason || 'No reason provided',
        );
      } else if (action === 'PROJECT_ARCHIVED') {
        await this.projectAuditService.logProjectArchival(projectId, userId);
      }
    }
  }

  private getStatusChangeAction(toStatus: ApprovalStatus): string {
    switch (toStatus) {
      case ApprovalStatus.APPROVED:
        return 'PROJECT_APPROVED';
      case ApprovalStatus.REJECTED:
        return 'PROJECT_REJECTED';
      case ApprovalStatus.ARCHIVED:
        return 'PROJECT_ARCHIVED';
      default:
        return 'PROJECT_STATUS_CHANGED';
    }
  }
}
