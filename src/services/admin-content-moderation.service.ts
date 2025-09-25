import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Project } from '../entities/project.entity';
import { User } from '../entities/user.entity';
import { AdminAuditLog } from '../entities/admin-audit-log.entity';
import {
  ContentModerationDto,
  ContentModerationResultDto,
  ModerationAction,
} from '../dto/admin/content-moderation.dto';
import { ApprovalStatus } from '../common/enums';
import {
  ProjectNotFoundException,
  ProjectValidationException,
  InsufficientPermissionsException,
} from '../common/exceptions';

@Injectable()
export class AdminContentModerationService {
  private readonly logger = new Logger(AdminContentModerationService.name);

  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(AdminAuditLog)
    private readonly auditRepository: Repository<AdminAuditLog>,
    private readonly dataSource: DataSource,
  ) {}

  async moderateContent(
    projectId: string,
    moderationDto: ContentModerationDto,
    adminId: string,
  ): Promise<ContentModerationResultDto> {
    this.logger.log(
      `Moderating content for project ${projectId} by admin ${adminId}`,
    );

    try {
      const project = await this.findProjectById(projectId);
      const admin = await this.findAdminById(adminId);

      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        await this.processModerationAction(
          project,
          moderationDto,
          adminId,
          queryRunner,
        );
        await this.logModerationAction(
          projectId,
          adminId,
          moderationDto,
          queryRunner,
        );
        await queryRunner.commitTransaction();

        this.logger.log(
          `Content moderated successfully for project ${projectId}`,
        );

        return {
          projectId,
          action: moderationDto.action,
          success: true,
          moderatedAt: new Date(),
          moderatorId: adminId,
        };
      } catch (error) {
        await queryRunner.rollbackTransaction();
        throw error;
      } finally {
        await queryRunner.release();
      }
    } catch (error) {
      this.logger.error(
        `Failed to moderate content for project ${projectId}: ${error.message}`,
      );

      return {
        projectId,
        action: moderationDto.action,
        success: false,
        error: error.message,
        moderatedAt: new Date(),
        moderatorId: adminId,
      };
    }
  }

  private async findProjectById(id: string): Promise<Project> {
    const project = await this.projectRepository.findOne({
      where: { id },
      relations: ['supervisor'],
    });

    if (!project) {
      throw new ProjectNotFoundException(id);
    }

    return project;
  }

  private async findAdminById(id: string): Promise<User> {
    const admin = await this.userRepository.findOne({
      where: { id },
    });

    if (!admin || admin.role !== 'admin') {
      throw new InsufficientPermissionsException('Admin access required');
    }

    return admin;
  }

  private async processModerationAction(
    project: Project,
    moderationDto: ContentModerationDto,
    adminId: string,
    queryRunner: any,
  ): Promise<void> {
    switch (moderationDto.action) {
      case ModerationAction.APPROVE:
        await queryRunner.manager.update(Project, project.id, {
          approvalStatus: ApprovalStatus.APPROVED,
          approvedAt: new Date(),
          approvedBy: adminId,
        });
        break;
      case ModerationAction.REJECT:
        await queryRunner.manager.update(Project, project.id, {
          approvalStatus: ApprovalStatus.REJECTED,
        });
        break;
      case ModerationAction.ARCHIVE:
        await queryRunner.manager.update(Project, project.id, {
          approvalStatus: ApprovalStatus.ARCHIVED,
        });
        break;
      case ModerationAction.FLAG:
      case ModerationAction.REQUIRE_CHANGES:
        // Keep as pending but add flags/feedback
        break;
      default:
        throw new ProjectValidationException(
          `Invalid moderation action: ${moderationDto.action}`,
        );
    }
  }

  private async logModerationAction(
    projectId: string,
    adminId: string,
    moderationDto: ContentModerationDto,
    queryRunner: any,
  ): Promise<void> {
    const auditLog = queryRunner.manager.create(AdminAuditLog, {
      adminId,
      action: 'content_moderation',
      resourceType: 'project',
      resourceId: projectId,
      afterState: {
        action: moderationDto.action,
        reason: moderationDto.reason,
        flags: moderationDto.flags,
        qualityLevel: moderationDto.qualityLevel,
        feedback: moderationDto.feedback,
      },
      ipAddress: '127.0.0.1',
      userAgent: 'Admin Panel',
      success: true,
    });

    await queryRunner.manager.save(AdminAuditLog, auditLog);
  }
}
