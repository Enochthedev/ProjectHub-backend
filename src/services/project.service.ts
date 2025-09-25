import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner, DataSource } from 'typeorm';
import { Project } from '../entities/project.entity';
import { User } from '../entities/user.entity';
import {
  CreateProjectDto,
  UpdateProjectDto,
  ProjectDetailDto,
  ApproveProjectDto,
  RejectProjectDto,
} from '../dto/project';
import {
  ProjectNotFoundException,
  ProjectAlreadyExistsException,
  ProjectValidationException,
  ProjectApprovalException,
  ProjectStatusException,
  ProjectPermissionException,
} from '../common/exceptions';
import { ApprovalStatus, UserRole } from '../common/enums';
import { SPECIALIZATIONS } from '../common/constants/specializations';
import {
  getSuggestedTechnologies,
  getSuggestedTags,
  normalizeTag,
} from '../common/validators';
import { plainToClass } from 'class-transformer';
import { ProjectAuditService } from './project-audit.service';
import { Optional } from '@nestjs/common';
import { ProjectStatusService } from './project-status.service';

export interface ProjectAnalyticsDto {
  viewCount: number;
  bookmarkCount: number;
  popularityScore: number;
  trendingRank?: number;
}

@Injectable()
export class ProjectService {
  private readonly logger = new Logger(ProjectService.name);

  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly dataSource: DataSource,
    @Optional() private readonly projectAuditService: ProjectAuditService,
    private readonly projectStatusService: ProjectStatusService,
  ) {}

  async createProject(
    createProjectDto: CreateProjectDto,
    supervisorId: string,
  ): Promise<Project> {
    this.logger.log(
      `Creating project: ${createProjectDto.title} by supervisor: ${supervisorId}`,
    );

    // Validate supervisor exists and has correct role
    const supervisor = await this.userRepository.findOne({
      where: { id: supervisorId },
      relations: ['supervisorProfile'],
    });

    if (!supervisor) {
      throw new ProjectValidationException('Supervisor not found');
    }

    if (supervisor.role !== UserRole.SUPERVISOR) {
      throw new ProjectPermissionException(
        'Only supervisors can create projects',
        supervisorId,
      );
    }

    // Check for duplicate projects (similar title)
    await this.checkForDuplicateProject(createProjectDto.title);

    // Validate specialization against supervisor's specializations
    await this.validateSpecializationForSupervisor(
      createProjectDto.specialization,
      supervisor,
    );

    // Normalize and validate tags
    const normalizedTags = this.normalizeAndValidateTags(createProjectDto.tags);

    // Validate technology stack
    this.validateTechnologyStack(createProjectDto.technologyStack);

    // Create project entity
    const project = this.projectRepository.create({
      ...createProjectDto,
      tags: normalizedTags,
      supervisorId,
      approvalStatus: ApprovalStatus.PENDING,
    });

    try {
      const savedProject = await this.projectRepository.save(project);
      this.logger.log(`Project created successfully: ${savedProject.id}`);

      // Log project creation for audit trail
      if (this.projectAuditService) {
        await this.projectAuditService.logProjectCreation(
          savedProject.id,
          supervisorId,
        );
      }

      const result = await this.projectRepository.findOne({
        where: { id: savedProject.id },
        relations: ['supervisor', 'supervisor.supervisorProfile'],
      });

      if (!result) {
        throw new ProjectValidationException(
          'Failed to retrieve created project',
        );
      }

      return result;
    } catch (error) {
      this.logger.error(
        `Failed to create project: ${error.message}`,
        error.stack,
      );
      throw new ProjectValidationException(
        'Failed to create project',
        error.message,
      );
    }
  }

  async updateProject(
    id: string,
    updateProjectDto: UpdateProjectDto,
    userId: string,
    userRole: UserRole,
  ): Promise<Project> {
    this.logger.log(`Updating project: ${id} by user: ${userId}`);

    const project = await this.findProjectById(id);

    // Check permissions
    if (userRole !== UserRole.ADMIN && project.supervisorId !== userId) {
      throw new ProjectPermissionException(
        'You can only update your own projects',
        userId,
        id,
      );
    }

    // Validate project can be updated
    if (project.approvalStatus === ApprovalStatus.ARCHIVED) {
      throw new ProjectStatusException(
        'Cannot update archived project',
        project.approvalStatus,
        'update',
      );
    }

    // If title is being updated, check for duplicates
    if (updateProjectDto.title && updateProjectDto.title !== project.title) {
      await this.checkForDuplicateProject(updateProjectDto.title, id);
    }

    // Validate specialization if being updated
    if (updateProjectDto.specialization) {
      const supervisor = await this.userRepository.findOne({
        where: { id: project.supervisorId },
        relations: ['supervisorProfile'],
      });

      if (!supervisor) {
        throw new ProjectValidationException('Supervisor not found');
      }

      await this.validateSpecializationForSupervisor(
        updateProjectDto.specialization,
        supervisor,
      );
    }

    // Normalize tags if provided
    if (updateProjectDto.tags) {
      updateProjectDto.tags = this.normalizeAndValidateTags(
        updateProjectDto.tags,
      );
    }

    // Validate technology stack if provided
    if (updateProjectDto.technologyStack) {
      this.validateTechnologyStack(updateProjectDto.technologyStack);
    }

    // Detect changes for audit trail
    const changes =
      this.projectAuditService?.detectProjectChanges(
        project,
        updateProjectDto,
      ) || [];

    // Reset approval status if content changes significantly
    const shouldResetApproval = this.shouldResetApprovalStatus(
      project,
      updateProjectDto,
    );
    if (
      shouldResetApproval &&
      project.approvalStatus === ApprovalStatus.APPROVED
    ) {
      updateProjectDto = {
        ...updateProjectDto,
        approvalStatus: ApprovalStatus.PENDING,
      } as any;
      this.logger.log(
        `Resetting approval status for project: ${id} due to significant changes`,
      );
    }

    try {
      await this.projectRepository.update(id, updateProjectDto);

      // Log project update for audit trail
      if (changes.length > 0 && this.projectAuditService) {
        await this.projectAuditService.logProjectUpdate(id, userId, changes);
      }

      const result = await this.projectRepository.findOne({
        where: { id },
        relations: ['supervisor', 'supervisor.supervisorProfile'],
      });

      if (!result) {
        throw new ProjectValidationException(
          'Failed to retrieve updated project',
        );
      }

      return result;
    } catch (error) {
      this.logger.error(
        `Failed to update project: ${error.message}`,
        error.stack,
      );
      throw new ProjectValidationException(
        'Failed to update project',
        error.message,
      );
    }
  }

  async approveProject(
    id: string,
    adminId: string,
    approveDto?: ApproveProjectDto,
  ): Promise<Project> {
    this.logger.log(`Approving project: ${id} by admin: ${adminId}`);

    try {
      return await this.projectStatusService.transitionProjectStatus(
        id,
        ApprovalStatus.APPROVED,
        adminId,
        approveDto?.approvalNotes,
      );
    } catch (error) {
      this.logger.error(
        `Failed to approve project: ${error.message}`,
        error.stack,
      );
      throw new ProjectApprovalException(error.message);
    }
  }

  async rejectProject(
    id: string,
    adminId: string,
    rejectDto: RejectProjectDto,
  ): Promise<void> {
    this.logger.log(`Rejecting project: ${id} by admin: ${adminId}`);

    try {
      await this.projectStatusService.transitionProjectStatus(
        id,
        ApprovalStatus.REJECTED,
        adminId,
        rejectDto.rejectionReason,
      );
    } catch (error) {
      this.logger.error(
        `Failed to reject project: ${error.message}`,
        error.stack,
      );
      throw new ProjectApprovalException(error.message);
    }
  }

  async archiveProject(id: string, adminId: string): Promise<void> {
    this.logger.log(`Archiving project: ${id} by admin: ${adminId}`);

    try {
      await this.projectStatusService.transitionProjectStatus(
        id,
        ApprovalStatus.ARCHIVED,
        adminId,
        'Manually archived by administrator',
      );
    } catch (error) {
      this.logger.error(
        `Failed to archive project: ${error.message}`,
        error.stack,
      );
      throw new ProjectApprovalException(error.message);
    }
  }

  async getProjectById(id: string): Promise<ProjectDetailDto> {
    const project = await this.findProjectById(id, [
      'supervisor',
      'supervisor.supervisorProfile',
      'bookmarks',
      'views',
    ]);

    const projectDetail = plainToClass(ProjectDetailDto, project, {
      excludeExtraneousValues: true,
    });

    // Add analytics data
    projectDetail.viewCount = project.views?.length || 0;
    projectDetail.bookmarkCount = project.bookmarks?.length || 0;

    return projectDetail;
  }

  async getProjectAnalytics(projectId: string): Promise<ProjectAnalyticsDto> {
    const project = await this.projectRepository
      .createQueryBuilder('project')
      .leftJoinAndSelect('project.views', 'views')
      .leftJoinAndSelect('project.bookmarks', 'bookmarks')
      .where('project.id = :projectId', { projectId })
      .getOne();

    if (!project) {
      throw new ProjectNotFoundException(projectId);
    }

    const viewCount = project.views?.length || 0;
    const bookmarkCount = project.bookmarks?.length || 0;

    // Calculate popularity score (weighted combination of views and bookmarks)
    const popularityScore = viewCount * 0.3 + bookmarkCount * 0.7;

    return {
      viewCount,
      bookmarkCount,
      popularityScore,
    };
  }

  // Status management methods
  async getProjectStatusStatistics(): Promise<{
    pending: number;
    approved: number;
    rejected: number;
    archived: number;
    total: number;
  }> {
    return this.projectStatusService.getProjectStatusStatistics();
  }

  async getProjectsRequiringAttention(): Promise<{
    stalePending: Project[];
    oldApproved: Project[];
  }> {
    return this.projectStatusService.getProjectsRequiringAttention();
  }

  async bulkArchiveOldProjects(adminId: string): Promise<number> {
    return this.projectStatusService.bulkArchiveOldProjects(adminId);
  }

  async bulkRejectStaleProjects(adminId: string): Promise<number> {
    return this.projectStatusService.bulkRejectStaleProjects(adminId);
  }

  // Suggestion methods
  async getSuggestedTechnologies(partial: string): Promise<string[]> {
    return getSuggestedTechnologies(partial);
  }

  async getSuggestedTags(partial: string): Promise<string[]> {
    return getSuggestedTags(partial);
  }

  // Private helper methods
  private async findProjectById(
    id: string,
    relations: string[] = ['supervisor', 'supervisor.supervisorProfile'],
  ): Promise<Project> {
    const project = await this.projectRepository.findOne({
      where: { id },
      relations,
    });

    if (!project) {
      throw new ProjectNotFoundException(id);
    }

    return project;
  }

  private async checkForDuplicateProject(
    title: string,
    excludeId?: string,
  ): Promise<void> {
    const queryBuilder = this.projectRepository
      .createQueryBuilder('project')
      .where('LOWER(project.title) = LOWER(:title)', {
        title: title.toLowerCase(),
      });

    if (excludeId) {
      queryBuilder.andWhere('project.id != :excludeId', { excludeId });
    }

    const existingProject = await queryBuilder.getOne();

    if (existingProject) {
      throw new ProjectAlreadyExistsException(title);
    }
  }

  private async validateSpecializationForSupervisor(
    specialization: string,
    supervisor: User,
  ): Promise<void> {
    // Check if specialization is valid
    if (!SPECIALIZATIONS.includes(specialization as any)) {
      throw new ProjectValidationException(
        `Invalid specialization: ${specialization}`,
      );
    }

    // Check if supervisor has this specialization
    const supervisorSpecializations =
      supervisor.supervisorProfile?.specializations || [];
    if (!supervisorSpecializations.includes(specialization)) {
      throw new ProjectValidationException(
        `Supervisor does not have expertise in: ${specialization}`,
      );
    }
  }

  private normalizeAndValidateTags(tags: string[]): string[] {
    if (!Array.isArray(tags)) {
      throw new ProjectValidationException('Tags must be an array');
    }

    const normalizedTags = tags
      .map((tag) => normalizeTag(tag))
      .filter((tag) => tag.length > 0);

    // Remove duplicates
    const uniqueTags = [...new Set(normalizedTags)];

    if (uniqueTags.length > 10) {
      throw new ProjectValidationException('Maximum 10 unique tags allowed');
    }

    return uniqueTags;
  }

  private validateTechnologyStack(technologies: string[]): void {
    if (!Array.isArray(technologies)) {
      throw new ProjectValidationException('Technology stack must be an array');
    }

    if (technologies.length > 15) {
      throw new ProjectValidationException('Maximum 15 technologies allowed');
    }

    for (const tech of technologies) {
      if (typeof tech !== 'string' || tech.trim().length === 0) {
        throw new ProjectValidationException(
          'Each technology must be a non-empty string',
        );
      }

      if (tech.trim().length > 50) {
        throw new ProjectValidationException(
          'Each technology name must not exceed 50 characters',
        );
      }
    }
  }

  private shouldResetApprovalStatus(
    project: Project,
    updateDto: UpdateProjectDto,
  ): boolean {
    // Reset approval if significant fields are changed
    const significantFields = [
      'title',
      'abstract',
      'specialization',
      'difficultyLevel',
    ];

    return significantFields.some(
      (field) =>
        updateDto[field] !== undefined && updateDto[field] !== project[field],
    );
  }
}
