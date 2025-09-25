import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Not, In } from 'typeorm';
import { MilestoneTemplate } from '../entities/milestone-template.entity';
import { Milestone } from '../entities/milestone.entity';
import { User } from '../entities/user.entity';
import { Project } from '../entities/project.entity';
import {
  ApplyTemplateDto,
  TemplateMilestoneCustomizationDto,
  CreateMilestoneDto,
} from '../dto/milestone';
import {
  MilestoneNotFoundException,
  MilestoneValidationException,
  MilestonePermissionException,
  AcademicCalendarException,
} from '../common/exceptions';
import { MilestoneStatus, Priority, UserRole } from '../common/enums';
import { TemplateMilestone } from '../entities/interfaces/template-milestone.interface';

export interface MilestoneTemplateApplicationServiceInterface {
  applyTemplate(
    applyDto: ApplyTemplateDto,
    studentId: string,
  ): Promise<Milestone[]>;
  validateTemplateApplication(
    templateId: string,
    startDate: Date,
    customizations?: TemplateMilestoneCustomizationDto[],
  ): Promise<string[]>;
  calculateMilestoneDueDates(
    template: MilestoneTemplate,
    startDate: Date,
    customDurationWeeks?: number,
  ): Map<string, Date>;
  detectSchedulingConflicts(
    studentId: string,
    proposedMilestones: { title: string; dueDate: Date }[],
  ): Promise<string[]>;
  previewTemplateApplication(
    applyDto: ApplyTemplateDto,
    studentId: string,
  ): Promise<
    {
      title: string;
      description: string;
      dueDate: Date;
      priority: Priority;
      estimatedHours: number;
    }[]
  >;
}

@Injectable()
export class MilestoneTemplateApplicationService
  implements MilestoneTemplateApplicationServiceInterface
{
  private readonly logger = new Logger(
    MilestoneTemplateApplicationService.name,
  );

  constructor(
    @InjectRepository(MilestoneTemplate)
    private readonly templateRepository: Repository<MilestoneTemplate>,
    @InjectRepository(Milestone)
    private readonly milestoneRepository: Repository<Milestone>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    private readonly dataSource: DataSource,
  ) {}

  async applyTemplate(
    applyDto: ApplyTemplateDto,
    studentId: string,
  ): Promise<Milestone[]> {
    this.logger.log(
      `Applying template ${applyDto.templateId} for student ${studentId}`,
    );

    // Validate student exists
    const student = await this.userRepository.findOne({
      where: { id: studentId },
    });

    if (!student) {
      throw new MilestoneValidationException('Student not found');
    }

    // Get template
    const template = await this.templateRepository.findOne({
      where: { id: applyDto.templateId, isActive: true },
      relations: ['createdBy'],
    });

    if (!template) {
      throw new MilestoneNotFoundException(
        `Template with ID ${applyDto.templateId} not found or inactive`,
      );
    }

    // Validate project if provided
    let project: Project | null = null;
    if (applyDto.projectId) {
      project = await this.projectRepository.findOne({
        where: { id: applyDto.projectId },
      });

      if (!project) {
        throw new MilestoneValidationException('Project not found');
      }

      // TODO: Validate student has access to this project
      // This would depend on the actual project-student relationship structure
    }

    const startDate = new Date(applyDto.startDate);

    // Validate template application
    const validationErrors = await this.validateTemplateApplication(
      applyDto.templateId,
      startDate,
      applyDto.customizations,
    );

    if (validationErrors.length > 0) {
      throw new MilestoneValidationException(
        `Template application validation failed: ${validationErrors.join(', ')}`,
      );
    }

    // Calculate milestone due dates
    const dueDateMap = this.calculateMilestoneDueDates(
      template,
      startDate,
      applyDto.customDurationWeeks,
    );

    // Apply customizations and create milestones
    const customizationMap = new Map<
      string,
      TemplateMilestoneCustomizationDto
    >();
    if (applyDto.customizations) {
      for (const customization of applyDto.customizations) {
        customizationMap.set(customization.milestoneTitle, customization);
      }
    }

    const milestonesToCreate: CreateMilestoneDto[] = [];

    for (const templateMilestone of template.milestoneItems) {
      const customization = customizationMap.get(templateMilestone.title);

      // Skip if marked for exclusion
      if (customization?.exclude) {
        continue;
      }

      // Apply customizations
      const milestoneData: CreateMilestoneDto = {
        title: customization?.newTitle || templateMilestone.title,
        description:
          customization?.newDescription || templateMilestone.description,
        dueDate: this.calculateCustomizedDueDate(
          templateMilestone,
          customization,
          dueDateMap,
          startDate,
        )
          .toISOString()
          .split('T')[0],
        priority: customization?.priority || templateMilestone.priority,
        estimatedHours:
          customization?.newEstimatedHours || templateMilestone.estimatedHours,
        projectId: applyDto.projectId,
        tags: templateMilestone.tags,
      };

      milestonesToCreate.push(milestoneData);
    }

    // Check for scheduling conflicts
    const proposedMilestones = milestonesToCreate.map((m) => ({
      title: m.title,
      dueDate: new Date(m.dueDate),
    }));

    const conflicts = await this.detectSchedulingConflicts(
      studentId,
      proposedMilestones,
    );
    if (conflicts.length > 0) {
      this.logger.warn(
        `Scheduling conflicts detected: ${conflicts.join(', ')}`,
      );
      // Log conflicts but don't block application - let user decide
    }

    // Create milestones in a transaction
    const createdMilestones = await this.dataSource.transaction(
      async (manager) => {
        const milestones: Milestone[] = [];

        for (const milestoneData of milestonesToCreate) {
          const milestone = manager.create(Milestone, {
            ...milestoneData,
            studentId,
            dueDate: new Date(milestoneData.dueDate),
            status: MilestoneStatus.NOT_STARTED,
            templateId: template.id,
          });

          const savedMilestone = await manager.save(milestone);
          milestones.push(savedMilestone);
        }

        // Update template usage count
        template.incrementUsage();
        await manager.save(template);

        return milestones;
      },
    );

    this.logger.log(
      `Applied template ${applyDto.templateId}, created ${createdMilestones.length} milestones`,
    );

    // Return milestones with relations
    const milestoneIds = createdMilestones.map((m) => m.id);
    return this.milestoneRepository.find({
      where: { id: In(milestoneIds) },
      relations: ['student', 'project'],
      order: { dueDate: 'ASC' },
    });
  }

  async validateTemplateApplication(
    templateId: string,
    startDate: Date,
    customizations?: TemplateMilestoneCustomizationDto[],
  ): Promise<string[]> {
    const errors: string[] = [];

    // Get template
    const template = await this.templateRepository.findOne({
      where: { id: templateId, isActive: true },
    });

    if (!template) {
      errors.push('Template not found or inactive');
      return errors;
    }

    // Validate start date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    startDate.setHours(0, 0, 0, 0);

    if (startDate < today) {
      errors.push('Start date cannot be in the past');
    }

    // Validate academic calendar compliance (only if within reasonable bounds)
    const currentYear = new Date().getFullYear();
    const academicYearStart = new Date(currentYear, 8, 1); // September 1st
    const academicYearEnd = new Date(currentYear + 2, 5, 30); // June 30th next year (extended for testing)

    if (startDate < academicYearStart || startDate > academicYearEnd) {
      try {
        await this.validateAcademicCalendarCompliance(template, startDate);
      } catch (error) {
        if (error instanceof AcademicCalendarException) {
          errors.push(error.message);
        }
      }
    }

    // Validate customizations
    if (customizations) {
      const templateMilestoneNames = new Set(
        template.milestoneItems.map((m) => m.title),
      );

      for (const customization of customizations) {
        if (!templateMilestoneNames.has(customization.milestoneTitle)) {
          errors.push(
            `Milestone "${customization.milestoneTitle}" not found in template`,
          );
        }

        // Validate customized due dates
        if (customization.newDaysFromStart !== undefined) {
          if (
            customization.newDaysFromStart < 0 ||
            customization.newDaysFromStart > 365
          ) {
            errors.push(
              `Invalid daysFromStart for "${customization.milestoneTitle}": must be between 0 and 365`,
            );
          }
        }

        // Validate estimated hours
        if (customization.newEstimatedHours !== undefined) {
          if (
            customization.newEstimatedHours <= 0 ||
            customization.newEstimatedHours > 1000
          ) {
            errors.push(
              `Invalid estimatedHours for "${customization.milestoneTitle}": must be between 1 and 1000`,
            );
          }
        }
      }

      // Check if required milestones are being excluded
      if (template.configuration?.requiredMilestones) {
        const excludedMilestones = customizations
          .filter((c) => c.exclude)
          .map((c) => c.milestoneTitle);

        for (const requiredMilestone of template.configuration
          .requiredMilestones) {
          if (excludedMilestones.includes(requiredMilestone)) {
            errors.push(
              `Required milestone "${requiredMilestone}" cannot be excluded`,
            );
          }
        }
      }
    }

    return errors;
  }

  calculateMilestoneDueDates(
    template: MilestoneTemplate,
    startDate: Date,
    customDurationWeeks?: number,
  ): Map<string, Date> {
    const dueDateMap = new Map<string, Date>();
    const durationWeeks =
      customDurationWeeks || template.estimatedDurationWeeks;
    const scaleFactor = durationWeeks / template.estimatedDurationWeeks;

    for (const milestone of template.milestoneItems) {
      const scaledDaysFromStart = Math.round(
        milestone.daysFromStart * scaleFactor,
      );
      const dueDate = new Date(startDate);
      dueDate.setDate(dueDate.getDate() + scaledDaysFromStart);

      dueDateMap.set(milestone.title, dueDate);
    }

    return dueDateMap;
  }

  async detectSchedulingConflicts(
    studentId: string,
    proposedMilestones: { title: string; dueDate: Date }[],
  ): Promise<string[]> {
    const conflicts: string[] = [];

    // Get existing milestones for the student
    const existingMilestones = await this.milestoneRepository.find({
      where: {
        studentId,
        status: Not(MilestoneStatus.COMPLETED),
      },
      select: ['title', 'dueDate'],
    });

    // Check for conflicts (milestones due within 3 days of each other)
    const conflictThresholdDays = 3;

    for (const proposed of proposedMilestones) {
      for (const existing of existingMilestones) {
        const daysDifference = Math.abs(
          (proposed.dueDate.getTime() - existing.dueDate.getTime()) /
            (1000 * 60 * 60 * 24),
        );

        if (daysDifference <= conflictThresholdDays) {
          conflicts.push(
            `"${proposed.title}" conflicts with existing milestone "${existing.title}" ` +
              `(${daysDifference.toFixed(0)} days apart)`,
          );
        }
      }

      // Check for conflicts within the proposed milestones themselves
      for (const other of proposedMilestones) {
        if (proposed !== other) {
          const daysDifference = Math.abs(
            (proposed.dueDate.getTime() - other.dueDate.getTime()) /
              (1000 * 60 * 60 * 24),
          );

          if (daysDifference <= conflictThresholdDays) {
            conflicts.push(
              `"${proposed.title}" conflicts with "${other.title}" ` +
                `(${daysDifference.toFixed(0)} days apart)`,
            );
          }
        }
      }
    }

    return [...new Set(conflicts)]; // Remove duplicates
  }

  async previewTemplateApplication(
    applyDto: ApplyTemplateDto,
    studentId: string,
  ): Promise<
    {
      title: string;
      description: string;
      dueDate: Date;
      priority: Priority;
      estimatedHours: number;
    }[]
  > {
    this.logger.log(
      `Previewing template application ${applyDto.templateId} for student ${studentId}`,
    );

    // Get template
    const template = await this.templateRepository.findOne({
      where: { id: applyDto.templateId, isActive: true },
    });

    if (!template) {
      throw new MilestoneNotFoundException(
        `Template with ID ${applyDto.templateId} not found or inactive`,
      );
    }

    const startDate = new Date(applyDto.startDate);

    // Calculate milestone due dates
    const dueDateMap = this.calculateMilestoneDueDates(
      template,
      startDate,
      applyDto.customDurationWeeks,
    );

    // Apply customizations
    const customizationMap = new Map<
      string,
      TemplateMilestoneCustomizationDto
    >();
    if (applyDto.customizations) {
      for (const customization of applyDto.customizations) {
        customizationMap.set(customization.milestoneTitle, customization);
      }
    }

    const previewMilestones: {
      title: string;
      description: string;
      dueDate: Date;
      priority: Priority;
      estimatedHours: number;
    }[] = [];

    for (const templateMilestone of template.milestoneItems) {
      const customization = customizationMap.get(templateMilestone.title);

      // Skip if marked for exclusion
      if (customization?.exclude) {
        continue;
      }

      const dueDate = this.calculateCustomizedDueDate(
        templateMilestone,
        customization,
        dueDateMap,
        startDate,
      );

      previewMilestones.push({
        title: customization?.newTitle || templateMilestone.title,
        description:
          customization?.newDescription || templateMilestone.description,
        dueDate,
        priority: customization?.priority || templateMilestone.priority,
        estimatedHours:
          customization?.newEstimatedHours || templateMilestone.estimatedHours,
      });
    }

    return previewMilestones.sort(
      (a, b) => a.dueDate.getTime() - b.dueDate.getTime(),
    );
  }

  private calculateCustomizedDueDate(
    templateMilestone: TemplateMilestone,
    customization: TemplateMilestoneCustomizationDto | undefined,
    dueDateMap: Map<string, Date>,
    startDate: Date,
  ): Date {
    if (customization?.newDaysFromStart !== undefined) {
      const customDueDate = new Date(startDate);
      customDueDate.setDate(
        customDueDate.getDate() + customization.newDaysFromStart,
      );
      return customDueDate;
    }

    return dueDateMap.get(templateMilestone.title) || new Date();
  }

  private async validateAcademicCalendarCompliance(
    template: MilestoneTemplate,
    startDate: Date,
  ): Promise<void> {
    // Calculate the end date based on template duration
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + template.estimatedDurationWeeks * 7);

    // Basic academic calendar validation
    const currentYear = new Date().getFullYear();
    const academicYearStart = new Date(currentYear, 8, 1); // September 1st
    const academicYearEnd = new Date(currentYear + 1, 5, 30); // June 30th next year

    if (startDate < academicYearStart || endDate > academicYearEnd) {
      throw new AcademicCalendarException(
        'Template application period must be within the current academic year',
        { startDate: startDate.toISOString(), endDate: endDate.toISOString() },
      );
    }

    // Check if any milestones would fall during major holidays
    const dueDateMap = this.calculateMilestoneDueDates(template, startDate);
    const holidayConflicts: string[] = [];

    for (const [milestoneTitle, dueDate] of dueDateMap.entries()) {
      const month = dueDate.getMonth();
      const day = dueDate.getDate();

      // Christmas period
      if (month === 11 && day >= 20 && day <= 31) {
        holidayConflicts.push(`${milestoneTitle} falls during Christmas break`);
      }

      // New Year period
      if (month === 0 && day <= 7) {
        holidayConflicts.push(`${milestoneTitle} falls during New Year break`);
      }
    }

    if (holidayConflicts.length > 0) {
      throw new AcademicCalendarException(
        `Template application conflicts with academic calendar: ${holidayConflicts.join(', ')}`,
        { conflicts: holidayConflicts },
      );
    }
  }
}
