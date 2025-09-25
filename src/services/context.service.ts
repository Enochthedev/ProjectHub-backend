import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversation } from '../entities/conversation.entity';
import { ConversationMessage } from '../entities/conversation-message.entity';
import { Project } from '../entities/project.entity';
import { Milestone } from '../entities/milestone.entity';
import { User } from '../entities/user.entity';
import { ConversationContext } from '../entities/interfaces/conversation.interface';
import { MessageType, MilestoneStatus } from '../common/enums';

export interface ProjectContext {
  id: string;
  title: string;
  specialization: string;
  difficultyLevel: string;
  tags: string[];
  technologyStack: string[];
  phase: string;
  supervisor: {
    id: string;
    name: string;
    email: string;
  };
}

export interface MilestoneContext {
  upcoming: Array<{
    id: string;
    title: string;
    dueDate: string;
    status: MilestoneStatus;
    daysUntilDue: number;
    isOverdue: boolean;
  }>;
  overdue: Array<{
    id: string;
    title: string;
    dueDate: string;
    daysPastDue: number;
  }>;
  recentlyCompleted: Array<{
    id: string;
    title: string;
    completedAt: string;
  }>;
  blocked: Array<{
    id: string;
    title: string;
    blockingReason: string;
  }>;
  currentPhase: string;
  progressPercentage: number;
}

export interface ConversationHistoryContext {
  recentTopics: string[];
  keyTerms: string[];
  conversationSummary: string;
  messageCount: number;
  lastActivity: Date;
  frequentQuestions: string[];
}

@Injectable()
export class ContextService {
  private readonly logger = new Logger(ContextService.name);
  private readonly CONTEXT_WINDOW_MESSAGES = 10;
  private readonly MAX_SUMMARY_LENGTH = 500;
  private readonly MAX_RECENT_TOPICS = 5;
  private readonly MAX_KEY_TERMS = 10;

  constructor(
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
    @InjectRepository(ConversationMessage)
    private readonly messageRepository: Repository<ConversationMessage>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(Milestone)
    private readonly milestoneRepository: Repository<Milestone>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Build comprehensive conversation context incorporating project and milestone information
   */
  async buildConversationContext(
    conversationId: string,
  ): Promise<ConversationContext> {
    this.logger.log(`Building context for conversation ${conversationId}`);

    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
      relations: ['student', 'messages'],
    });

    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`);
    }

    // Get project context if conversation is linked to a project
    let projectContext: ProjectContext | null = null;
    if (conversation.projectId) {
      projectContext = await this.getProjectContext(
        conversation.studentId,
        conversation.projectId,
      );
    } else {
      // Try to get the student's current project
      const studentProject = await this.getStudentCurrentProject(
        conversation.studentId,
      );
      if (studentProject) {
        projectContext = studentProject;
      }
    }

    // Get milestone context
    const milestoneContext = await this.getMilestoneContext(
      conversation.studentId,
    );

    // Analyze conversation history
    const historyContext =
      await this.analyzeConversationHistory(conversationId);

    // Determine current project phase
    const projectPhase = this.determineProjectPhase(
      milestoneContext,
      projectContext,
    );

    // Build comprehensive context
    const context: ConversationContext = {
      projectId: projectContext?.id,
      projectPhase,
      specialization: projectContext?.specialization,
      recentTopics: historyContext.recentTopics,
      keyTerms: historyContext.keyTerms,
      conversationSummary: historyContext.conversationSummary,
      lastActivity: new Date(),
      preferences: {
        language: conversation.language || 'en',
        responseStyle: 'academic',
        detailLevel: 'detailed',
      },
    };

    // Update conversation context in database
    await this.updateConversationContext(conversationId, context);

    return context;
  }

  /**
   * Get project context for a specific student and project
   */
  async getProjectContext(
    studentId: string,
    projectId?: string,
  ): Promise<ProjectContext | null> {
    let project: Project | null = null;

    if (projectId) {
      project = await this.projectRepository.findOne({
        where: { id: projectId },
        relations: ['supervisor', 'supervisor.supervisorProfile'],
      });
    } else {
      // Get the student's current project (most recent approved project)
      project = await this.projectRepository.findOne({
        where: {
          // Note: This assumes there's a student relationship in Project entity
          // The actual implementation may need adjustment based on the project-student relationship
        },
        relations: ['supervisor', 'supervisor.supervisorProfile'],
        order: { createdAt: 'DESC' },
      });
    }

    if (!project) {
      return null;
    }

    return {
      id: project.id,
      title: project.title,
      specialization: project.specialization,
      difficultyLevel: project.difficultyLevel,
      tags: project.tags,
      technologyStack: project.technologyStack,
      phase: this.determineProjectPhaseFromProject(project),
      supervisor: {
        id: project.supervisor.id,
        name:
          project.supervisor.supervisorProfile?.name || 'Unknown Supervisor',
        email: project.supervisor.email,
      },
    };
  }

  /**
   * Get milestone context for a student
   */
  async getMilestoneContext(studentId: string): Promise<MilestoneContext> {
    const milestones = await this.milestoneRepository.find({
      where: { studentId },
      order: { dueDate: 'ASC' },
    });

    const now = new Date();
    const upcoming = milestones
      .filter(
        (m) =>
          m.status !== MilestoneStatus.COMPLETED &&
          m.status !== MilestoneStatus.CANCELLED,
      )
      .filter((m) => new Date(m.dueDate) >= now)
      .slice(0, 5)
      .map((m) => ({
        id: m.id,
        title: m.title,
        dueDate: m.dueDate.toISOString().split('T')[0],
        status: m.status,
        daysUntilDue: m.getDaysUntilDue(),
        isOverdue: m.isOverdue(),
      }));

    const overdue = milestones
      .filter((m) => m.isOverdue())
      .map((m) => ({
        id: m.id,
        title: m.title,
        dueDate: m.dueDate.toISOString().split('T')[0],
        daysPastDue: Math.abs(m.getDaysUntilDue()),
      }));

    const recentlyCompleted = milestones
      .filter((m) => m.status === MilestoneStatus.COMPLETED && m.completedAt)
      .sort(
        (a, b) =>
          new Date(b.completedAt!).getTime() -
          new Date(a.completedAt!).getTime(),
      )
      .slice(0, 3)
      .map((m) => ({
        id: m.id,
        title: m.title,
        completedAt: m.completedAt!.toISOString().split('T')[0],
      }));

    const blocked = milestones
      .filter((m) => m.status === MilestoneStatus.BLOCKED)
      .map((m) => ({
        id: m.id,
        title: m.title,
        blockingReason: m.blockingReason || 'No reason specified',
      }));

    // Calculate progress
    const totalMilestones = milestones.length;
    const completedMilestones = milestones.filter(
      (m) => m.status === MilestoneStatus.COMPLETED,
    ).length;
    const progressPercentage =
      totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0;

    // Determine current phase based on milestones
    const currentPhase = this.determinePhaseFromMilestones(milestones);

    return {
      upcoming,
      overdue,
      recentlyCompleted,
      blocked,
      currentPhase,
      progressPercentage: Math.round(progressPercentage),
    };
  }

  /**
   * Analyze conversation history for context continuity
   */
  async analyzeConversationHistory(
    conversationId: string,
  ): Promise<ConversationHistoryContext> {
    const messages = await this.messageRepository.find({
      where: { conversationId },
      order: { createdAt: 'DESC' },
      take: this.CONTEXT_WINDOW_MESSAGES,
    });

    if (messages.length === 0) {
      return {
        recentTopics: [],
        keyTerms: [],
        conversationSummary: '',
        messageCount: 0,
        lastActivity: new Date(),
        frequentQuestions: [],
      };
    }

    // Extract topics and terms from recent messages
    const recentTopics = this.extractTopicsFromMessages(messages);
    const keyTerms = this.extractKeyTermsFromMessages(messages);
    const conversationSummary = this.generateConversationSummary(messages);
    const frequentQuestions = this.extractFrequentQuestions(messages);

    return {
      recentTopics: recentTopics.slice(0, this.MAX_RECENT_TOPICS),
      keyTerms: keyTerms.slice(0, this.MAX_KEY_TERMS),
      conversationSummary,
      messageCount: messages.length,
      lastActivity: messages[0].createdAt,
      frequentQuestions,
    };
  }

  /**
   * Update conversation context in database
   */
  async updateConversationContext(
    conversationId: string,
    context: Partial<ConversationContext>,
  ): Promise<void> {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`);
    }

    conversation.context = {
      ...conversation.context,
      ...context,
      lastActivity: new Date(),
    };

    await this.conversationRepository.save(conversation);
  }

  /**
   * Summarize long conversations to maintain context efficiency
   */
  async summarizeConversation(conversationId: string): Promise<string> {
    const messages = await this.messageRepository.find({
      where: { conversationId },
      order: { createdAt: 'ASC' },
    });

    if (messages.length === 0) {
      return '';
    }

    // Group messages by topic/theme
    const topicGroups = this.groupMessagesByTopic(messages);

    // Generate summary for each topic group
    const topicSummaries = topicGroups.map((group) => {
      const mainTopic = this.identifyMainTopic(group);
      const keyPoints = this.extractKeyPoints(group);
      return `${mainTopic}: ${keyPoints.join(', ')}`;
    });

    let summary = topicSummaries.join('. ');

    // Truncate if too long
    if (summary.length > this.MAX_SUMMARY_LENGTH) {
      summary = summary.substring(0, this.MAX_SUMMARY_LENGTH - 3) + '...';
    }

    return summary;
  }

  /**
   * Get student's current project
   */
  private async getStudentCurrentProject(
    studentId: string,
  ): Promise<ProjectContext | null> {
    // This is a placeholder implementation
    // The actual implementation would depend on how student-project relationships are modeled
    return null;
  }

  /**
   * Determine project phase from milestone context
   */
  private determineProjectPhase(
    milestoneContext: MilestoneContext,
    projectContext: ProjectContext | null,
  ): string {
    if (milestoneContext.progressPercentage === 0) {
      return 'planning';
    } else if (milestoneContext.progressPercentage < 25) {
      return 'proposal';
    } else if (milestoneContext.progressPercentage < 50) {
      return 'literature_review';
    } else if (milestoneContext.progressPercentage < 75) {
      return 'methodology';
    } else if (milestoneContext.progressPercentage < 90) {
      return 'implementation';
    } else {
      return 'documentation';
    }
  }

  /**
   * Determine project phase from project entity
   */
  private determineProjectPhaseFromProject(project: Project): string {
    // This is a basic implementation - could be enhanced with actual phase tracking
    const daysSinceCreation = Math.floor(
      (new Date().getTime() - new Date(project.createdAt).getTime()) /
        (1000 * 60 * 60 * 24),
    );

    if (daysSinceCreation < 30) {
      return 'proposal';
    } else if (daysSinceCreation < 60) {
      return 'literature_review';
    } else if (daysSinceCreation < 120) {
      return 'methodology';
    } else if (daysSinceCreation < 180) {
      return 'implementation';
    } else {
      return 'documentation';
    }
  }

  /**
   * Determine phase from milestones
   */
  private determinePhaseFromMilestones(milestones: Milestone[]): string {
    const phaseKeywords = {
      proposal: ['proposal', 'topic', 'selection', 'approval'],
      literature_review: ['literature', 'review', 'research', 'survey'],
      methodology: ['methodology', 'method', 'approach', 'design'],
      implementation: ['implementation', 'development', 'coding', 'build'],
      documentation: ['documentation', 'report', 'thesis', 'writing'],
    };

    const phaseCounts = Object.keys(phaseKeywords).reduce(
      (acc, phase) => {
        acc[phase] = 0;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Count milestones by phase based on title keywords
    milestones.forEach((milestone) => {
      const title = milestone.title.toLowerCase();
      Object.entries(phaseKeywords).forEach(([phase, keywords]) => {
        if (keywords.some((keyword) => title.includes(keyword))) {
          phaseCounts[phase]++;
        }
      });
    });

    // Return phase with most milestones, or default based on progress
    const maxPhase = Object.entries(phaseCounts).reduce(
      (max, [phase, count]) => (count > max.count ? { phase, count } : max),
      { phase: 'planning', count: 0 },
    );

    return maxPhase.phase;
  }

  /**
   * Extract topics from messages using keyword analysis
   */
  private extractTopicsFromMessages(messages: ConversationMessage[]): string[] {
    const topicKeywords = {
      literature_review: [
        'literature',
        'review',
        'papers',
        'research',
        'sources',
      ],
      methodology: ['methodology', 'method', 'approach', 'framework'],
      implementation: ['implementation', 'code', 'development', 'programming'],
      documentation: ['documentation', 'writing', 'report', 'thesis'],
      proposal: ['proposal', 'topic', 'selection', 'approval'],
      data_analysis: ['data', 'analysis', 'statistics', 'results'],
      testing: ['testing', 'validation', 'verification', 'evaluation'],
    };

    const topicCounts = Object.keys(topicKeywords).reduce(
      (acc, topic) => {
        acc[topic] = 0;
        return acc;
      },
      {} as Record<string, number>,
    );

    messages.forEach((message) => {
      const content = message.content.toLowerCase();
      Object.entries(topicKeywords).forEach(([topic, keywords]) => {
        if (keywords.some((keyword) => content.includes(keyword))) {
          topicCounts[topic]++;
        }
      });
    });

    return Object.entries(topicCounts)
      .filter(([_, count]) => count > 0)
      .sort(([_, a], [__, b]) => b - a)
      .map(([topic, _]) => topic);
  }

  /**
   * Extract key terms from messages
   */
  private extractKeyTermsFromMessages(
    messages: ConversationMessage[],
  ): string[] {
    const academicTerms = [
      'hypothesis',
      'research question',
      'research',
      'objective',
      'scope',
      'limitation',
      'variable',
      'sample',
      'population',
      'survey',
      'interview',
      'experiment',
      'qualitative',
      'quantitative',
      'analysis',
      'framework',
      'model',
      'algorithm',
      'database',
      'api',
      'frontend',
      'backend',
      'testing',
      'validation',
      'evaluation',
      'results',
      'conclusion',
      'recommendation',
    ];

    const termCounts = academicTerms.reduce(
      (acc, term) => {
        acc[term] = 0;
        return acc;
      },
      {} as Record<string, number>,
    );

    messages.forEach((message) => {
      const content = message.content.toLowerCase();
      academicTerms.forEach((term) => {
        if (content.includes(term)) {
          termCounts[term]++;
        }
      });
    });

    return Object.entries(termCounts)
      .filter(([_, count]) => count > 0)
      .sort(([_, a], [__, b]) => b - a)
      .map(([term, _]) => term);
  }

  /**
   * Generate conversation summary
   */
  private generateConversationSummary(messages: ConversationMessage[]): string {
    if (messages.length === 0) {
      return '';
    }

    const userQueries = messages
      .filter((m) => m.type === MessageType.USER_QUERY)
      .slice(0, 3)
      .map((m) => m.content.substring(0, 100));

    const mainTopics = this.extractTopicsFromMessages(messages).slice(0, 3);

    let summary = '';
    if (mainTopics.length > 0) {
      summary += `Discussion topics: ${mainTopics.join(', ')}. `;
    }
    if (userQueries.length > 0) {
      summary += `Recent questions about: ${userQueries.join('; ')}.`;
    }

    return summary.substring(0, this.MAX_SUMMARY_LENGTH);
  }

  /**
   * Extract frequent questions from conversation history
   */
  private extractFrequentQuestions(messages: ConversationMessage[]): string[] {
    const questions = messages
      .filter((m) => m.type === MessageType.USER_QUERY)
      .filter((m) => m.content.includes('?'))
      .map((m) => m.content.trim())
      .slice(0, 5);

    return questions;
  }

  /**
   * Group messages by topic for summarization
   */
  private groupMessagesByTopic(
    messages: ConversationMessage[],
  ): ConversationMessage[][] {
    // Simple implementation - group consecutive messages
    // Could be enhanced with more sophisticated topic modeling
    const groups: ConversationMessage[][] = [];
    let currentGroup: ConversationMessage[] = [];

    messages.forEach((message) => {
      if (currentGroup.length === 0) {
        currentGroup.push(message);
      } else {
        // Simple heuristic: start new group if message type changes or time gap > 1 hour
        const lastMessage = currentGroup[currentGroup.length - 1];
        const timeDiff =
          new Date(message.createdAt).getTime() -
          new Date(lastMessage.createdAt).getTime();
        const oneHour = 60 * 60 * 1000;

        if (message.type !== lastMessage.type || timeDiff > oneHour) {
          groups.push([...currentGroup]);
          currentGroup = [message];
        } else {
          currentGroup.push(message);
        }
      }
    });

    if (currentGroup.length > 0) {
      groups.push(currentGroup);
    }

    return groups;
  }

  /**
   * Identify main topic from a group of messages
   */
  private identifyMainTopic(messages: ConversationMessage[]): string {
    const topics = this.extractTopicsFromMessages(messages);
    return topics.length > 0 ? topics[0] : 'general_discussion';
  }

  /**
   * Extract key points from a group of messages
   */
  private extractKeyPoints(messages: ConversationMessage[]): string[] {
    const keyTerms = this.extractKeyTermsFromMessages(messages);
    return keyTerms.slice(0, 3);
  }
}
