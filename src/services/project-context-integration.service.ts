import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from '../entities/project.entity';
import { Milestone } from '../entities/milestone.entity';
import { User } from '../entities/user.entity';
import { Conversation } from '../entities/conversation.entity';
import { ConversationMessage } from '../entities/conversation-message.entity';
import {
  ContextService,
  ProjectContext,
  MilestoneContext,
} from './context.service';
import {
  MilestoneStatus,
  Priority,
  DifficultyLevel,
  ApprovalStatus,
} from '../common/enums';

export interface EnhancedProjectContext extends ProjectContext {
  currentPhase: string;
  phaseProgress: number;
  nextPhaseDeadline: string | null;
  projectStatus: ApprovalStatus;
  daysSinceStart: number;
  estimatedDaysRemaining: number;
  riskLevel: 'low' | 'medium' | 'high';
  recommendations: string[];
  milestonesSummary: {
    total: number;
    completed: number;
    overdue: number;
    upcoming: number;
  };
}

export interface MilestoneAwareGuidance {
  urgentMilestones: Array<{
    id: string;
    title: string;
    dueDate: string;
    daysUntilDue: number;
    priority: Priority;
    recommendations: string[];
  }>;
  overdueMilestones: Array<{
    id: string;
    title: string;
    dueDate: string;
    daysPastDue: number;
    priority: Priority;
    actionItems: string[];
  }>;
  blockedMilestones: Array<{
    id: string;
    title: string;
    blockingReason: string;
    suggestedSolutions: string[];
  }>;
  phaseSpecificGuidance: {
    currentPhase: string;
    phaseDescription: string;
    keyActivities: string[];
    commonChallenges: string[];
    successTips: string[];
    nextPhasePreparation: string[];
  };
  timelineAnalysis: {
    onTrack: boolean;
    riskLevel: 'low' | 'medium' | 'high';
    adjustmentRecommendations: string[];
    criticalPath: string[];
  };
}

export interface ProjectPhaseCustomization {
  phase: string;
  responseStyle: 'encouraging' | 'directive' | 'analytical' | 'supportive';
  focusAreas: string[];
  keyTerms: string[];
  templateResponses: Record<string, string>;
  commonQuestions: string[];
  resourceRecommendations: string[];
}

@Injectable()
export class ProjectContextIntegrationService {
  private readonly logger = new Logger(ProjectContextIntegrationService.name);

  // Phase definitions with typical duration in weeks
  private readonly PROJECT_PHASES = {
    planning: {
      duration: 2,
      description: 'Project planning and topic selection',
    },
    proposal: { duration: 4, description: 'Proposal writing and approval' },
    literature_review: {
      duration: 6,
      description: 'Literature review and research',
    },
    methodology: {
      duration: 4,
      description: 'Methodology design and planning',
    },
    implementation: {
      duration: 12,
      description: 'Development and implementation',
    },
    testing: { duration: 4, description: 'Testing and validation' },
    documentation: {
      duration: 6,
      description: 'Final documentation and thesis writing',
    },
    presentation: {
      duration: 2,
      description: 'Presentation preparation and defense',
    },
  };

  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(Milestone)
    private readonly milestoneRepository: Repository<Milestone>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
    @InjectRepository(ConversationMessage)
    private readonly messageRepository: Repository<ConversationMessage>,
    private readonly contextService: ContextService,
  ) {}

  /**
   * Get enhanced project context with milestone integration
   */
  async getEnhancedProjectContext(
    studentId: string,
    projectId?: string,
  ): Promise<EnhancedProjectContext | null> {
    this.logger.log(
      `Getting enhanced project context for student ${studentId}`,
    );

    // Get basic project context
    const basicContext = await this.contextService.getProjectContext(
      studentId,
      projectId,
    );
    if (!basicContext) {
      return null;
    }

    // Get project entity for additional details
    const project = await this.projectRepository.findOne({
      where: { id: basicContext.id },
      relations: ['supervisor', 'supervisor.supervisorProfile'],
    });

    if (!project) {
      return null;
    }

    // Get milestone context
    const milestoneContext =
      await this.contextService.getMilestoneContext(studentId);

    // Calculate enhanced metrics
    const daysSinceStart = Math.floor(
      (new Date().getTime() - new Date(project.createdAt).getTime()) /
        (1000 * 60 * 60 * 24),
    );

    const currentPhase = this.determineDetailedProjectPhase(
      milestoneContext,
      project,
      daysSinceStart,
    );
    const phaseProgress = this.calculatePhaseProgress(
      currentPhase,
      milestoneContext,
      daysSinceStart,
    );
    const nextPhaseDeadline = this.calculateNextPhaseDeadline(
      currentPhase,
      project.createdAt,
    );
    const estimatedDaysRemaining = this.estimateRemainingDays(
      currentPhase,
      phaseProgress,
    );
    const riskLevel = this.assessProjectRisk(
      milestoneContext,
      daysSinceStart,
      currentPhase,
    );
    const recommendations = await this.generateProjectRecommendations(
      project,
      milestoneContext,
      currentPhase,
      riskLevel,
    );

    const milestonesSummary = {
      total:
        milestoneContext.upcoming.length +
        milestoneContext.overdue.length +
        milestoneContext.recentlyCompleted.length +
        milestoneContext.blocked.length,
      completed: milestoneContext.recentlyCompleted.length,
      overdue: milestoneContext.overdue.length,
      upcoming: milestoneContext.upcoming.length,
    };

    return {
      ...basicContext,
      currentPhase,
      phaseProgress,
      nextPhaseDeadline,
      projectStatus: project.approvalStatus,
      daysSinceStart,
      estimatedDaysRemaining,
      riskLevel,
      recommendations,
      milestonesSummary,
    };
  }

  /**
   * Generate milestone-aware guidance for AI responses
   */
  async generateMilestoneAwareGuidance(
    studentId: string,
  ): Promise<MilestoneAwareGuidance> {
    this.logger.log(
      `Generating milestone-aware guidance for student ${studentId}`,
    );

    const milestoneContext =
      await this.contextService.getMilestoneContext(studentId);
    const projectContext = await this.getEnhancedProjectContext(studentId);

    // Process urgent milestones (due within 7 days)
    const urgentMilestones = milestoneContext.upcoming
      .filter((m) => m.daysUntilDue <= 7 && m.daysUntilDue >= 0)
      .map((m) => ({
        id: m.id,
        title: m.title,
        dueDate: m.dueDate,
        daysUntilDue: m.daysUntilDue,
        priority: Priority.HIGH, // Assume urgent milestones are high priority
        recommendations: this.generateMilestoneRecommendations(m, 'urgent'),
      }));

    // Process overdue milestones
    const overdueMilestones = milestoneContext.overdue.map((m) => ({
      id: m.id,
      title: m.title,
      dueDate: m.dueDate,
      daysPastDue: m.daysPastDue,
      priority: Priority.HIGH,
      actionItems: this.generateOverdueActionItems(m),
    }));

    // Process blocked milestones
    const blockedMilestones = milestoneContext.blocked.map((m) => ({
      id: m.id,
      title: m.title,
      blockingReason: m.blockingReason,
      suggestedSolutions: this.generateBlockedMilestoneSolutions(m),
    }));

    // Generate phase-specific guidance
    const phaseSpecificGuidance = this.generatePhaseSpecificGuidance(
      projectContext?.currentPhase || milestoneContext.currentPhase,
    );

    // Analyze timeline
    const timelineAnalysis = this.analyzeProjectTimeline(
      milestoneContext,
      projectContext,
    );

    return {
      urgentMilestones,
      overdueMilestones,
      blockedMilestones,
      phaseSpecificGuidance,
      timelineAnalysis,
    };
  }

  /**
   * Get project phase-specific response customization
   */
  getProjectPhaseCustomization(
    phase: string,
    specialization: string,
  ): ProjectPhaseCustomization {
    const baseCustomization = this.getBasePhaseCustomization(phase);
    const specializationCustomization = this.getSpecializationCustomization(
      specialization,
      phase,
    );

    return {
      ...baseCustomization,
      focusAreas: [
        ...baseCustomization.focusAreas,
        ...specializationCustomization.focusAreas,
      ],
      keyTerms: [
        ...baseCustomization.keyTerms,
        ...specializationCustomization.keyTerms,
      ],
      templateResponses: {
        ...baseCustomization.templateResponses,
        ...specializationCustomization.templateResponses,
      },
      resourceRecommendations: [
        ...baseCustomization.resourceRecommendations,
        ...specializationCustomization.resourceRecommendations,
      ],
    };
  }

  /**
   * Integrate project context into conversation context
   */
  async integrateProjectContextIntoConversation(
    conversationId: string,
    studentId: string,
  ): Promise<void> {
    this.logger.log(
      `Integrating project context into conversation ${conversationId}`,
    );

    const enhancedContext = await this.getEnhancedProjectContext(studentId);
    const milestoneGuidance =
      await this.generateMilestoneAwareGuidance(studentId);

    if (!enhancedContext) {
      this.logger.warn(`No project context found for student ${studentId}`);
      return;
    }

    // Update conversation context with project information
    const conversationContext = {
      projectId: enhancedContext.id,
      projectPhase: enhancedContext.currentPhase,
      specialization: enhancedContext.specialization,
      projectStatus: enhancedContext.projectStatus,
      riskLevel: enhancedContext.riskLevel,
      phaseProgress: enhancedContext.phaseProgress,
      urgentMilestones: milestoneGuidance.urgentMilestones.length,
      overdueMilestones: milestoneGuidance.overdueMilestones.length,
      blockedMilestones: milestoneGuidance.blockedMilestones.length,
      recommendations: enhancedContext.recommendations,
      lastActivity: new Date(),
    };

    await this.contextService.updateConversationContext(
      conversationId,
      conversationContext,
    );
  }

  /**
   * Generate contextual response enhancements based on project status
   */
  generateContextualResponseEnhancements(
    projectContext: EnhancedProjectContext,
    milestoneGuidance: MilestoneAwareGuidance,
    userQuery: string,
  ): {
    priorityAlerts: string[];
    contextualSuggestions: string[];
    phaseSpecificTips: string[];
    timelineConcerns: string[];
  } {
    const priorityAlerts: string[] = [];
    const contextualSuggestions: string[] = [];
    const phaseSpecificTips: string[] = [];
    const timelineConcerns: string[] = [];

    // Priority alerts for urgent situations
    if (milestoneGuidance.overdueMilestones.length > 0) {
      priorityAlerts.push(
        `⚠️ You have ${milestoneGuidance.overdueMilestones.length} overdue milestone(s). Consider addressing these immediately.`,
      );
    }

    if (milestoneGuidance.urgentMilestones.length > 0) {
      priorityAlerts.push(
        `📅 You have ${milestoneGuidance.urgentMilestones.length} milestone(s) due within the next week.`,
      );
    }

    if (projectContext.riskLevel === 'high') {
      priorityAlerts.push(
        `🚨 Your project timeline shows high risk. Consider reviewing your schedule with your supervisor.`,
      );
    }

    // Contextual suggestions based on query and project state
    if (
      this.isQueryRelatedToCurrentPhase(userQuery, projectContext.currentPhase)
    ) {
      contextualSuggestions.push(
        `Since you're in the ${projectContext.currentPhase} phase, here are some specific considerations...`,
      );
    }

    if (milestoneGuidance.blockedMilestones.length > 0) {
      contextualSuggestions.push(
        `I notice you have blocked milestones. Would you like help addressing these blockers?`,
      );
    }

    // Phase-specific tips
    const phaseGuidance = milestoneGuidance.phaseSpecificGuidance;
    phaseSpecificTips.push(...phaseGuidance.successTips.slice(0, 2));

    // Timeline concerns
    if (!milestoneGuidance.timelineAnalysis.onTrack) {
      timelineConcerns.push(
        `Your project timeline may need adjustment. Consider: ${milestoneGuidance.timelineAnalysis.adjustmentRecommendations.join(', ')}`,
      );
    }

    return {
      priorityAlerts,
      contextualSuggestions,
      phaseSpecificTips,
      timelineConcerns,
    };
  }

  // Private helper methods

  private determineDetailedProjectPhase(
    milestoneContext: MilestoneContext,
    project: Project,
    daysSinceStart: number,
  ): string {
    // First, try to determine phase from milestone titles and status
    const milestonePhases = this.analyzeMilestonePhases(milestoneContext);

    if (milestonePhases.currentPhase) {
      return milestonePhases.currentPhase;
    }

    // Fallback to time-based estimation
    const totalProjectWeeks = 40; // Typical FYP duration
    const weeksElapsed = Math.floor(daysSinceStart / 7);
    const progressRatio = weeksElapsed / totalProjectWeeks;

    if (progressRatio < 0.1) return 'planning';
    if (progressRatio < 0.2) return 'proposal';
    if (progressRatio < 0.35) return 'literature_review';
    if (progressRatio < 0.45) return 'methodology';
    if (progressRatio < 0.75) return 'implementation';
    if (progressRatio < 0.85) return 'testing';
    if (progressRatio < 0.95) return 'documentation';
    return 'presentation';
  }

  private analyzeMilestonePhases(milestoneContext: MilestoneContext): {
    currentPhase: string | null;
  } {
    const phaseKeywords = {
      planning: ['plan', 'planning', 'setup', 'initialization'],
      proposal: ['proposal', 'topic', 'selection', 'approval', 'outline'],
      literature_review: [
        'literature',
        'review',
        'research',
        'survey',
        'papers',
      ],
      methodology: ['methodology', 'method', 'approach', 'design', 'framework'],
      implementation: [
        'implementation',
        'development',
        'coding',
        'build',
        'create',
      ],
      testing: ['testing', 'test', 'validation', 'verification', 'evaluation'],
      documentation: [
        'documentation',
        'report',
        'thesis',
        'writing',
        'document',
      ],
      presentation: ['presentation', 'defense', 'demo', 'showcase', 'final'],
    };

    // Analyze upcoming and in-progress milestones
    const activeMilestones = [
      ...milestoneContext.upcoming,
      // Add any in-progress milestones if available
    ];

    const phaseCounts = Object.keys(phaseKeywords).reduce(
      (acc, phase) => {
        acc[phase] = 0;
        return acc;
      },
      {} as Record<string, number>,
    );

    activeMilestones.forEach((milestone) => {
      const title = milestone.title.toLowerCase();
      Object.entries(phaseKeywords).forEach(([phase, keywords]) => {
        if (keywords.some((keyword) => title.includes(keyword))) {
          phaseCounts[phase]++;
        }
      });
    });

    // Find the phase with the most active milestones
    const maxPhase = Object.entries(phaseCounts).reduce(
      (max, [phase, count]) => (count > max.count ? { phase, count } : max),
      { phase: null, count: 0 },
    );

    return { currentPhase: maxPhase.phase };
  }

  private calculatePhaseProgress(
    currentPhase: string,
    milestoneContext: MilestoneContext,
    daysSinceStart: number,
  ): number {
    const phaseInfo = this.PROJECT_PHASES[currentPhase];
    if (!phaseInfo) return 0;

    // Calculate progress based on milestone completion in current phase
    const phaseKeywords = this.getPhaseKeywords(currentPhase);

    let phaseMilestones = 0;
    let completedPhaseMilestones = 0;

    // Count milestones related to current phase
    [
      ...milestoneContext.upcoming,
      ...milestoneContext.recentlyCompleted,
    ].forEach((milestone) => {
      const title = milestone.title.toLowerCase();
      if (phaseKeywords.some((keyword) => title.includes(keyword))) {
        phaseMilestones++;
        if ('completedAt' in milestone) {
          completedPhaseMilestones++;
        }
      }
    });

    if (phaseMilestones === 0) {
      // Fallback to time-based progress
      const expectedWeeks = phaseInfo.duration;
      const weeksInPhase = Math.floor(daysSinceStart / 7) % expectedWeeks;
      return Math.min((weeksInPhase / expectedWeeks) * 100, 100);
    }

    return (completedPhaseMilestones / phaseMilestones) * 100;
  }

  private getPhaseKeywords(phase: string): string[] {
    const keywords = {
      planning: ['plan', 'planning', 'setup', 'initialization'],
      proposal: ['proposal', 'topic', 'selection', 'approval'],
      literature_review: ['literature', 'review', 'research', 'survey'],
      methodology: ['methodology', 'method', 'approach', 'design'],
      implementation: ['implementation', 'development', 'coding', 'build'],
      testing: ['testing', 'test', 'validation', 'verification'],
      documentation: ['documentation', 'report', 'thesis', 'writing'],
      presentation: ['presentation', 'defense', 'demo', 'showcase'],
    };
    return keywords[phase] || [];
  }

  private calculateNextPhaseDeadline(
    currentPhase: string,
    projectStartDate: Date,
  ): string | null {
    const phases = Object.keys(this.PROJECT_PHASES);
    const currentIndex = phases.indexOf(currentPhase);

    if (currentIndex === -1 || currentIndex === phases.length - 1) {
      return null;
    }

    // Calculate cumulative weeks to next phase
    let cumulativeWeeks = 0;
    for (let i = 0; i <= currentIndex; i++) {
      cumulativeWeeks += this.PROJECT_PHASES[phases[i]].duration;
    }

    const nextPhaseDate = new Date(projectStartDate);
    nextPhaseDate.setDate(nextPhaseDate.getDate() + cumulativeWeeks * 7);

    return nextPhaseDate.toISOString().split('T')[0];
  }

  private estimateRemainingDays(
    currentPhase: string,
    phaseProgress: number,
  ): number {
    const phases = Object.keys(this.PROJECT_PHASES);
    const currentIndex = phases.indexOf(currentPhase);

    if (currentIndex === -1) return 0;

    // Calculate remaining days in current phase
    const currentPhaseInfo = this.PROJECT_PHASES[currentPhase];
    const remainingInCurrentPhase =
      ((100 - phaseProgress) / 100) * currentPhaseInfo.duration * 7;

    // Calculate days for remaining phases
    let remainingPhasesDays = 0;
    for (let i = currentIndex + 1; i < phases.length; i++) {
      remainingPhasesDays += this.PROJECT_PHASES[phases[i]].duration * 7;
    }

    return Math.round(remainingInCurrentPhase + remainingPhasesDays);
  }

  private assessProjectRisk(
    milestoneContext: MilestoneContext,
    daysSinceStart: number,
    currentPhase: string,
  ): 'low' | 'medium' | 'high' {
    let riskScore = 0;

    // Risk factors
    if (milestoneContext.overdue.length > 0) {
      riskScore += milestoneContext.overdue.length * 2;
    }

    if (milestoneContext.blocked.length > 0) {
      riskScore += milestoneContext.blocked.length * 1.5;
    }

    if (milestoneContext.progressPercentage < 50 && daysSinceStart > 140) {
      // 20 weeks
      riskScore += 3;
    }

    // Phase-specific risk assessment
    const expectedProgress = this.getExpectedProgressForPhase(
      currentPhase,
      daysSinceStart,
    );
    if (milestoneContext.progressPercentage < expectedProgress - 20) {
      riskScore += 2;
    }

    if (riskScore >= 5) return 'high';
    if (riskScore >= 2) return 'medium';
    return 'low';
  }

  private getExpectedProgressForPhase(
    currentPhase: string,
    daysSinceStart: number,
  ): number {
    const totalProjectDays = 280; // 40 weeks
    const timeProgress = (daysSinceStart / totalProjectDays) * 100;

    // Adjust based on phase - some phases should have higher completion rates
    const phaseMultipliers = {
      planning: 0.8,
      proposal: 0.9,
      literature_review: 1.0,
      methodology: 1.0,
      implementation: 0.7, // Implementation often takes longer
      testing: 1.1,
      documentation: 1.0,
      presentation: 1.2,
    };

    const multiplier = phaseMultipliers[currentPhase] || 1.0;
    return Math.min(timeProgress * multiplier, 100);
  }

  private async generateProjectRecommendations(
    project: Project,
    milestoneContext: MilestoneContext,
    currentPhase: string,
    riskLevel: 'low' | 'medium' | 'high',
  ): Promise<string[]> {
    const recommendations: string[] = [];

    // Risk-based recommendations
    if (riskLevel === 'high') {
      recommendations.push(
        'Schedule an urgent meeting with your supervisor to discuss timeline adjustments',
      );
      recommendations.push('Consider reducing project scope to meet deadlines');
    } else if (riskLevel === 'medium') {
      recommendations.push(
        'Review your milestone schedule and identify potential optimizations',
      );
    }

    // Overdue milestone recommendations
    if (milestoneContext.overdue.length > 0) {
      recommendations.push(
        `Prioritize completing ${milestoneContext.overdue.length} overdue milestone(s)`,
      );
    }

    // Blocked milestone recommendations
    if (milestoneContext.blocked.length > 0) {
      recommendations.push(
        'Seek help to resolve blocked milestones - consider reaching out to peers or supervisor',
      );
    }

    // Phase-specific recommendations
    const phaseRecommendations = this.getPhaseSpecificRecommendations(
      currentPhase,
      project.specialization,
    );
    recommendations.push(...phaseRecommendations);

    return recommendations.slice(0, 5); // Limit to top 5 recommendations
  }

  private getPhaseSpecificRecommendations(
    phase: string,
    specialization: string,
  ): string[] {
    const baseRecommendations = {
      planning: [
        'Define clear project objectives and scope',
        'Set up your development environment and tools',
      ],
      proposal: [
        'Focus on clearly articulating your research question',
        'Ensure your methodology aligns with your objectives',
      ],
      literature_review: [
        'Use systematic search strategies for finding relevant papers',
        'Maintain detailed notes and citations as you read',
      ],
      methodology: [
        'Validate your approach with your supervisor',
        'Consider potential limitations and mitigation strategies',
      ],
      implementation: [
        'Follow coding best practices and maintain version control',
        'Document your code and decisions as you develop',
      ],
      testing: [
        'Develop comprehensive test cases covering edge cases',
        'Consider both functional and non-functional testing',
      ],
      documentation: [
        "Start writing early - don't wait until the end",
        'Focus on clear explanations of your methodology and results',
      ],
      presentation: [
        'Practice your presentation multiple times',
        'Prepare for potential questions about your work',
      ],
    };

    return baseRecommendations[phase] || [];
  }

  private generateMilestoneRecommendations(
    milestone: any,
    type: 'urgent' | 'normal',
  ): string[] {
    const recommendations: string[] = [];

    if (type === 'urgent') {
      recommendations.push(
        'Break this milestone into smaller, manageable tasks',
      );
      recommendations.push(
        'Allocate focused time blocks to work on this milestone',
      );
      recommendations.push('Consider seeking help if you encounter blockers');
    }

    // Add milestone-specific recommendations based on title keywords
    const title = milestone.title.toLowerCase();
    if (title.includes('literature') || title.includes('review')) {
      recommendations.push(
        'Use academic databases like IEEE Xplore, ACM Digital Library',
      );
      recommendations.push(
        'Create a systematic review matrix to organize your findings',
      );
    } else if (title.includes('implementation') || title.includes('coding')) {
      recommendations.push('Set up proper version control and backup systems');
      recommendations.push('Write unit tests as you develop');
    } else if (title.includes('documentation') || title.includes('report')) {
      recommendations.push(
        'Start with an outline and fill in sections gradually',
      );
      recommendations.push('Use proper academic writing style and citations');
    }

    return recommendations;
  }

  private generateOverdueActionItems(milestone: any): string[] {
    const actionItems: string[] = [];

    actionItems.push('Assess what caused the delay and address root causes');
    actionItems.push('Create a catch-up plan with specific daily goals');
    actionItems.push('Communicate with your supervisor about the delay');

    if (milestone.daysPastDue > 7) {
      actionItems.push('Consider if the milestone scope needs to be adjusted');
    }

    if (milestone.daysPastDue > 14) {
      actionItems.push(
        'Schedule an urgent meeting to discuss timeline recovery',
      );
    }

    return actionItems;
  }

  private generateBlockedMilestoneSolutions(milestone: any): string[] {
    const solutions: string[] = [];

    solutions.push(
      'Identify the specific blocker and research potential solutions',
    );
    solutions.push('Reach out to peers who may have faced similar challenges');
    solutions.push('Schedule time with your supervisor to discuss the blocker');

    // Add specific solutions based on common blocking reasons
    const blockingReason = milestone.blockingReason.toLowerCase();
    if (blockingReason.includes('technical')) {
      solutions.push('Consider alternative technical approaches or tools');
      solutions.push('Look for online tutorials or documentation');
    } else if (blockingReason.includes('data')) {
      solutions.push('Explore alternative data sources or synthetic data');
      solutions.push(
        'Consider adjusting your methodology to work with available data',
      );
    } else if (blockingReason.includes('resource')) {
      solutions.push(
        'Identify alternative resources or request additional support',
      );
    }

    return solutions;
  }

  private generatePhaseSpecificGuidance(phase: string): {
    currentPhase: string;
    phaseDescription: string;
    keyActivities: string[];
    commonChallenges: string[];
    successTips: string[];
    nextPhasePreparation: string[];
  } {
    const phaseGuidance = {
      planning: {
        phaseDescription: 'Initial project setup and planning',
        keyActivities: [
          'Define project scope and objectives',
          'Set up development environment',
          'Create initial project timeline',
          'Identify required resources and tools',
        ],
        commonChallenges: [
          'Scope creep and unrealistic expectations',
          'Underestimating time requirements',
          'Lack of clear objectives',
        ],
        successTips: [
          'Start with a clear, achievable scope',
          'Break down large tasks into smaller milestones',
          'Regular check-ins with supervisor',
        ],
        nextPhasePreparation: [
          'Research proposal writing guidelines',
          'Gather initial references for literature review',
          'Prepare project proposal outline',
        ],
      },
      proposal: {
        phaseDescription:
          'Writing and getting approval for your project proposal',
        keyActivities: [
          'Write project proposal document',
          'Define research questions and objectives',
          'Outline methodology approach',
          'Submit for supervisor approval',
        ],
        commonChallenges: [
          'Unclear research questions',
          'Methodology not aligned with objectives',
          'Insufficient background research',
        ],
        successTips: [
          'Make your research question specific and measurable',
          'Ensure methodology matches your objectives',
          'Get feedback early and often',
        ],
        nextPhasePreparation: [
          'Identify key databases for literature search',
          'Create search terms and keywords list',
          'Set up reference management system',
        ],
      },
      literature_review: {
        phaseDescription:
          'Comprehensive review of existing research and literature',
        keyActivities: [
          'Systematic literature search',
          'Critical analysis of relevant papers',
          'Identify research gaps',
          'Write literature review chapter',
        ],
        commonChallenges: [
          'Information overload',
          'Difficulty synthesizing findings',
          'Keeping track of sources',
        ],
        successTips: [
          'Use systematic search strategies',
          'Maintain detailed notes and summaries',
          'Focus on quality over quantity',
        ],
        nextPhasePreparation: [
          'Refine methodology based on literature findings',
          'Identify tools and technologies needed',
          'Plan data collection or development approach',
        ],
      },
      // Add other phases...
    };

    const guidance = phaseGuidance[phase];
    if (!guidance) {
      return {
        currentPhase: phase,
        phaseDescription: 'Current project phase',
        keyActivities: [],
        commonChallenges: [],
        successTips: [],
        nextPhasePreparation: [],
      };
    }

    return {
      currentPhase: phase,
      ...guidance,
    };
  }

  private analyzeProjectTimeline(
    milestoneContext: MilestoneContext,
    projectContext: EnhancedProjectContext | null,
  ): {
    onTrack: boolean;
    riskLevel: 'low' | 'medium' | 'high';
    adjustmentRecommendations: string[];
    criticalPath: string[];
  } {
    const onTrack =
      milestoneContext.overdue.length === 0 &&
      milestoneContext.blocked.length === 0 &&
      milestoneContext.progressPercentage >= 60; // Assuming 60% is good progress

    const riskLevel = projectContext?.riskLevel || 'medium';

    const adjustmentRecommendations: string[] = [];
    if (!onTrack) {
      adjustmentRecommendations.push('Review and adjust milestone deadlines');
      adjustmentRecommendations.push('Identify tasks that can be parallelized');
      adjustmentRecommendations.push('Consider reducing scope if necessary');
    }

    const criticalPath = this.identifyCriticalPath(milestoneContext);

    return {
      onTrack,
      riskLevel,
      adjustmentRecommendations,
      criticalPath,
    };
  }

  private identifyCriticalPath(milestoneContext: MilestoneContext): string[] {
    // Simplified critical path identification
    const criticalMilestones = [
      ...milestoneContext.overdue.map((m) => m.title),
      ...milestoneContext.upcoming
        .filter((m) => m.daysUntilDue <= 14)
        .map((m) => m.title),
    ];

    return criticalMilestones.slice(0, 3); // Top 3 critical milestones
  }

  private getBasePhaseCustomization(phase: string): ProjectPhaseCustomization {
    const customizations = {
      proposal: {
        responseStyle: 'directive' as const,
        focusAreas: ['research_questions', 'methodology', 'scope_definition'],
        keyTerms: ['research question', 'methodology', 'scope', 'objectives'],
        templateResponses: {
          research_question:
            'A good research question should be specific, measurable, and achievable...',
          methodology:
            'Your methodology should align with your research objectives...',
        },
        commonQuestions: [
          'How do I write a good research question?',
          'What methodology should I use?',
          'How do I define project scope?',
        ],
        resourceRecommendations: [
          'Research methodology textbooks',
          'Supervisor guidance on proposal structure',
          'Previous successful proposals in your field',
        ],
      },
      implementation: {
        responseStyle: 'analytical' as const,
        focusAreas: ['coding_practices', 'testing', 'documentation'],
        keyTerms: ['implementation', 'coding', 'testing', 'debugging'],
        templateResponses: {
          coding_practices:
            'Follow these coding best practices for your implementation...',
          testing:
            'Comprehensive testing should include unit tests, integration tests...',
        },
        commonQuestions: [
          'What are the best coding practices?',
          'How should I structure my code?',
          'What testing approach should I use?',
        ],
        resourceRecommendations: [
          'Clean Code by Robert Martin',
          'Testing frameworks for your technology stack',
          'Version control best practices',
        ],
      },
      // Add other phases as needed
    };

    return (
      customizations[phase] || {
        phase,
        responseStyle: 'supportive' as const,
        focusAreas: [],
        keyTerms: [],
        templateResponses: {},
        commonQuestions: [],
        resourceRecommendations: [],
      }
    );
  }

  private getSpecializationCustomization(
    specialization: string,
    phase: string,
  ): {
    focusAreas: string[];
    keyTerms: string[];
    templateResponses: Record<string, string>;
    resourceRecommendations: string[];
  } {
    // Specialization-specific customizations
    const specializationCustomizations = {
      'Software Engineering': {
        focusAreas: ['software_architecture', 'design_patterns', 'scalability'],
        keyTerms: [
          'architecture',
          'design patterns',
          'scalability',
          'performance',
        ],
        templateResponses: {
          architecture:
            'Consider using established architectural patterns like MVC, microservices...',
        },
        resourceRecommendations: [
          'Design Patterns: Elements of Reusable Object-Oriented Software',
          'Clean Architecture by Robert Martin',
        ],
      },
      'Data Science': {
        focusAreas: ['data_analysis', 'machine_learning', 'visualization'],
        keyTerms: [
          'dataset',
          'algorithm',
          'model',
          'analysis',
          'visualization',
        ],
        templateResponses: {
          data_analysis:
            'Start with exploratory data analysis to understand your dataset...',
        },
        resourceRecommendations: [
          'Python for Data Analysis by Wes McKinney',
          'Scikit-learn documentation',
        ],
      },
      // Add other specializations
    };

    return (
      specializationCustomizations[specialization] || {
        focusAreas: [],
        keyTerms: [],
        templateResponses: {},
        resourceRecommendations: [],
      }
    );
  }

  private isQueryRelatedToCurrentPhase(
    query: string,
    currentPhase: string,
  ): boolean {
    const phaseKeywords = this.getPhaseKeywords(currentPhase);
    const queryLower = query.toLowerCase();
    return phaseKeywords.some((keyword) => queryLower.includes(keyword));
  }
}
