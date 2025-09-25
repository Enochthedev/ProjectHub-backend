import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../entities/audit-log.entity';
import { Project } from '../entities/project.entity';
import { UpdateProjectDto } from '../dto/project';
import { ApprovalStatus } from '../common/enums';

export interface ProjectChangeLog {
  field: string;
  oldValue: any;
  newValue: any;
  changeType: 'update' | 'approval' | 'rejection' | 'archive';
}

@Injectable()
export class ProjectAuditService {
  private readonly logger = new Logger(ProjectAuditService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  async logProjectCreation(
    projectId: string,
    supervisorId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    await this.createAuditLog(
      supervisorId,
      'PROJECT_CREATED',
      `project:${projectId}`,
      { projectId },
      ipAddress,
      userAgent,
    );
  }

  async logProjectUpdate(
    projectId: string,
    userId: string,
    changes: ProjectChangeLog[],
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    await this.createAuditLog(
      userId,
      'PROJECT_UPDATED',
      `project:${projectId}`,
      { projectId, changes },
      ipAddress,
      userAgent,
    );
  }

  async logProjectApproval(
    projectId: string,
    adminId: string,
    approvalNotes?: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    await this.createAuditLog(
      adminId,
      'PROJECT_APPROVED',
      `project:${projectId}`,
      { projectId, approvalNotes },
      ipAddress,
      userAgent,
    );
  }

  async logProjectRejection(
    projectId: string,
    adminId: string,
    rejectionReason: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    await this.createAuditLog(
      adminId,
      'PROJECT_REJECTED',
      `project:${projectId}`,
      { projectId, rejectionReason },
      ipAddress,
      userAgent,
    );
  }

  async logProjectArchival(
    projectId: string,
    adminId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    await this.createAuditLog(
      adminId,
      'PROJECT_ARCHIVED',
      `project:${projectId}`,
      { projectId },
      ipAddress,
      userAgent,
    );
  }

  async getProjectAuditHistory(projectId: string): Promise<AuditLog[]> {
    return this.auditLogRepository.find({
      where: { resource: `project:${projectId}` },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  detectProjectChanges(
    originalProject: Project,
    updateDto: UpdateProjectDto,
  ): ProjectChangeLog[] {
    const changes: ProjectChangeLog[] = [];

    // Check each field for changes
    const fieldsToCheck = [
      'title',
      'abstract',
      'specialization',
      'difficultyLevel',
      'year',
      'tags',
      'technologyStack',
      'isGroupProject',
      'githubUrl',
      'demoUrl',
      'notes',
    ];

    for (const field of fieldsToCheck) {
      if (
        updateDto[field] !== undefined &&
        updateDto[field] !== originalProject[field]
      ) {
        changes.push({
          field,
          oldValue: originalProject[field],
          newValue: updateDto[field],
          changeType: 'update',
        });
      }
    }

    return changes;
  }

  private async createAuditLog(
    userId: string,
    action: string,
    resource: string,
    metadata: any,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    try {
      const auditLog = this.auditLogRepository.create({
        userId,
        action,
        resource,
        ipAddress,
        userAgent,
        // Store metadata in a JSON column if available, or log it
      });

      await this.auditLogRepository.save(auditLog);

      this.logger.log(
        `Audit log created: ${action} for ${resource} by user ${userId}`,
        { metadata },
      );
    } catch (error) {
      this.logger.error(
        `Failed to create audit log: ${action} for ${resource}`,
        error.stack,
      );
      // Don't throw error to avoid breaking the main operation
    }
  }
}
