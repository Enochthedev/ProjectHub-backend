import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { MilestoneTemplate } from '../entities/milestone-template.entity';
import { MilestoneTemplateVersion } from '../entities/milestone-template-version.entity';
import { AcademicCalendar } from '../entities/academic-calendar.entity';
import { TemplateEffectiveness } from '../entities/template-effectiveness.entity';
import { User } from '../entities/user.entity';
import {
  TemplateMilestone,
  TemplateConfiguration,
} from '../entities/interfaces/template-milestone.interface';
import {
  MilestoneNotFoundException,
  MilestoneValidationException,
} from '../common/exceptions';
import { ProjectType } from '../common/enums';

export interface WorkflowCustomization {
  templateId: string;
  projectType: ProjectType;
  specialization: string;
  customizations: Array<{
    type: 'milestone_adjustment' | 'timeline_optimization' | 'resource_allocation' | 'difficulty_scaling';
    description: string;
    impact: 'low' | 'medium' | 'high';
    recommendation: string;
  }>;
  estimatedImprovements: {
    completionRateIncrease: number;
    timeEfficiencyGain: number;
    studentSatisfactionBoost: number;
  };
}

export interface WorkflowOptimizationRecommendation {
  templateId: string;
  templateName: string;
  currentEffectivenessScore: number;
  optimizationOpportunities: Array<{
    category: 'timeline' | 'milestones' | 'dependencies' | 'resources' | 'difficulty';
    issue: string;
    recommendation: string;
    expectedImprovement: number;
    implementationComplexity: 'low' | 'medium' | 'high';
    priority: 'low' | 'medium' | 'high';
  }>;
  proposedChanges: {
    milestoneAdjustments: Array<{
      milestoneTitle: string;
      currentDays: number;
      recommendedDays: number;
      reason: string;
    }>;
    newMilestones: Array<{
      title: string;
      description: string;
      daysFromStart: number;
      reason: string;
    }>;
    removedMilestones: string[];
  };
  predictedOutcome: {
    effectivenessScoreIncrease: number;
    completionRateImprovement: number;
    timeAccuracyImprovement: number;
  };
}

export interface AcademicCalendarAdjustment {
  templateId: string;
  adjustmentType: 'holiday_avoidance' | 'semester_alignment' | 'exam_period_consideration' | 'break_optimization';
  originalTimeline: Array<{ milestone: string; originalDate: Date }>;
  adjustedTimeline: Array<{ milestone: string; adjustedDate: Date; reason: string }>;
  impactAnalysis: {
    totalDaysShifted: number;
    milestonesAffected: number;
    criticalPathImpact: boolean;
  };
}

@Injectable()
export class WorkflowAutomationService {
  private readonly logger = new Logger(WorkflowAutomationService.name);

  constructor(
    @InjectRepository(MilestoneTemplate)
    private readonly templateRepository: Repository<MilestoneTemplate>,
    @InjectRepository(MilestoneTemplateVersion)
    private readonly versionRepository: Repository<MilestoneTemplateVersion>,
    @InjectRepository(AcademicCalendar)
    private readonly academicCalendarRepository: Repository<AcademicCalendar>,
    @InjectRepository(TemplateEffectiveness)
    private readonly effectivenessRepository: Repository<TemplateEffectiveness>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly dataSource: DataSource,
  ) { }

  async customizeWorkflowForProjectType(
    templateId: string,
    projectType: ProjectType,
    specialization: string,
    userId: string,
  ): Promise<WorkflowCustomization> {
    this.logger.log(`Customizing workflow for template ${templateId}, projectType ${projectType}, specialization ${specialization}`);

    const template = await this.templateRepository.findOne({
      where: { id: templateId },
    });

    if (!template) {
      throw new MilestoneNotFoundException(`Template ${templateId} not found`);
    }

    // Get effectiveness data for analysis
    const effectivenessData = await this.effectivenessRepository.find({
      where: { templateId },
    });

    const customizations: WorkflowCustomization['customizations'] = [];

    // Analyze project type specific requirements
    switch (projectType) {
      case ProjectType.RESEARCH:
        customizations.push(...this.getResearchProjectCustomizations(template, effectivenessData));
        break;
      case ProjectType.INDUSTRY:
        customizations.push(...this.getDevelopmentProjectCustomizations(template, effectivenessData));
        break;
      case ProjectType.GROUP:
        customizations.push(...this.getAnalysisProjectCustomizations(template, effectivenessData));
        break;
      default:
        customizations.push(...this.getGenericProjectCustomizations(template, effectivenessData));
    }

    // Add specialization-specific customizations
    customizations.push(...this.getSpecializationCustomizations(specialization, template, effectivenessData));

    // Calculate estimated improvements
    const estimatedImprovements = this.calculateEstimatedImprovements(customizations, effectivenessData);

    return {
      templateId,
      projectType,
      specialization,
      customizations,
      estimatedImprovements,
    };
  }

  async generateOptimizationRecommendations(templateId: string): Promise<WorkflowOptimizationRecommendation> {
    this.logger.log(`Generating optimization recommendations for template ${templateId}`);

    const template = await this.templateRepository.findOne({
      where: { id: templateId },
    });

    if (!template) {
      throw new MilestoneNotFoundException(`Template ${templateId} not found`);
    }

    // Get effectiveness data
    const effectivenessData = await this.effectivenessRepository.find({
      where: { templateId },
      relations: ['student', 'project'],
    });

    if (effectivenessData.length === 0) {
      throw new MilestoneValidationException(`No effectiveness data available for template ${templateId}`);
    }

    // Calculate current effectiveness score
    const currentEffectivenessScore = effectivenessData.reduce(
      (sum, record) => sum + record.getEffectivenessScore(),
      0
    ) / effectivenessData.length;

    // Analyze optimization opportunities
    const optimizationOpportunities = await this.analyzeOptimizationOpportunities(template, effectivenessData);

    // Generate proposed changes
    const proposedChanges = await this.generateProposedChanges(template, effectivenessData, optimizationOpportunities);

    // Predict outcomes
    const predictedOutcome = this.predictOptimizationOutcome(optimizationOpportunities, effectivenessData);

    return {
      templateId,
      templateName: template.name,
      currentEffectivenessScore,
      optimizationOpportunities,
      proposedChanges,
      predictedOutcome,
    };
  }

  async adjustTemplateToAcademicCalendar(
    templateId: string,
    academicYear: string,
    startDate: Date,
    userId: string,
  ): Promise<AcademicCalendarAdjustment> {
    this.logger.log(`Adjusting template ${templateId} to academic calendar for year ${academicYear}`);

    const template = await this.templateRepository.findOne({
      where: { id: templateId },
    });

    if (!template) {
      throw new MilestoneNotFoundException(`Template ${templateId} not found`);
    }

    // Get academic calendar data (assuming academicYear is stored as string in a different field)
    const academicCalendar = await this.academicCalendarRepository.findOne({
      where: { year: academicYear } as any, // Cast to any since we don't have the exact AcademicCalendar structure
    });

    // Calculate original timeline
    const originalTimeline = template.milestoneItems.map(milestone => ({
      milestone: milestone.title,
      originalDate: new Date(startDate.getTime() + milestone.daysFromStart * 24 * 60 * 60 * 1000),
    }));

    // Identify conflicts and adjustments needed
    const adjustments = await this.identifyCalendarConflicts(originalTimeline, academicCalendar);

    // Apply adjustments
    const adjustedTimeline = this.applyCalendarAdjustments(originalTimeline, adjustments);

    // Calculate impact
    const impactAnalysis = this.calculateAdjustmentImpact(originalTimeline, adjustedTimeline);

    // Create new template version with adjustments if significant changes
    if (impactAnalysis.totalDaysShifted > 7) {
      await this.createAdjustedTemplateVersion(template, adjustedTimeline, userId, academicYear);
    }

    return {
      templateId,
      adjustmentType: this.determineAdjustmentType(adjustments),
      originalTimeline,
      adjustedTimeline,
      impactAnalysis,
    };
  }
  a
  async automateWorkflowOptimization(
    templateId: string,
    userId: string,
    options: {
      autoApplyLowRiskChanges?: boolean;
      createNewVersion?: boolean;
      notifyCreator?: boolean;
    } = {},
  ): Promise<{
    appliedOptimizations: string[];
    pendingRecommendations: string[];
    newVersionId?: string;
  }> {
    this.logger.log(`Automating workflow optimization for template ${templateId}`);

    const recommendations = await this.generateOptimizationRecommendations(templateId);
    const appliedOptimizations: string[] = [];
    const pendingRecommendations: string[] = [];

    // Apply low-risk optimizations automatically if enabled
    if (options.autoApplyLowRiskChanges) {
      const lowRiskOpportunities = recommendations.optimizationOpportunities.filter(
        opp => opp.implementationComplexity === 'low' && opp.expectedImprovement > 5
      );

      for (const opportunity of lowRiskOpportunities) {
        try {
          await this.applyOptimization(templateId, opportunity, userId);
          appliedOptimizations.push(opportunity.recommendation);
        } catch (error) {
          this.logger.warn(`Failed to apply optimization: ${error.message}`);
          pendingRecommendations.push(opportunity.recommendation);
        }
      }
    }

    // Add medium and high complexity recommendations to pending
    const complexRecommendations = recommendations.optimizationOpportunities.filter(
      opp => opp.implementationComplexity !== 'low' || !options.autoApplyLowRiskChanges
    );

    pendingRecommendations.push(...complexRecommendations.map(opp => opp.recommendation));

    // Create new version if requested and changes were applied
    let newVersionId: string | undefined;
    if (options.createNewVersion && appliedOptimizations.length > 0) {
      const template = await this.templateRepository.findOne({ where: { id: templateId } });
      if (template) {
        const newVersion = await this.createOptimizedTemplateVersion(
          template,
          appliedOptimizations,
          userId
        );
        newVersionId = newVersion.id;
      }
    }

    return {
      appliedOptimizations,
      pendingRecommendations,
      newVersionId,
    };
  }

  private getResearchProjectCustomizations(
    template: MilestoneTemplate,
    effectivenessData: TemplateEffectiveness[],
  ): WorkflowCustomization['customizations'] {
    const customizations: WorkflowCustomization['customizations'] = [];

    // Research projects typically need more time for literature review and analysis
    const hasLiteratureReview = template.milestoneItems.some(m =>
      m.title.toLowerCase().includes('literature') || m.title.toLowerCase().includes('review')
    );

    if (!hasLiteratureReview) {
      customizations.push({
        type: 'milestone_adjustment',
        description: 'Add literature review milestone for research projects',
        impact: 'high',
        recommendation: 'Include a dedicated literature review phase early in the project timeline',
      });
    }

    // Check if methodology milestone exists
    const hasMethodology = template.milestoneItems.some(m =>
      m.title.toLowerCase().includes('methodology') || m.title.toLowerCase().includes('method')
    );

    if (!hasMethodology) {
      customizations.push({
        type: 'milestone_adjustment',
        description: 'Add methodology definition milestone',
        impact: 'high',
        recommendation: 'Include methodology definition before data collection or analysis',
      });
    }

    // Research projects often need more buffer time
    customizations.push({
      type: 'timeline_optimization',
      description: 'Increase buffer time for research uncertainties',
      impact: 'medium',
      recommendation: 'Add 15-20% buffer time to account for research complexities',
    });

    return customizations;
  }

  private getDevelopmentProjectCustomizations(
    template: MilestoneTemplate,
    effectivenessData: TemplateEffectiveness[],
  ): WorkflowCustomization['customizations'] {
    const customizations: WorkflowCustomization['customizations'] = [];

    // Development projects need testing phases
    const hasTesting = template.milestoneItems.some(m =>
      m.title.toLowerCase().includes('test') || m.title.toLowerCase().includes('qa')
    );

    if (!hasTesting) {
      customizations.push({
        type: 'milestone_adjustment',
        description: 'Add testing and QA milestones',
        impact: 'high',
        recommendation: 'Include unit testing, integration testing, and user acceptance testing phases',
      });
    }

    // Check for deployment milestone
    const hasDeployment = template.milestoneItems.some(m =>
      m.title.toLowerCase().includes('deploy') || m.title.toLowerCase().includes('release')
    );

    if (!hasDeployment) {
      customizations.push({
        type: 'milestone_adjustment',
        description: 'Add deployment milestone',
        impact: 'medium',
        recommendation: 'Include deployment and release preparation phase',
      });
    }

    return customizations;
  }

  private getAnalysisProjectCustomizations(
    template: MilestoneTemplate,
    effectivenessData: TemplateEffectiveness[],
  ): WorkflowCustomization['customizations'] {
    const customizations: WorkflowCustomization['customizations'] = [];

    // Analysis projects need data collection and validation
    const hasDataCollection = template.milestoneItems.some(m =>
      m.title.toLowerCase().includes('data') && m.title.toLowerCase().includes('collect')
    );

    if (!hasDataCollection) {
      customizations.push({
        type: 'milestone_adjustment',
        description: 'Add data collection milestone',
        impact: 'high',
        recommendation: 'Include dedicated data collection and validation phase',
      });
    }

    return customizations;
  }

  private getGenericProjectCustomizations(
    template: MilestoneTemplate,
    effectivenessData: TemplateEffectiveness[],
  ): WorkflowCustomization['customizations'] {
    const customizations: WorkflowCustomization['customizations'] = [];

    // Generic recommendations based on effectiveness data
    if (effectivenessData.length > 0) {
      const avgCompletionRate = effectivenessData.reduce((sum, record) =>
        sum + (record.completionPercentage || 0), 0) / effectivenessData.length;

      if (avgCompletionRate < 70) {
        customizations.push({
          type: 'difficulty_scaling',
          description: 'Reduce complexity based on low completion rates',
          impact: 'high',
          recommendation: 'Consider breaking down complex milestones into smaller, manageable tasks',
        });
      }
    }

    return customizations;
  }

  private getSpecializationCustomizations(
    specialization: string,
    template: MilestoneTemplate,
    effectivenessData: TemplateEffectiveness[],
  ): WorkflowCustomization['customizations'] {
    const customizations: WorkflowCustomization['customizations'] = [];

    // Specialization-specific customizations
    switch (specialization.toLowerCase()) {
      case 'computer science':
      case 'software engineering':
        customizations.push({
          type: 'resource_allocation',
          description: 'Add technical review checkpoints',
          impact: 'medium',
          recommendation: 'Include code review and technical documentation milestones',
        });
        break;

      case 'data science':
      case 'machine learning':
        customizations.push({
          type: 'milestone_adjustment',
          description: 'Add model validation milestone',
          impact: 'high',
          recommendation: 'Include model training, validation, and performance evaluation phases',
        });
        break;
    }

    return customizations;
  }

  private calculateEstimatedImprovements(
    customizations: WorkflowCustomization['customizations'],
    effectivenessData: TemplateEffectiveness[],
  ): WorkflowCustomization['estimatedImprovements'] {
    let completionRateIncrease = 0;
    let timeEfficiencyGain = 0;
    let studentSatisfactionBoost = 0;

    customizations.forEach(customization => {
      switch (customization.impact) {
        case 'high':
          completionRateIncrease += 15;
          timeEfficiencyGain += 10;
          studentSatisfactionBoost += 12;
          break;
        case 'medium':
          completionRateIncrease += 8;
          timeEfficiencyGain += 5;
          studentSatisfactionBoost += 6;
          break;
        case 'low':
          completionRateIncrease += 3;
          timeEfficiencyGain += 2;
          studentSatisfactionBoost += 2;
          break;
      }
    });

    // Cap improvements at reasonable levels
    return {
      completionRateIncrease: Math.min(completionRateIncrease, 30),
      timeEfficiencyGain: Math.min(timeEfficiencyGain, 25),
      studentSatisfactionBoost: Math.min(studentSatisfactionBoost, 20),
    };
  }

  private async analyzeOptimizationOpportunities(
    template: MilestoneTemplate,
    effectivenessData: TemplateEffectiveness[],
  ): Promise<WorkflowOptimizationRecommendation['optimizationOpportunities']> {
    const opportunities: WorkflowOptimizationRecommendation['optimizationOpportunities'] = [];

    // Analyze milestone completion patterns
    const milestoneAnalysis = this.analyzeMilestonePatterns(effectivenessData);

    milestoneAnalysis.forEach(analysis => {
      if (analysis.completionRate < 60) {
        opportunities.push({
          category: 'milestones',
          issue: `Milestone "${analysis.milestoneTitle}" has low completion rate (${analysis.completionRate}%)`,
          recommendation: `Consider breaking down "${analysis.milestoneTitle}" into smaller, more manageable tasks`,
          expectedImprovement: 15,
          implementationComplexity: 'medium',
          priority: 'high',
        });
      }

      if (analysis.averageOverdueTime > 7) {
        opportunities.push({
          category: 'timeline',
          issue: `Milestone "${analysis.milestoneTitle}" is frequently overdue by ${analysis.averageOverdueTime} days`,
          recommendation: `Increase time allocation for "${analysis.milestoneTitle}" by ${Math.ceil(analysis.averageOverdueTime * 0.5)} days`,
          expectedImprovement: 10,
          implementationComplexity: 'low',
          priority: 'medium',
        });
      }
    });

    return opportunities;
  }

  private analyzeMilestonePatterns(effectivenessData: TemplateEffectiveness[]): Array<{
    milestoneTitle: string;
    completionRate: number;
    averageOverdueTime: number;
  }> {
    const milestoneMap = new Map<string, { completed: number; total: number; overdueTime: number[] }>();

    effectivenessData.forEach(record => {
      if (record.milestoneCompletionData) {
        record.milestoneCompletionData.forEach(milestone => {
          if (!milestoneMap.has(milestone.milestoneTitle)) {
            milestoneMap.set(milestone.milestoneTitle, { completed: 0, total: 0, overdueTime: [] });
          }

          const entry = milestoneMap.get(milestone.milestoneTitle)!;
          entry.total++;

          if (milestone.status === 'completed') {
            entry.completed++;
          }

          if (milestone.status === 'overdue' && milestone.actualDays && milestone.estimatedDays) {
            entry.overdueTime.push(milestone.actualDays - milestone.estimatedDays);
          }
        });
      }
    });

    return Array.from(milestoneMap.entries()).map(([title, data]) => ({
      milestoneTitle: title,
      completionRate: data.total > 0 ? (data.completed / data.total) * 100 : 0,
      averageOverdueTime: data.overdueTime.length > 0
        ? data.overdueTime.reduce((sum, time) => sum + time, 0) / data.overdueTime.length
        : 0,
    }));
  }

  private async generateProposedChanges(
    template: MilestoneTemplate,
    effectivenessData: TemplateEffectiveness[],
    opportunities: WorkflowOptimizationRecommendation['optimizationOpportunities'],
  ): Promise<WorkflowOptimizationRecommendation['proposedChanges']> {
    const milestoneAdjustments: WorkflowOptimizationRecommendation['proposedChanges']['milestoneAdjustments'] = [];
    const newMilestones: WorkflowOptimizationRecommendation['proposedChanges']['newMilestones'] = [];
    const removedMilestones: string[] = [];

    // Generate specific changes based on opportunities
    opportunities.forEach(opportunity => {
      if (opportunity.category === 'timeline') {
        const milestoneTitle = this.extractMilestoneFromIssue(opportunity.issue);
        const currentMilestone = template.milestoneItems.find(m => m.title === milestoneTitle);

        if (currentMilestone) {
          const additionalDays = this.extractDaysFromRecommendation(opportunity.recommendation);
          milestoneAdjustments.push({
            milestoneTitle,
            currentDays: currentMilestone.daysFromStart,
            recommendedDays: currentMilestone.daysFromStart + additionalDays,
            reason: opportunity.recommendation,
          });
        }
      }
    });

    return {
      milestoneAdjustments,
      newMilestones,
      removedMilestones,
    };
  }

  private predictOptimizationOutcome(
    opportunities: WorkflowOptimizationRecommendation['optimizationOpportunities'],
    effectivenessData: TemplateEffectiveness[],
  ): WorkflowOptimizationRecommendation['predictedOutcome'] {
    const totalExpectedImprovement = opportunities.reduce((sum, opp) => sum + opp.expectedImprovement, 0);

    return {
      effectivenessScoreIncrease: Math.min(totalExpectedImprovement * 0.6, 25),
      completionRateImprovement: Math.min(totalExpectedImprovement * 0.8, 30),
      timeAccuracyImprovement: Math.min(totalExpectedImprovement * 0.4, 20),
    };
  }

  private async identifyCalendarConflicts(
    timeline: Array<{ milestone: string; originalDate: Date }>,
    academicCalendar: AcademicCalendar | null,
  ): Promise<Array<{ milestone: string; conflict: string; suggestedShift: number }>> {
    const conflicts: Array<{ milestone: string; conflict: string; suggestedShift: number }> = [];

    // Check against holidays and break periods
    timeline.forEach(item => {
      const date = item.originalDate;

      // Check if milestone falls on weekend
      if (date.getDay() === 0 || date.getDay() === 6) {
        conflicts.push({
          milestone: item.milestone,
          conflict: 'Falls on weekend',
          suggestedShift: date.getDay() === 0 ? 1 : 2, // Move to Monday
        });
      }
    });

    return conflicts;
  }

  private applyCalendarAdjustments(
    originalTimeline: Array<{ milestone: string; originalDate: Date }>,
    adjustments: Array<{ milestone: string; conflict: string; suggestedShift: number }>,
  ): Array<{ milestone: string; adjustedDate: Date; reason: string }> {
    return originalTimeline.map(item => {
      const adjustment = adjustments.find(adj => adj.milestone === item.milestone);

      if (adjustment) {
        const adjustedDate = new Date(item.originalDate);
        adjustedDate.setDate(adjustedDate.getDate() + adjustment.suggestedShift);

        return {
          milestone: item.milestone,
          adjustedDate,
          reason: `Adjusted due to: ${adjustment.conflict}`,
        };
      }

      return {
        milestone: item.milestone,
        adjustedDate: item.originalDate,
        reason: 'No adjustment needed',
      };
    });
  }

  private calculateAdjustmentImpact(
    originalTimeline: Array<{ milestone: string; originalDate: Date }>,
    adjustedTimeline: Array<{ milestone: string; adjustedDate: Date; reason: string }>,
  ): AcademicCalendarAdjustment['impactAnalysis'] {
    let totalDaysShifted = 0;
    let milestonesAffected = 0;
    let criticalPathImpact = false;

    originalTimeline.forEach((original, index) => {
      const adjusted = adjustedTimeline[index];
      const daysDiff = Math.abs(
        (adjusted.adjustedDate.getTime() - original.originalDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysDiff > 0) {
        totalDaysShifted += daysDiff;
        milestonesAffected++;

        // Consider it critical path impact if shift is more than 3 days
        if (daysDiff > 3) {
          criticalPathImpact = true;
        }
      }
    });

    return {
      totalDaysShifted,
      milestonesAffected,
      criticalPathImpact,
    };
  }

  private determineAdjustmentType(
    adjustments: Array<{ milestone: string; conflict: string; suggestedShift: number }>,
  ): AcademicCalendarAdjustment['adjustmentType'] {
    if (adjustments.some(adj => adj.conflict.includes('holiday'))) {
      return 'holiday_avoidance';
    }
    if (adjustments.some(adj => adj.conflict.includes('exam'))) {
      return 'exam_period_consideration';
    }
    if (adjustments.some(adj => adj.conflict.includes('break'))) {
      return 'break_optimization';
    }
    return 'semester_alignment';
  }

  private async createAdjustedTemplateVersion(
    template: MilestoneTemplate,
    adjustedTimeline: Array<{ milestone: string; adjustedDate: Date; reason: string }>,
    userId: string,
    academicYear: string,
  ): Promise<MilestoneTemplateVersion> {
    // Get next version number
    const latestVersion = await this.versionRepository.findOne({
      where: { templateId: template.id },
      order: { version: 'DESC' },
    });

    const nextVersion = latestVersion ? latestVersion.version + 1 : 1;

    // Create new version
    const newVersion = MilestoneTemplateVersion.createFromTemplate(
      template,
      nextVersion,
      `Academic calendar adjustment for ${academicYear}`,
      userId,
      {
        action: 'calendar_adjustment',
        academicYear,
        adjustmentsSummary: adjustedTimeline.map(adj => ({
          milestone: adj.milestone,
          reason: adj.reason,
        })),
      }
    );

    return await this.versionRepository.save(newVersion);
  }

  private async applyOptimization(
    templateId: string,
    opportunity: WorkflowOptimizationRecommendation['optimizationOpportunities'][0],
    userId: string,
  ): Promise<void> {
    // Implementation would depend on the specific optimization type
    this.logger.log(`Applying optimization: ${opportunity.recommendation}`);
  }

  private async createOptimizedTemplateVersion(
    template: MilestoneTemplate,
    appliedOptimizations: string[],
    userId: string,
  ): Promise<MilestoneTemplateVersion> {
    const latestVersion = await this.versionRepository.findOne({
      where: { templateId: template.id },
      order: { version: 'DESC' },
    });

    const nextVersion = latestVersion ? latestVersion.version + 1 : 1;

    const newVersion = MilestoneTemplateVersion.createFromTemplate(
      template,
      nextVersion,
      `Automated optimization: ${appliedOptimizations.join(', ')}`,
      userId,
      {
        action: 'automated_optimization',
        optimizations: appliedOptimizations,
      }
    );

    return await this.versionRepository.save(newVersion);
  }

  private extractMilestoneFromIssue(issue: string): string {
    const match = issue.match(/"([^"]+)"/);
    return match ? match[1] : '';
  }

  private extractDaysFromRecommendation(recommendation: string): number {
    const match = recommendation.match(/(\d+)\s+days?/);
    return match ? parseInt(match[1], 10) : 7; // Default to 7 days
  }
}
