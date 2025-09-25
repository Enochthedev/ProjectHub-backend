import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThan, MoreThan } from 'typeorm';
import { Milestone } from '../entities/milestone.entity';
import { Project } from '../entities/project.entity';
import { User } from '../entities/user.entity';
import { MilestoneStatus, Priority } from '../common/enums';
import {
  ProjectContextIntegrationService,
  MilestoneAwareGuidance,
} from './project-context-integration.service';

export interface MilestoneDeadlineAwareness {
  milestoneId: string;
  title: string;
  dueDate: Date;
  daysUntilDue: number;
  urgencyLevel: 'critical' | 'urgent' | 'moderate' | 'low';
  deadlineGuidance: string[];
  timeManagementTips: string[];
  escalationRecommendations: string[];
}

export interface PriorityGuidance {
  milestoneId: string;
  title: string;
  currentPriority: Priority;
  suggestedPriority: Priority;
  priorityReason: string;
  actionItems: string[];
  timeAllocation: {
    dailyHours: number;
    weeklyHours: number;
    totalEstimatedHours: number;
  };
  dependencies: string[];
}

export interface ProactiveSuggestion {
  type:
    | 'preparation'
    | 'optimization'
    | 'risk_mitigation'
    | 'resource_planning';
  title: string;
  description: string;
  targetMilestone: string;
  timeframe: 'immediate' | 'this_week' | 'next_week' | 'this_month';
  priority: 'high' | 'medium' | 'low';
  actionSteps: string[];
  resources: string[];
  estimatedTimeRequired: number; // in hours
}

export interface TimelineAnalysis {
  projectId: string;
  studentId: string;
  overallStatus:
    | 'on_track'
    | 'at_risk'
    | 'behind_schedule'
    | 'ahead_of_schedule';
  criticalPath: {
    milestoneId: string;
    title: string;
    impact: 'high' | 'medium' | 'low';
    bufferDays: number;
  }[];
  bottlenecks: {
    milestoneId: string;
    title: string;
    bottleneckType: 'resource' | 'dependency' | 'complexity' | 'external';
    suggestedSolutions: string[];
  }[];
  recommendations: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };
  riskFactors: {
    factor: string;
    severity: 'high' | 'medium' | 'low';
    mitigation: string[];
  }[];
}

@Injectable()
export class MilestoneGuidanceService {
  private readonly logger = new Logger(MilestoneGuidanceService.name);

  // Urgency thresholds in days
  private readonly URGENCY_THRESHOLDS = {
    CRITICAL: 2, // 2 days or less
    URGENT: 7, // 1 week or less
    MODERATE: 14, // 2 weeks or less
    LOW: 30, // 1 month or less
  };

  // Priority adjustment factors
  private readonly PRIORITY_FACTORS = {
    OVERDUE_MULTIPLIER: 2.0,
    BLOCKING_MULTIPLIER: 1.5,
    CRITICAL_PATH_MULTIPLIER: 1.3,
    DEPENDENCY_MULTIPLIER: 1.2,
  };

  constructor(
    @InjectRepository(Milestone)
    private readonly milestoneRepository: Repository<Milestone>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly projectContextService: ProjectContextIntegrationService,
  ) {}

  /**
   * Generate milestone deadline awareness with specific guidance
   */
  async generateMilestoneDeadlineAwareness(
    studentId: string,
  ): Promise<MilestoneDeadlineAwareness[]> {
    this.logger.log(
      `Generating milestone deadline awareness for student ${studentId}`,
    );

    const upcomingMilestones = await this.milestoneRepository.find({
      where: {
        studentId,
        status: MilestoneStatus.NOT_STARTED || MilestoneStatus.IN_PROGRESS,
        dueDate: MoreThan(new Date()),
      },
      order: { dueDate: 'ASC' },
      take: 10, // Focus on next 10 milestones
    });

    const deadlineAwareness: MilestoneDeadlineAwareness[] = [];

    for (const milestone of upcomingMilestones) {
      const daysUntilDue = milestone.getDaysUntilDue();
      const urgencyLevel = this.determineUrgencyLevel(daysUntilDue);

      const awareness: MilestoneDeadlineAwareness = {
        milestoneId: milestone.id,
        title: milestone.title,
        dueDate: milestone.dueDate,
        daysUntilDue,
        urgencyLevel,
        deadlineGuidance: this.generateDeadlineGuidance(
          milestone,
          urgencyLevel,
        ),
        timeManagementTips: this.generateTimeManagementTips(
          milestone,
          daysUntilDue,
        ),
        escalationRecommendations: this.generateEscalationRecommendations(
          milestone,
          urgencyLevel,
        ),
      };

      deadlineAwareness.push(awareness);
    }

    return deadlineAwareness;
  }

  /**
   * Generate priority guidance for overdue and urgent milestones
   */
  async generatePriorityGuidance(
    studentId: string,
  ): Promise<PriorityGuidance[]> {
    this.logger.log(`Generating priority guidance for student ${studentId}`);

    // Get overdue and urgent milestones
    const criticalMilestones = await this.milestoneRepository.find({
      where: [
        {
          studentId,
          status: MilestoneStatus.NOT_STARTED || MilestoneStatus.IN_PROGRESS,
          dueDate: LessThan(new Date()), // Overdue
        },
        {
          studentId,
          status: MilestoneStatus.NOT_STARTED || MilestoneStatus.IN_PROGRESS,
          dueDate: Between(
            new Date(),
            new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          ), // Due within 7 days
        },
      ],
      relations: ['project'],
    });

    const priorityGuidance: PriorityGuidance[] = [];

    for (const milestone of criticalMilestones) {
      const suggestedPriority = this.calculateSuggestedPriority(milestone);
      const timeAllocation = this.calculateTimeAllocation(milestone);
      const dependencies = await this.identifyMilestoneDependencies(milestone);

      const guidance: PriorityGuidance = {
        milestoneId: milestone.id,
        title: milestone.title,
        currentPriority: milestone.priority,
        suggestedPriority,
        priorityReason: this.generatePriorityReason(
          milestone,
          suggestedPriority,
        ),
        actionItems: this.generatePriorityActionItems(milestone),
        timeAllocation,
        dependencies,
      };

      priorityGuidance.push(guidance);
    }

    return priorityGuidance.sort((a, b) => {
      // Sort by suggested priority (HIGH first) then by due date
      const priorityOrder = {
        [Priority.HIGH]: 3,
        [Priority.MEDIUM]: 2,
        [Priority.LOW]: 1,
      };
      return (
        priorityOrder[b.suggestedPriority] - priorityOrder[a.suggestedPriority]
      );
    });
  }

  /**
   * Generate proactive suggestions based on project timeline
   */
  async generateProactiveSuggestions(
    studentId: string,
  ): Promise<ProactiveSuggestion[]> {
    this.logger.log(
      `Generating proactive suggestions for student ${studentId}`,
    );

    const milestones = await this.milestoneRepository.find({
      where: { studentId },
      relations: ['project'],
      order: { dueDate: 'ASC' },
    });

    const suggestions: ProactiveSuggestion[] = [];

    // Analyze upcoming milestones for preparation opportunities
    const upcomingMilestones = milestones.filter(
      (m) =>
        m.status !== MilestoneStatus.COMPLETED &&
        m.status !== MilestoneStatus.CANCELLED &&
        m.getDaysUntilDue() > 0,
    );

    for (const milestone of upcomingMilestones) {
      const daysUntilDue = milestone.getDaysUntilDue();

      // Preparation suggestions
      if (daysUntilDue > 7 && daysUntilDue <= 21) {
        suggestions.push(...this.generatePreparationSuggestions(milestone));
      }

      // Optimization suggestions
      if (milestone.status === MilestoneStatus.IN_PROGRESS) {
        suggestions.push(...this.generateOptimizationSuggestions(milestone));
      }

      // Risk mitigation suggestions
      if (this.identifyRiskFactors(milestone).length > 0) {
        suggestions.push(...this.generateRiskMitigationSuggestions(milestone));
      }
    }

    // Resource planning suggestions
    suggestions.push(...this.generateResourcePlanningSuggestions(milestones));

    return suggestions
      .sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        const timeframeOrder = {
          immediate: 4,
          this_week: 3,
          next_week: 2,
          this_month: 1,
        };

        return (
          priorityOrder[b.priority] - priorityOrder[a.priority] ||
          timeframeOrder[b.timeframe] - timeframeOrder[a.timeframe]
        );
      })
      .slice(0, 10); // Limit to top 10 suggestions
  }

  /**
   * Analyze project timeline and identify critical issues
   */
  async analyzeProjectTimeline(
    studentId: string,
    projectId?: string,
  ): Promise<TimelineAnalysis> {
    this.logger.log(`Analyzing project timeline for student ${studentId}`);

    const whereCondition = projectId ? { studentId, projectId } : { studentId };

    const milestones = await this.milestoneRepository.find({
      where: whereCondition,
      relations: ['project'],
      order: { dueDate: 'ASC' },
    });

    if (milestones.length === 0) {
      return this.createEmptyTimelineAnalysis(studentId, projectId);
    }

    const overallStatus = this.determineOverallStatus(milestones);
    const criticalPath = this.identifyCriticalPath(milestones);
    const bottlenecks = this.identifyBottlenecks(milestones);
    const recommendations = this.generateTimelineRecommendations(
      milestones,
      overallStatus,
    );
    const riskFactors = this.analyzeRiskFactors(milestones);

    return {
      projectId: projectId || milestones[0]?.projectId || '',
      studentId,
      overallStatus,
      criticalPath,
      bottlenecks,
      recommendations,
      riskFactors,
    };
  }

  /**
   * Get milestone-specific guidance for AI responses
   */
  async getMilestoneSpecificGuidance(
    milestoneId: string,
    context: 'deadline' | 'priority' | 'progress' | 'blocking',
  ): Promise<string[]> {
    const milestone = await this.milestoneRepository.findOne({
      where: { id: milestoneId },
      relations: ['project', 'student'],
    });

    if (!milestone) {
      return ['Milestone not found. Please check the milestone ID.'];
    }

    switch (context) {
      case 'deadline':
        return this.generateDeadlineSpecificGuidance(milestone);
      case 'priority':
        return this.generatePrioritySpecificGuidance(milestone);
      case 'progress':
        return this.generateProgressSpecificGuidance(milestone);
      case 'blocking':
        return this.generateBlockingSpecificGuidance(milestone);
      default:
        return this.generateGeneralMilestoneGuidance(milestone);
    }
  }

  // Private helper methods

  private determineUrgencyLevel(
    daysUntilDue: number,
  ): 'critical' | 'urgent' | 'moderate' | 'low' {
    if (daysUntilDue <= this.URGENCY_THRESHOLDS.CRITICAL) return 'critical';
    if (daysUntilDue <= this.URGENCY_THRESHOLDS.URGENT) return 'urgent';
    if (daysUntilDue <= this.URGENCY_THRESHOLDS.MODERATE) return 'moderate';
    return 'low';
  }

  private generateDeadlineGuidance(
    milestone: Milestone,
    urgencyLevel: string,
  ): string[] {
    const guidance: string[] = [];

    switch (urgencyLevel) {
      case 'critical':
        guidance.push('🚨 CRITICAL: This milestone is due in 2 days or less!');
        guidance.push(
          'Drop all non-essential activities and focus exclusively on this milestone',
        );
        guidance.push(
          'Consider working extended hours or seeking immediate help',
        );
        guidance.push(
          'Notify your supervisor immediately about the tight deadline',
        );
        break;
      case 'urgent':
        guidance.push('⚠️ URGENT: This milestone is due within a week');
        guidance.push(
          'Prioritize this milestone over other non-critical tasks',
        );
        guidance.push('Break down remaining work into daily goals');
        guidance.push(
          'Identify potential blockers and address them proactively',
        );
        break;
      case 'moderate':
        guidance.push(
          '📅 MODERATE: You have 1-2 weeks to complete this milestone',
        );
        guidance.push('Start planning your approach and gathering resources');
        guidance.push('Allocate specific time blocks in your schedule');
        guidance.push('Consider any dependencies or prerequisites');
        break;
      case 'low':
        guidance.push(
          '📋 LOW URGENCY: You have sufficient time for this milestone',
        );
        guidance.push('Use this time to plan thoroughly and gather resources');
        guidance.push('Consider starting early to avoid last-minute pressure');
        guidance.push('Review similar work or examples for inspiration');
        break;
    }

    return guidance;
  }

  private generateTimeManagementTips(
    milestone: Milestone,
    daysUntilDue: number,
  ): string[] {
    const tips: string[] = [];
    const estimatedHours = milestone.estimatedHours || 20; // Default estimate

    if (daysUntilDue <= 2) {
      tips.push(`Work in focused 2-hour blocks with 15-minute breaks`);
      tips.push(
        `Aim for ${Math.ceil(estimatedHours / daysUntilDue)} hours per day`,
      );
      tips.push('Eliminate all distractions and non-essential activities');
    } else if (daysUntilDue <= 7) {
      const dailyHours = Math.ceil(estimatedHours / daysUntilDue);
      tips.push(`Allocate ${dailyHours} hours daily to this milestone`);
      tips.push('Use the Pomodoro technique (25-minute focused sessions)');
      tips.push('Schedule work during your most productive hours');
    } else {
      const weeklyHours = Math.ceil(
        estimatedHours / Math.ceil(daysUntilDue / 7),
      );
      tips.push(`Plan for ${weeklyHours} hours per week on this milestone`);
      tips.push('Spread work across multiple days to avoid burnout');
      tips.push('Set weekly progress checkpoints');
    }

    return tips;
  }

  private generateEscalationRecommendations(
    milestone: Milestone,
    urgencyLevel: string,
  ): string[] {
    const recommendations: string[] = [];

    if (urgencyLevel === 'critical' || urgencyLevel === 'urgent') {
      recommendations.push(
        'Contact your supervisor immediately to discuss the situation',
      );
      recommendations.push('Consider requesting an extension if justified');
      recommendations.push('Seek help from classmates or teaching assistants');

      if (milestone.isOverdue()) {
        recommendations.push(
          'Prepare an explanation of delays and a recovery plan',
        );
        recommendations.push(
          'Consider adjusting the milestone scope if approved by supervisor',
        );
      }
    } else if (urgencyLevel === 'moderate') {
      recommendations.push(
        'Schedule a check-in with your supervisor within the next few days',
      );
      recommendations.push(
        'Identify potential risks and discuss mitigation strategies',
      );
    }

    return recommendations;
  }

  private calculateSuggestedPriority(milestone: Milestone): Priority {
    let priorityScore = 1; // Base score

    // Increase priority for overdue milestones
    if (milestone.isOverdue()) {
      priorityScore *= this.PRIORITY_FACTORS.OVERDUE_MULTIPLIER;
    }

    // Increase priority for blocked milestones
    if (milestone.status === MilestoneStatus.BLOCKED) {
      priorityScore *= this.PRIORITY_FACTORS.BLOCKING_MULTIPLIER;
    }

    // Increase priority based on urgency
    const daysUntilDue = milestone.getDaysUntilDue();
    if (daysUntilDue <= 2) {
      priorityScore *= 2.0;
    } else if (daysUntilDue <= 7) {
      priorityScore *= 1.5;
    }

    // Determine priority based on score
    if (priorityScore >= 3.0) return Priority.HIGH;
    if (priorityScore >= 1.5) return Priority.MEDIUM;
    return Priority.LOW;
  }

  private generatePriorityReason(
    milestone: Milestone,
    suggestedPriority: Priority,
  ): string {
    const reasons: string[] = [];

    if (milestone.isOverdue()) {
      reasons.push('milestone is overdue');
    }

    if (milestone.status === MilestoneStatus.BLOCKED) {
      reasons.push('milestone is currently blocked');
    }

    const daysUntilDue = milestone.getDaysUntilDue();
    if (daysUntilDue <= 2) {
      reasons.push('due date is critical (≤2 days)');
    } else if (daysUntilDue <= 7) {
      reasons.push('due date is urgent (≤7 days)');
    }

    if (milestone.priority !== suggestedPriority) {
      reasons.push(
        `current priority (${milestone.priority}) may not reflect actual urgency`,
      );
    }

    return reasons.length > 0
      ? `Priority should be ${suggestedPriority} because ${reasons.join(', ')}`
      : `Priority ${suggestedPriority} is appropriate for current timeline`;
  }

  private generatePriorityActionItems(milestone: Milestone): string[] {
    const actionItems: string[] = [];

    if (milestone.isOverdue()) {
      actionItems.push('Immediately assess what work remains to be completed');
      actionItems.push('Create a detailed catch-up plan with daily goals');
      actionItems.push('Communicate with supervisor about the delay');
    }

    if (milestone.status === MilestoneStatus.BLOCKED) {
      actionItems.push('Identify the specific blocker and research solutions');
      actionItems.push('Reach out for help to resolve the blocking issue');
      actionItems.push(
        'Consider alternative approaches if the blocker persists',
      );
    }

    if (milestone.getDaysUntilDue() <= 7) {
      actionItems.push('Clear your schedule to focus on this milestone');
      actionItems.push(
        'Break down remaining work into small, manageable tasks',
      );
      actionItems.push('Set up daily progress check-ins');
    }

    return actionItems;
  }

  private calculateTimeAllocation(milestone: Milestone): {
    dailyHours: number;
    weeklyHours: number;
    totalEstimatedHours: number;
  } {
    const totalHours = milestone.estimatedHours || 20;
    const daysUntilDue = Math.max(milestone.getDaysUntilDue(), 1);
    const weeksUntilDue = Math.max(Math.ceil(daysUntilDue / 7), 1);

    let dailyHours: number;
    let weeklyHours: number;

    if (daysUntilDue <= 7) {
      // For urgent milestones, calculate daily hours
      dailyHours = Math.ceil(totalHours / daysUntilDue);
      weeklyHours = totalHours;
    } else {
      // For longer-term milestones, calculate weekly hours
      weeklyHours = Math.ceil(totalHours / weeksUntilDue);
      dailyHours = Math.ceil(weeklyHours / 5); // Assuming 5 working days per week
    }

    return {
      dailyHours: Math.min(dailyHours, 8), // Cap at 8 hours per day
      weeklyHours: Math.min(weeklyHours, 40), // Cap at 40 hours per week
      totalEstimatedHours: totalHours,
    };
  }

  private async identifyMilestoneDependencies(
    milestone: Milestone,
  ): Promise<string[]> {
    // This is a simplified implementation
    // In a full system, you might have explicit dependency relationships
    const dependencies: string[] = [];

    // Look for milestones with similar keywords that should come before this one
    const whereCondition: any = {
      studentId: milestone.studentId,
      dueDate: LessThan(milestone.dueDate),
    };

    if (milestone.projectId) {
      whereCondition.projectId = milestone.projectId;
    }

    const relatedMilestones = await this.milestoneRepository.find({
      where: whereCondition,
      order: { dueDate: 'DESC' },
    });

    // Simple heuristic: milestones with certain keywords are likely dependencies
    const dependencyKeywords = {
      implementation: ['design', 'planning', 'research'],
      testing: ['implementation', 'development'],
      documentation: ['testing', 'implementation'],
      deployment: ['testing', 'documentation'],
    };

    const milestoneTitle = milestone.title.toLowerCase();
    for (const [phase, prereqs] of Object.entries(dependencyKeywords)) {
      if (milestoneTitle.includes(phase)) {
        for (const related of relatedMilestones) {
          const relatedTitle = related.title.toLowerCase();
          if (prereqs.some((prereq) => relatedTitle.includes(prereq))) {
            dependencies.push(related.title);
          }
        }
        break;
      }
    }

    return dependencies.slice(0, 3); // Limit to top 3 dependencies
  }

  private generatePreparationSuggestions(
    milestone: Milestone,
  ): ProactiveSuggestion[] {
    const suggestions: ProactiveSuggestion[] = [];
    const title = milestone.title.toLowerCase();

    if (title.includes('literature') || title.includes('research')) {
      suggestions.push({
        type: 'preparation',
        title: 'Set up research infrastructure',
        description:
          'Prepare your research tools and databases before starting literature review',
        targetMilestone: milestone.id,
        timeframe: 'this_week',
        priority: 'medium',
        actionSteps: [
          'Set up reference management software (Zotero, Mendeley)',
          'Identify key academic databases for your field',
          'Create search term lists and keywords',
          'Set up note-taking system for papers',
        ],
        resources: [
          'Zotero tutorial',
          'Academic database access',
          'Note-taking templates',
        ],
        estimatedTimeRequired: 4,
      });
    }

    if (title.includes('implementation') || title.includes('development')) {
      suggestions.push({
        type: 'preparation',
        title: 'Set up development environment',
        description:
          'Prepare your coding environment and tools before implementation',
        targetMilestone: milestone.id,
        timeframe: 'this_week',
        priority: 'high',
        actionSteps: [
          'Install required development tools and IDEs',
          'Set up version control repository',
          'Create project structure and boilerplate code',
          'Set up testing framework and CI/CD pipeline',
        ],
        resources: [
          'Development tools',
          'Git repository',
          'Testing frameworks',
        ],
        estimatedTimeRequired: 6,
      });
    }

    return suggestions;
  }

  private generateOptimizationSuggestions(
    milestone: Milestone,
  ): ProactiveSuggestion[] {
    const suggestions: ProactiveSuggestion[] = [];

    suggestions.push({
      type: 'optimization',
      title: 'Optimize current workflow',
      description: 'Improve efficiency of your current milestone work',
      targetMilestone: milestone.id,
      timeframe: 'immediate',
      priority: 'medium',
      actionSteps: [
        'Review current progress and identify bottlenecks',
        'Eliminate time-wasting activities',
        'Use productivity techniques like Pomodoro',
        'Set up better workspace organization',
      ],
      resources: ['Productivity apps', 'Time tracking tools'],
      estimatedTimeRequired: 2,
    });

    return suggestions;
  }

  private generateRiskMitigationSuggestions(
    milestone: Milestone,
  ): ProactiveSuggestion[] {
    const suggestions: ProactiveSuggestion[] = [];
    const riskFactors = this.identifyRiskFactors(milestone);

    if (riskFactors.includes('tight_deadline')) {
      suggestions.push({
        type: 'risk_mitigation',
        title: 'Mitigate deadline risk',
        description:
          'Address potential deadline issues before they become critical',
        targetMilestone: milestone.id,
        timeframe: 'immediate',
        priority: 'high',
        actionSteps: [
          'Break milestone into smaller daily tasks',
          'Identify potential shortcuts or scope reductions',
          'Arrange backup support from peers or supervisor',
          'Prepare contingency plan for deadline extension',
        ],
        resources: ['Task management tools', 'Supervisor contact'],
        estimatedTimeRequired: 3,
      });
    }

    return suggestions;
  }

  private generateResourcePlanningSuggestions(
    milestones: Milestone[],
  ): ProactiveSuggestion[] {
    const suggestions: ProactiveSuggestion[] = [];

    // Analyze upcoming resource needs
    const upcomingMilestones = milestones.filter(
      (m) =>
        m.status !== MilestoneStatus.COMPLETED &&
        m.getDaysUntilDue() > 0 &&
        m.getDaysUntilDue() <= 30,
    );

    if (upcomingMilestones.length > 3) {
      suggestions.push({
        type: 'resource_planning',
        title: 'Plan resource allocation',
        description:
          'Optimize resource allocation across multiple upcoming milestones',
        targetMilestone: upcomingMilestones[0].id,
        timeframe: 'this_week',
        priority: 'medium',
        actionSteps: [
          'Create a master timeline for all upcoming milestones',
          'Identify resource conflicts and overlaps',
          'Prioritize milestones based on dependencies and deadlines',
          'Schedule regular progress reviews',
        ],
        resources: ['Project management tools', 'Calendar applications'],
        estimatedTimeRequired: 4,
      });
    }

    return suggestions;
  }

  private identifyRiskFactors(milestone: Milestone): string[] {
    const risks: string[] = [];

    if (milestone.getDaysUntilDue() <= 7) {
      risks.push('tight_deadline');
    }

    if (milestone.status === MilestoneStatus.BLOCKED) {
      risks.push('blocking_issue');
    }

    if (milestone.estimatedHours > 40) {
      risks.push('high_complexity');
    }

    return risks;
  }

  private determineOverallStatus(
    milestones: Milestone[],
  ): 'on_track' | 'at_risk' | 'behind_schedule' | 'ahead_of_schedule' {
    const totalMilestones = milestones.length;
    const completedMilestones = milestones.filter(
      (m) => m.status === MilestoneStatus.COMPLETED,
    ).length;
    const overdueMilestones = milestones.filter((m) => m.isOverdue()).length;
    const blockedMilestones = milestones.filter(
      (m) => m.status === MilestoneStatus.BLOCKED,
    ).length;

    const completionRate = completedMilestones / totalMilestones;
    const overdueRate = overdueMilestones / totalMilestones;

    if (overdueRate > 0.2 || blockedMilestones > 2) {
      return 'behind_schedule';
    }

    if (completionRate > 0.8 && overdueRate === 0) {
      return 'ahead_of_schedule';
    }

    if (overdueRate > 0.1 || blockedMilestones > 0) {
      return 'at_risk';
    }

    return 'on_track';
  }

  private identifyCriticalPath(milestones: Milestone[]): {
    milestoneId: string;
    title: string;
    impact: 'high' | 'medium' | 'low';
    bufferDays: number;
  }[] {
    return milestones
      .filter(
        (m) =>
          m.status !== MilestoneStatus.COMPLETED &&
          m.status !== MilestoneStatus.CANCELLED,
      )
      .map((m) => ({
        milestoneId: m.id,
        title: m.title,
        impact: this.assessMilestoneImpact(m),
        bufferDays: Math.max(m.getDaysUntilDue(), 0),
      }))
      .sort((a, b) => a.bufferDays - b.bufferDays)
      .slice(0, 5);
  }

  private assessMilestoneImpact(
    milestone: Milestone,
  ): 'high' | 'medium' | 'low' {
    const title = milestone.title.toLowerCase();

    // High impact milestones
    if (
      title.includes('proposal') ||
      title.includes('defense') ||
      title.includes('final')
    ) {
      return 'high';
    }

    // Medium impact milestones
    if (
      title.includes('implementation') ||
      title.includes('testing') ||
      title.includes('documentation')
    ) {
      return 'medium';
    }

    return 'low';
  }

  private identifyBottlenecks(milestones: Milestone[]): {
    milestoneId: string;
    title: string;
    bottleneckType: 'resource' | 'dependency' | 'complexity' | 'external';
    suggestedSolutions: string[];
  }[] {
    const bottlenecks: {
      milestoneId: string;
      title: string;
      bottleneckType: 'resource' | 'dependency' | 'complexity' | 'external';
      suggestedSolutions: string[];
    }[] = [];

    for (const milestone of milestones) {
      if (milestone.status === MilestoneStatus.BLOCKED) {
        const bottleneckType = this.identifyBottleneckType(milestone);
        bottlenecks.push({
          milestoneId: milestone.id,
          title: milestone.title,
          bottleneckType,
          suggestedSolutions: this.generateBottleneckSolutions(bottleneckType),
        });
      }
    }

    return bottlenecks;
  }

  private identifyBottleneckType(
    milestone: Milestone,
  ): 'resource' | 'dependency' | 'complexity' | 'external' {
    const blockingReason = milestone.blockingReason?.toLowerCase() || '';

    if (
      blockingReason.includes('resource') ||
      blockingReason.includes('access')
    ) {
      return 'resource';
    }

    if (
      blockingReason.includes('dependency') ||
      blockingReason.includes('waiting')
    ) {
      return 'dependency';
    }

    if (
      blockingReason.includes('complex') ||
      blockingReason.includes('difficult')
    ) {
      return 'complexity';
    }

    return 'external';
  }

  private generateBottleneckSolutions(bottleneckType: string): string[] {
    const solutions = {
      resource: [
        'Identify alternative resources or tools',
        'Request additional access or permissions',
        'Consider using substitute resources temporarily',
      ],
      dependency: [
        'Follow up on pending dependencies',
        'Identify alternative approaches that bypass dependencies',
        'Work on parallel tasks while waiting',
      ],
      complexity: [
        'Break down complex tasks into smaller components',
        'Seek expert guidance or mentoring',
        'Research similar solutions or examples',
      ],
      external: [
        'Escalate to supervisor or administration',
        'Identify workarounds for external blockers',
        'Adjust timeline to accommodate external factors',
      ],
    };

    return solutions[bottleneckType] || solutions.external;
  }

  private generateTimelineRecommendations(
    milestones: Milestone[],
    overallStatus: string,
  ): {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  } {
    const recommendations = {
      immediate: [] as string[],
      shortTerm: [] as string[],
      longTerm: [] as string[],
    };

    switch (overallStatus) {
      case 'behind_schedule':
        recommendations.immediate.push(
          'Focus on completing overdue milestones immediately',
        );
        recommendations.immediate.push(
          'Consider requesting deadline extensions where appropriate',
        );
        recommendations.shortTerm.push(
          'Reassess project scope and consider reducing non-essential features',
        );
        recommendations.longTerm.push(
          'Implement better project planning and time management practices',
        );
        break;

      case 'at_risk':
        recommendations.immediate.push(
          'Address blocked milestones and identify solutions',
        );
        recommendations.shortTerm.push(
          'Increase communication frequency with supervisor',
        );
        recommendations.longTerm.push(
          'Build buffer time into future milestone planning',
        );
        break;

      case 'on_track':
        recommendations.shortTerm.push(
          'Maintain current pace and continue regular progress reviews',
        );
        recommendations.longTerm.push(
          'Look for opportunities to get ahead of schedule',
        );
        break;

      case 'ahead_of_schedule':
        recommendations.immediate.push(
          'Consider expanding scope or improving quality',
        );
        recommendations.shortTerm.push(
          'Use extra time to strengthen weaker areas of the project',
        );
        recommendations.longTerm.push('Share successful practices with peers');
        break;
    }

    return recommendations;
  }

  private analyzeRiskFactors(milestones: Milestone[]): {
    factor: string;
    severity: 'high' | 'medium' | 'low';
    mitigation: string[];
  }[] {
    const riskFactors: {
      factor: string;
      severity: 'high' | 'medium' | 'low';
      mitigation: string[];
    }[] = [];

    const overdueMilestones = milestones.filter((m) => m.isOverdue()).length;
    if (overdueMilestones > 0) {
      riskFactors.push({
        factor: `${overdueMilestones} overdue milestone(s)`,
        severity: overdueMilestones > 2 ? 'high' : 'medium',
        mitigation: [
          'Prioritize overdue milestones immediately',
          'Communicate with supervisor about delays',
          'Consider scope adjustments if necessary',
        ],
      });
    }

    const blockedMilestones = milestones.filter(
      (m) => m.status === MilestoneStatus.BLOCKED,
    ).length;
    if (blockedMilestones > 0) {
      riskFactors.push({
        factor: `${blockedMilestones} blocked milestone(s)`,
        severity: blockedMilestones > 1 ? 'high' : 'medium',
        mitigation: [
          'Identify root causes of blocking issues',
          'Seek help to resolve blockers',
          'Develop alternative approaches',
        ],
      });
    }

    return riskFactors;
  }

  private createEmptyTimelineAnalysis(
    studentId: string,
    projectId?: string,
  ): TimelineAnalysis {
    return {
      projectId: projectId || '',
      studentId,
      overallStatus: 'on_track',
      criticalPath: [],
      bottlenecks: [],
      recommendations: {
        immediate: ['Create your first milestone to start tracking progress'],
        shortTerm: ['Set up a project timeline with key milestones'],
        longTerm: ['Establish regular progress review schedule'],
      },
      riskFactors: [],
    };
  }

  private generateDeadlineSpecificGuidance(milestone: Milestone): string[] {
    const daysUntilDue = milestone.getDaysUntilDue();
    const urgencyLevel = this.determineUrgencyLevel(daysUntilDue);
    return this.generateDeadlineGuidance(milestone, urgencyLevel);
  }

  private generatePrioritySpecificGuidance(milestone: Milestone): string[] {
    const suggestedPriority = this.calculateSuggestedPriority(milestone);
    return [
      this.generatePriorityReason(milestone, suggestedPriority),
      ...this.generatePriorityActionItems(milestone),
    ];
  }

  private generateProgressSpecificGuidance(milestone: Milestone): string[] {
    const progress = milestone.getProgressPercentage();
    const guidance: string[] = [];

    if (progress === 0) {
      guidance.push("This milestone hasn't been started yet");
      guidance.push('Break it down into smaller, manageable tasks');
      guidance.push('Set a specific start date and time');
    } else if (progress < 50) {
      guidance.push(
        "You've made some progress but there's still significant work remaining",
      );
      guidance.push(
        "Review what's been completed and what still needs to be done",
      );
      guidance.push("Consider if you're on track to meet the deadline");
    } else if (progress < 100) {
      guidance.push("You're making good progress on this milestone");
      guidance.push('Focus on completing the remaining tasks');
      guidance.push('Prepare for final review and quality checks');
    } else {
      guidance.push('This milestone has been completed');
      guidance.push('Review the outcomes and lessons learned');
      guidance.push('Use insights to improve future milestone planning');
    }

    return guidance;
  }

  private generateBlockingSpecificGuidance(milestone: Milestone): string[] {
    if (milestone.status !== MilestoneStatus.BLOCKED) {
      return ['This milestone is not currently blocked'];
    }

    const guidance: string[] = [];
    const blockingReason =
      milestone.blockingReason || 'Unknown blocking reason';

    guidance.push(`Blocking reason: ${blockingReason}`);
    guidance.push('Identify the specific nature of the blocker');
    guidance.push('Research potential solutions or workarounds');
    guidance.push('Reach out for help from supervisor, peers, or experts');
    guidance.push('Consider alternative approaches if the blocker persists');
    guidance.push('Document the blocker and resolution for future reference');

    return guidance;
  }

  private generateGeneralMilestoneGuidance(milestone: Milestone): string[] {
    return [
      `Milestone: ${milestone.title}`,
      `Status: ${milestone.status}`,
      `Due date: ${milestone.dueDate.toDateString()}`,
      `Days until due: ${milestone.getDaysUntilDue()}`,
      `Progress: ${milestone.getProgressPercentage()}%`,
      'Focus on breaking down the work into manageable tasks',
      'Set regular check-ins to monitor progress',
      "Don't hesitate to seek help when needed",
    ];
  }
}
