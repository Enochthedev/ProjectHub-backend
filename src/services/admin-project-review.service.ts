import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Project } from '../entities/project.entity';
import { User } from '../entities/user.entity';
import { AdminAuditLog } from '../entities/admin-audit-log.entity';
import {
  ProjectReviewDto,
  BulkProjectReviewDto,
  ProjectQualityAssessmentDto,
  ReviewDecision,
  ReviewCriteria,
} from '../dto/admin/project-review.dto';
import { ApprovalStatus } from '../common/enums';
import {
  ProjectNotFoundException,
  ProjectValidationException,
  InsufficientPermissionsException,
} from '../common/exceptions';

@Injectable()
export class AdminProjectReviewService {
  private readonly logger = new Logger(AdminProjectReviewService.name);

  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(AdminAuditLog)
    private readonly auditRepository: Repository<AdminAuditLog>,
    private readonly dataSource: DataSource,
  ) {}

  async reviewProject(
    projectId: string,
    reviewDto: ProjectReviewDto,
    adminId: string,
  ): Promise<Project> {
    this.logger.log(`Reviewing project ${projectId} by admin ${adminId}`);

    const project = await this.findProjectById(projectId);
    const admin = await this.findAdminById(adminId);

    if (project.approvalStatus === ApprovalStatus.ARCHIVED) {
      throw new ProjectValidationException('Cannot review archived project');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const overallScore = this.calculateOverallScore(reviewDto.criteriaScores);

      const updatedProject = await this.processReviewDecision(
        project,
        reviewDto,
        adminId,
        overallScore,
        queryRunner,
      );

      await this.logReviewAction(
        projectId,
        adminId,
        reviewDto,
        overallScore,
        queryRunner,
      );

      await queryRunner.commitTransaction();

      this.logger.log(`Project ${projectId} reviewed successfully`);
      return updatedProject;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `Failed to review project ${projectId}: ${error.message}`,
      );
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async assessProjectQuality(
    projectId: string,
    adminId: string,
  ): Promise<ProjectQualityAssessmentDto> {
    this.logger.log(`Assessing quality for project ${projectId}`);

    const project = await this.findProjectById(projectId);
    const admin = await this.findAdminById(adminId);

    const assessment = await this.performQualityAssessment(project);
    await this.logQualityAssessment(projectId, adminId, assessment);

    return {
      projectId,
      overallScore: assessment.overallScore,
      criteriaScores: assessment.criteriaScores,
      summary: assessment.summary,
      strengths: assessment.strengths,
      improvements: assessment.improvements,
      recommendApproval: assessment.recommendApproval,
      assessedAt: new Date(),
      reviewerId: adminId,
    };
  }

  async getProjectsForReview(
    status?: ApprovalStatus,
    limit: number = 20,
    offset: number = 0,
  ): Promise<{ projects: Project[]; total: number }> {
    const queryBuilder = this.projectRepository
      .createQueryBuilder('project')
      .leftJoinAndSelect('project.supervisor', 'supervisor')
      .leftJoinAndSelect('supervisor.supervisorProfile', 'profile');

    if (status) {
      queryBuilder.where('project.approvalStatus = :status', { status });
    } else {
      queryBuilder.where('project.approvalStatus IN (:...statuses)', {
        statuses: [ApprovalStatus.PENDING],
      });
    }

    queryBuilder.orderBy('project.createdAt', 'ASC').skip(offset).take(limit);

    const [projects, total] = await queryBuilder.getManyAndCount();
    return { projects, total };
  }

  private async findProjectById(id: string): Promise<Project> {
    const project = await this.projectRepository.findOne({
      where: { id },
      relations: ['supervisor', 'supervisor.supervisorProfile'],
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

  private calculateOverallScore(criteriaScores: any[]): number {
    if (!criteriaScores || criteriaScores.length === 0) {
      return 0;
    }

    const totalScore = criteriaScores.reduce(
      (sum, score) => sum + score.score,
      0,
    );
    return Math.round((totalScore / criteriaScores.length) * 10);
  }

  private async processReviewDecision(
    project: Project,
    reviewDto: ProjectReviewDto,
    adminId: string,
    overallScore: number,
    queryRunner: any,
  ): Promise<Project> {
    let newStatus: ApprovalStatus;

    switch (reviewDto.decision) {
      case ReviewDecision.APPROVE:
        newStatus = ApprovalStatus.APPROVED;
        break;
      case ReviewDecision.REJECT:
        newStatus = ApprovalStatus.REJECTED;
        break;
      case ReviewDecision.REQUEST_CHANGES:
      case ReviewDecision.NEEDS_DISCUSSION:
        newStatus = ApprovalStatus.PENDING;
        break;
      default:
        throw new ProjectValidationException(
          `Invalid review decision: ${reviewDto.decision}`,
        );
    }

    await queryRunner.manager.update(Project, project.id, {
      approvalStatus: newStatus,
      approvedAt: newStatus === ApprovalStatus.APPROVED ? new Date() : null,
      approvedBy: newStatus === ApprovalStatus.APPROVED ? adminId : null,
      notes: reviewDto.overallComments,
    });

    return await queryRunner.manager.findOne(Project, {
      where: { id: project.id },
      relations: ['supervisor', 'supervisor.supervisorProfile'],
    });
  }

  private async logReviewAction(
    projectId: string,
    adminId: string,
    reviewDto: ProjectReviewDto,
    overallScore: number,
    queryRunner: any,
  ): Promise<void> {
    const auditLog = queryRunner.manager.create(AdminAuditLog, {
      adminId,
      action: 'project_review',
      resourceType: 'project',
      resourceId: projectId,
      afterState: {
        decision: reviewDto.decision,
        overallScore,
        criteriaScores: reviewDto.criteriaScores,
        comments: reviewDto.overallComments,
      },
      ipAddress: '127.0.0.1',
      userAgent: 'Admin Panel',
      success: true,
    });

    await queryRunner.manager.save(AdminAuditLog, auditLog);
  }

  private async performQualityAssessment(project: Project): Promise<any> {
    const scores: any[] = [];
    const strengths: string[] = [];
    const improvements: string[] = [];

    const titleScore = this.assessTitle(project.title);
    scores.push({ criteria: ReviewCriteria.SCOPE_CLARITY, score: titleScore });

    if (titleScore >= 8) {
      strengths.push('Clear and descriptive title');
    } else if (titleScore < 6) {
      improvements.push('Title could be more descriptive');
    }

    const abstractScore = this.assessAbstract(project.abstract);
    scores.push({ criteria: ReviewCriteria.METHODOLOGY, score: abstractScore });

    if (abstractScore >= 8) {
      strengths.push('Well-written abstract');
    } else if (abstractScore < 6) {
      improvements.push('Abstract needs more detail and clarity');
    }

    const techScore = this.assessTechnologyStack(project.technologyStack);
    scores.push({
      criteria: ReviewCriteria.TECHNICAL_FEASIBILITY,
      score: techScore,
    });

    if (techScore >= 8) {
      strengths.push('Appropriate technology choices');
    } else if (techScore < 6) {
      improvements.push('Technology stack could be more comprehensive');
    }

    const overallScore =
      (scores.reduce((sum, s) => sum + s.score, 0) / scores.length) * 10;

    return {
      overallScore: Math.round(overallScore),
      criteriaScores: scores,
      summary: this.generateAssessmentSummary(overallScore),
      strengths,
      improvements,
      recommendApproval: overallScore >= 70,
    };
  }

  private async logQualityAssessment(
    projectId: string,
    adminId: string,
    assessment: any,
  ): Promise<void> {
    const auditLog = this.auditRepository.create({
      adminId,
      action: 'quality_assessment',
      resourceType: 'project',
      resourceId: projectId,
      afterState: assessment,
      ipAddress: '127.0.0.1',
      userAgent: 'Admin Panel',
      success: true,
    });

    await this.auditRepository.save(auditLog);
  }

  private assessTitle(title: string): number {
    if (!title || title.trim().length === 0) return 1;

    let score = 5;

    if (title.length >= 20 && title.length <= 100) score += 2;
    else if (title.length < 10) score -= 2;

    const descriptiveWords = [
      'system',
      'application',
      'platform',
      'tool',
      'analysis',
      'development',
    ];
    if (descriptiveWords.some((word) => title.toLowerCase().includes(word)))
      score += 1;

    const genericWords = ['project', 'final year', 'thesis'];
    if (genericWords.some((word) => title.toLowerCase().includes(word)))
      score -= 1;

    return Math.max(1, Math.min(10, score));
  }

  private assessAbstract(abstract: string): number {
    if (!abstract || abstract.trim().length === 0) return 1;

    let score = 5;

    if (abstract.length >= 200 && abstract.length <= 1000) score += 2;
    else if (abstract.length < 100) score -= 2;

    const sentences = abstract.split('.').filter((s) => s.trim().length > 0);
    if (sentences.length >= 3) score += 1;

    const keyElements = [
      'objective',
      'method',
      'result',
      'conclusion',
      'problem',
      'solution',
    ];
    const foundElements = keyElements.filter((element) =>
      abstract.toLowerCase().includes(element),
    );
    score += Math.min(2, foundElements.length);

    return Math.max(1, Math.min(10, score));
  }

  private assessTechnologyStack(technologies: string[]): number {
    if (!technologies || technologies.length === 0) return 3;

    let score = 5;

    if (technologies.length >= 3 && technologies.length <= 8) score += 2;
    else if (technologies.length < 2) score -= 2;
    else if (technologies.length > 10) score -= 1;

    const categories = {
      frontend: ['react', 'vue', 'angular', 'html', 'css', 'javascript'],
      backend: ['node', 'express', 'django', 'flask', 'spring', 'laravel'],
      database: ['mysql', 'postgresql', 'mongodb', 'sqlite', 'redis'],
      mobile: ['react native', 'flutter', 'ionic', 'swift', 'kotlin'],
    };

    let categoriesFound = 0;
    Object.values(categories).forEach((categoryTechs) => {
      if (
        technologies.some((tech) =>
          categoryTechs.some((catTech) => tech.toLowerCase().includes(catTech)),
        )
      ) {
        categoriesFound++;
      }
    });

    if (categoriesFound >= 2) score += 1;
    if (categoriesFound >= 3) score += 1;

    return Math.max(1, Math.min(10, score));
  }

  private generateAssessmentSummary(overallScore: number): string {
    if (overallScore >= 90) {
      return 'Excellent project with outstanding quality across all criteria';
    } else if (overallScore >= 80) {
      return 'High-quality project with strong technical approach and clear objectives';
    } else if (overallScore >= 70) {
      return 'Good project that meets most quality standards with minor improvements needed';
    } else if (overallScore >= 60) {
      return 'Acceptable project but requires significant improvements before approval';
    } else {
      return 'Project needs substantial revision across multiple areas before consideration';
    }
  }
}
