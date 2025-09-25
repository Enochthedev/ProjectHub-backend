import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Like, In, Not } from 'typeorm';
import { MilestoneTemplate } from '../entities/milestone-template.entity';
import { User } from '../entities/user.entity';
import {
  CreateTemplateDto,
  UpdateTemplateDto,
  TemplateFiltersDto,
  TemplateUsageStatsDto,
} from '../dto/milestone';
import {
  MilestoneNotFoundException,
  MilestoneValidationException,
  MilestonePermissionException,
} from '../common/exceptions';
import { UserRole } from '../common/enums/user-role.enum';
import { ProjectType } from '../common/enums/project-type.enum';

export interface MilestoneTemplateServiceInterface {
  createTemplate(
    createDto: CreateTemplateDto,
    createdById: string,
  ): Promise<MilestoneTemplate>;
  updateTemplate(
    id: string,
    updateDto: UpdateTemplateDto,
    userId: string,
  ): Promise<MilestoneTemplate>;
  deleteTemplate(id: string, userId: string): Promise<void>;
  archiveTemplate(id: string, userId: string): Promise<MilestoneTemplate>;
  restoreTemplate(id: string, userId: string): Promise<MilestoneTemplate>;
  getTemplates(
    filters?: TemplateFiltersDto,
  ): Promise<{ templates: MilestoneTemplate[]; total: number }>;
  getTemplateById(id: string): Promise<MilestoneTemplate>;
  getTemplateUsageStats(id: string): Promise<TemplateUsageStatsDto>;
  validateTemplate(template: MilestoneTemplate): Promise<string[]>;
  duplicateTemplate(
    id: string,
    userId: string,
    newName?: string,
  ): Promise<MilestoneTemplate>;
}

@Injectable()
export class MilestoneTemplateService
  implements MilestoneTemplateServiceInterface
{
  private readonly logger = new Logger(MilestoneTemplateService.name);

  constructor(
    @InjectRepository(MilestoneTemplate)
    private readonly templateRepository: Repository<MilestoneTemplate>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly dataSource: DataSource,
  ) {}

  async createTemplate(
    createDto: CreateTemplateDto,
    createdById: string,
  ): Promise<MilestoneTemplate> {
    this.logger.log(
      `Creating template "${createDto.name}" by user ${createdById}`,
    );

    // Validate user exists and has permission
    const user = await this.userRepository.findOne({
      where: { id: createdById },
    });

    if (!user) {
      throw new MilestoneValidationException('User not found');
    }

    if (user.role !== UserRole.ADMIN && user.role !== UserRole.SUPERVISOR) {
      throw new MilestonePermissionException(
        'Only admins and supervisors can create templates',
      );
    }

    // Check for duplicate template names within the same specialization
    const existingTemplate = await this.templateRepository.findOne({
      where: {
        name: createDto.name,
        specialization: createDto.specialization,
        isActive: true,
      },
    });

    if (existingTemplate) {
      throw new MilestoneValidationException(
        `Template with name "${createDto.name}" already exists for specialization "${createDto.specialization}"`,
      );
    }

    // Create template with default configuration if not provided
    const configuration =
      createDto.configuration || MilestoneTemplate.createDefaultConfiguration();

    const template = this.templateRepository.create({
      ...createDto,
      configuration,
      createdById,
      tags: createDto.tags || [],
    });

    // Validate template structure
    const validationErrors = await this.validateTemplate(template);
    if (validationErrors.length > 0) {
      throw new MilestoneValidationException(
        `Template validation failed: ${validationErrors.join(', ')}`,
      );
    }

    const savedTemplate = await this.templateRepository.save(template);

    this.logger.log(
      `Created template ${savedTemplate.id} "${savedTemplate.name}"`,
    );

    return this.getTemplateById(savedTemplate.id);
  }

  async updateTemplate(
    id: string,
    updateDto: UpdateTemplateDto,
    userId: string,
  ): Promise<MilestoneTemplate> {
    this.logger.log(`Updating template ${id} by user ${userId}`);

    const template = await this.getTemplateWithPermissionCheck(id, userId);

    // Check for name conflicts if name is being changed
    if (updateDto.name && updateDto.name !== template.name) {
      const existingTemplate = await this.templateRepository.findOne({
        where: {
          name: updateDto.name,
          specialization: updateDto.specialization || template.specialization,
          isActive: true,
          id: Not(id),
        },
      });

      if (existingTemplate) {
        throw new MilestoneValidationException(
          `Template with name "${updateDto.name}" already exists for this specialization`,
        );
      }
    }

    // Update template properties
    Object.assign(template, updateDto);

    // Validate updated template if milestone items or configuration changed
    if (updateDto.milestoneItems || updateDto.configuration) {
      const validationErrors = await this.validateTemplate(template);
      if (validationErrors.length > 0) {
        throw new MilestoneValidationException(
          `Template validation failed: ${validationErrors.join(', ')}`,
        );
      }
    }

    const updatedTemplate = await this.templateRepository.save(template);

    this.logger.log(`Updated template ${id}`);

    return this.getTemplateById(updatedTemplate.id);
  }

  async deleteTemplate(id: string, userId: string): Promise<void> {
    this.logger.log(`Deleting template ${id} by user ${userId}`);

    const template = await this.getTemplateWithPermissionCheck(id, userId);

    // Check if template is being used
    if (template.usageCount > 0) {
      throw new MilestoneValidationException(
        'Cannot delete template that has been used. Consider archiving instead.',
      );
    }

    await this.templateRepository.remove(template);

    this.logger.log(`Deleted template ${id}`);
  }

  async archiveTemplate(
    id: string,
    userId: string,
  ): Promise<MilestoneTemplate> {
    this.logger.log(`Archiving template ${id} by user ${userId}`);

    const template = await this.getTemplateWithPermissionCheck(id, userId);

    template.archive();
    const archivedTemplate = await this.templateRepository.save(template);

    this.logger.log(`Archived template ${id}`);

    return archivedTemplate;
  }

  async restoreTemplate(
    id: string,
    userId: string,
  ): Promise<MilestoneTemplate> {
    this.logger.log(`Restoring template ${id} by user ${userId}`);

    const template = await this.getTemplateWithPermissionCheck(id, userId);

    template.restore();
    const restoredTemplate = await this.templateRepository.save(template);

    this.logger.log(`Restored template ${id}`);

    return restoredTemplate;
  }

  async getTemplates(
    filters: TemplateFiltersDto = {},
  ): Promise<{ templates: MilestoneTemplate[]; total: number }> {
    this.logger.log('Getting templates with filters', filters);

    const queryBuilder = this.templateRepository
      .createQueryBuilder('template')
      .leftJoinAndSelect('template.createdBy', 'createdBy')
      .leftJoinAndSelect('createdBy.studentProfile', 'studentProfile')
      .leftJoinAndSelect('createdBy.supervisorProfile', 'supervisorProfile');

    // Apply filters
    if (filters.specialization) {
      queryBuilder.andWhere('template.specialization = :specialization', {
        specialization: filters.specialization,
      });
    }

    if (filters.projectType) {
      queryBuilder.andWhere('template.projectType = :projectType', {
        projectType: filters.projectType,
      });
    }

    if (filters.isActive !== undefined) {
      queryBuilder.andWhere('template.isActive = :isActive', {
        isActive: filters.isActive,
      });
    }

    if (filters.search) {
      queryBuilder.andWhere(
        '(template.name ILIKE :search OR template.description ILIKE :search OR template.specialization ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    if (filters.tags && filters.tags.length > 0) {
      queryBuilder.andWhere('template.tags && :tags', {
        tags: filters.tags,
      });
    }

    if (filters.minDurationWeeks) {
      queryBuilder.andWhere('template.estimatedDurationWeeks >= :minDuration', {
        minDuration: filters.minDurationWeeks,
      });
    }

    if (filters.maxDurationWeeks) {
      queryBuilder.andWhere('template.estimatedDurationWeeks <= :maxDuration', {
        maxDuration: filters.maxDurationWeeks,
      });
    }

    if (filters.createdBy) {
      queryBuilder.andWhere('template.createdById = :createdBy', {
        createdBy: filters.createdBy,
      });
    }

    // Get total count
    const total = await queryBuilder.getCount();

    // Apply sorting
    const sortBy = filters.sortBy || 'createdAt';
    const sortOrder = filters.sortOrder || 'DESC';

    switch (sortBy) {
      case 'name':
        queryBuilder.orderBy('template.name', sortOrder);
        break;
      case 'usageCount':
        queryBuilder.orderBy('template.usageCount', sortOrder);
        break;
      case 'averageRating':
        queryBuilder.orderBy('template.averageRating', sortOrder);
        break;
      default:
        queryBuilder.orderBy('template.createdAt', sortOrder);
    }

    // Apply pagination
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    queryBuilder.skip(offset).take(limit);

    const templates = await queryBuilder.getMany();

    return { templates, total };
  }

  async getTemplateById(id: string): Promise<MilestoneTemplate> {
    const template = await this.templateRepository.findOne({
      where: { id },
      relations: [
        'createdBy',
        'createdBy.studentProfile',
        'createdBy.supervisorProfile',
      ],
    });

    if (!template) {
      throw new MilestoneNotFoundException(`Template with ID ${id} not found`);
    }

    return template;
  }

  async getTemplateUsageStats(id: string): Promise<TemplateUsageStatsDto> {
    this.logger.log(`Getting usage stats for template ${id}`);

    const template = await this.getTemplateById(id);

    // TODO: Implement actual usage statistics by querying milestones created from this template
    // This would require tracking template usage in the Milestone entity
    // For now, return basic stats from the template entity

    return {
      templateId: template.id,
      templateName: template.name,
      totalUsages: template.usageCount,
      averageRating: template.averageRating,
      ratingCount: template.ratingCount,
      successfulApplications: template.usageCount, // Placeholder
      averageCompletionTime: null, // Would need to calculate from actual milestone data
      mostCommonCustomizations: [], // Would need to track customizations
      recentUsages: [], // Would need to query milestone applications
    };
  }

  async validateTemplate(template: MilestoneTemplate): Promise<string[]> {
    const errors: string[] = [];

    // Validate basic template properties
    if (!template.name || template.name.trim().length < 3) {
      errors.push('Template name must be at least 3 characters long');
    }

    if (!template.description || template.description.trim().length < 10) {
      errors.push('Template description must be at least 10 characters long');
    }

    if (!template.specialization || template.specialization.trim().length < 2) {
      errors.push('Template specialization must be specified');
    }

    if (!Object.values(ProjectType).includes(template.projectType)) {
      errors.push('Invalid project type');
    }

    if (
      template.estimatedDurationWeeks < 1 ||
      template.estimatedDurationWeeks > 52
    ) {
      errors.push('Estimated duration must be between 1 and 52 weeks');
    }

    // Validate milestone items
    if (!template.milestoneItems || template.milestoneItems.length === 0) {
      errors.push('Template must have at least one milestone');
    } else {
      // Use the entity's validation method
      const milestoneErrors = template.validateMilestoneItems();
      errors.push(...milestoneErrors);

      // Additional validations
      const totalDays = Math.max(
        ...template.milestoneItems.map((m) => m.daysFromStart),
      );
      const expectedDays = template.estimatedDurationWeeks * 7;

      if (totalDays > expectedDays + 7) {
        // Allow 1 week buffer
        errors.push(
          `Milestone timeline (${totalDays} days) exceeds estimated duration (${expectedDays} days)`,
        );
      }
    }

    // Validate configuration if present
    if (template.configuration) {
      const config = template.configuration;

      if (config.minimumDurationWeeks < 1 || config.minimumDurationWeeks > 52) {
        errors.push('Minimum duration must be between 1 and 52 weeks');
      }

      if (
        config.maximumDurationWeeks < 1 ||
        config.maximumDurationWeeks > 104
      ) {
        errors.push('Maximum duration must be between 1 and 104 weeks');
      }

      if (config.minimumDurationWeeks > config.maximumDurationWeeks) {
        errors.push('Minimum duration cannot be greater than maximum duration');
      }

      // Validate required/optional milestone references
      const milestoneNames = new Set(
        template.milestoneItems.map((m) => m.title),
      );

      for (const requiredMilestone of config.requiredMilestones) {
        if (!milestoneNames.has(requiredMilestone)) {
          errors.push(
            `Required milestone "${requiredMilestone}" not found in template`,
          );
        }
      }

      for (const optionalMilestone of config.optionalMilestones) {
        if (!milestoneNames.has(optionalMilestone)) {
          errors.push(
            `Optional milestone "${optionalMilestone}" not found in template`,
          );
        }
      }
    }

    // Validate academic calendar compliance (basic check)
    await this.validateAcademicCalendarCompliance(template, errors);

    return errors;
  }

  async duplicateTemplate(
    id: string,
    userId: string,
    newName?: string,
  ): Promise<MilestoneTemplate> {
    this.logger.log(`Duplicating template ${id} by user ${userId}`);

    const originalTemplate = await this.getTemplateById(id);

    // Validate user has permission to create templates
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new MilestoneValidationException('User not found');
    }

    if (user.role !== UserRole.ADMIN && user.role !== UserRole.SUPERVISOR) {
      throw new MilestonePermissionException(
        'Only admins and supervisors can create templates',
      );
    }

    const duplicateName = newName || `${originalTemplate.name} (Copy)`;

    // Check for name conflicts
    const existingTemplate = await this.templateRepository.findOne({
      where: {
        name: duplicateName,
        specialization: originalTemplate.specialization,
        isActive: true,
      },
    });

    if (existingTemplate) {
      throw new MilestoneValidationException(
        `Template with name "${duplicateName}" already exists for this specialization`,
      );
    }

    const duplicateTemplate = this.templateRepository.create({
      name: duplicateName,
      description: originalTemplate.description,
      specialization: originalTemplate.specialization,
      projectType: originalTemplate.projectType,
      milestoneItems: JSON.parse(
        JSON.stringify(originalTemplate.milestoneItems),
      ), // Deep copy
      configuration: originalTemplate.configuration
        ? JSON.parse(JSON.stringify(originalTemplate.configuration))
        : null, // Deep copy
      estimatedDurationWeeks: originalTemplate.estimatedDurationWeeks,
      tags: [...originalTemplate.tags],
      createdById: userId,
    });

    const savedTemplate = await this.templateRepository.save(duplicateTemplate);

    this.logger.log(`Duplicated template ${id} as ${savedTemplate.id}`);

    return this.getTemplateById(savedTemplate.id);
  }

  private async getTemplateWithPermissionCheck(
    id: string,
    userId: string,
  ): Promise<MilestoneTemplate> {
    const template = await this.templateRepository.findOne({
      where: { id },
      relations: [
        'createdBy',
        'createdBy.studentProfile',
        'createdBy.supervisorProfile',
      ],
    });

    if (!template) {
      throw new MilestoneNotFoundException(`Template with ID ${id} not found`);
    }

    // Check permissions
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new MilestonePermissionException('User not found');
    }

    const canModify =
      user.role === UserRole.ADMIN || // Admins can modify all templates
      template.createdById === userId; // Creators can modify their own templates

    if (!canModify) {
      throw new MilestonePermissionException(
        'Insufficient permissions to modify this template',
      );
    }

    return template;
  }

  private async validateAcademicCalendarCompliance(
    template: MilestoneTemplate,
    errors: string[],
  ): Promise<void> {
    // Basic academic calendar validation
    // This can be extended to check against actual academic calendar data

    const maxDaysFromStart = Math.max(
      ...template.milestoneItems.map((m) => m.daysFromStart),
    );
    const academicYearDays = 280; // Approximate academic year length

    if (maxDaysFromStart > academicYearDays) {
      errors.push(
        `Template timeline (${maxDaysFromStart} days) exceeds typical academic year length`,
      );
    }

    // Check for milestones scheduled during typical break periods
    const breakPeriods = [
      { start: 355, end: 365, name: 'Winter Break' }, // Late December
      { start: 1, end: 7, name: 'New Year Break' }, // Early January
      { start: 90, end: 100, name: 'Spring Break' }, // Late March/Early April
    ];

    for (const milestone of template.milestoneItems) {
      const dayOfYear = milestone.daysFromStart % 365;

      for (const breakPeriod of breakPeriods) {
        if (dayOfYear >= breakPeriod.start && dayOfYear <= breakPeriod.end) {
          errors.push(
            `Milestone "${milestone.title}" is scheduled during ${breakPeriod.name} (day ${dayOfYear})`,
          );
        }
      }
    }
  }
}
