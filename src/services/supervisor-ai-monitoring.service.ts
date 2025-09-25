import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Conversation } from '../entities/conversation.entity';
import { ConversationMessage } from '../entities/conversation-message.entity';
import { User } from '../entities/user.entity';
import { Project } from '../entities/project.entity';
import { SupervisorProfile } from '../entities/supervisor-profile.entity';
import {
  StudentInteractionsOverviewDto,
  StudentInteractionSummaryDto,
  CommonQuestionsAnalysisDto,
  CommonQuestionDto,
  EscalationsOverviewDto,
  EscalatedConversationDto,
  SupervisorMonitoringFiltersDto,
} from '../dto/ai-assistant/supervisor-monitoring.dto';
import { ConversationStatus, MessageType, UserRole } from '../common/enums';
import { subDays, subHours } from 'date-fns';

@Injectable()
export class SupervisorAIMonitoringService {
  constructor(
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
    @InjectRepository(ConversationMessage)
    private readonly messageRepository: Repository<ConversationMessage>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(SupervisorProfile)
    private readonly supervisorProfileRepository: Repository<SupervisorProfile>,
  ) {}

  async getStudentInteractionsOverview(
    supervisorId: string,
    filters?: SupervisorMonitoringFiltersDto,
  ): Promise<StudentInteractionsOverviewDto> {
    // Verify supervisor role and get supervised students
    const supervisedStudents = await this.getSupervisedStudents(supervisorId);

    if (supervisedStudents.length === 0) {
      return {
        students: [],
        totalStudents: 0,
        activeStudents: 0,
        studentsWithEscalations: 0,
        overallAverageConfidence: 0,
        totalInteractions: 0,
      };
    }

    const studentIds = supervisedStudents.map((s) => s.id);
    const studentSummaries: StudentInteractionSummaryDto[] = [];

    // Get interaction data for each student
    for (const student of supervisedStudents) {
      const summary = await this.getStudentInteractionSummary(student, filters);
      if (summary) {
        studentSummaries.push(summary);
      }
    }

    // Calculate overview statistics
    const activeStudents = studentSummaries.filter(
      (s) =>
        s.lastInteractionAt && s.lastInteractionAt > subDays(new Date(), 7),
    ).length;

    const studentsWithEscalations = studentSummaries.filter(
      (s) => s.escalatedConversations > 0,
    ).length;

    const totalInteractions = studentSummaries.reduce(
      (sum, s) => sum + s.totalMessages,
      0,
    );

    const overallAverageConfidence =
      studentSummaries.length > 0
        ? studentSummaries.reduce(
            (sum, s) => sum + s.averageConfidenceScore,
            0,
          ) / studentSummaries.length
        : 0;

    return {
      students: studentSummaries,
      totalStudents: supervisedStudents.length,
      activeStudents,
      studentsWithEscalations,
      overallAverageConfidence: Number(overallAverageConfidence.toFixed(3)),
      totalInteractions,
    };
  }

  async getCommonQuestionsAnalysis(
    supervisorId: string,
    filters?: SupervisorMonitoringFiltersDto,
  ): Promise<CommonQuestionsAnalysisDto> {
    // Verify supervisor role and get supervised students
    const supervisedStudents = await this.getSupervisedStudents(supervisorId);

    if (supervisedStudents.length === 0) {
      return {
        questions: [],
        totalQuestions: 0,
        lowConfidenceQuestions: 0,
        lowRatedQuestions: 0,
        problematicCategories: [],
        knowledgeGaps: [],
      };
    }

    const studentIds = supervisedStudents.map((s) => s.id);

    // Build query for user messages
    let query = this.messageRepository
      .createQueryBuilder('message')
      .innerJoin('message.conversation', 'conversation')
      .innerJoin('conversation.student', 'student')
      .where('student.id IN (:...studentIds)', { studentIds })
      .andWhere('message.type = :messageType', {
        messageType: MessageType.USER_QUERY,
      });

    // Apply filters
    if (filters) {
      query = this.applyFiltersToMessageQuery(query, filters);
    }

    const userMessages = await query
      .select([
        'message.content',
        'message.metadata',
        'conversation.id',
        'conversation.studentId',
      ])
      .getMany();

    // Analyze questions and group by similarity/category
    const questionAnalysis = await this.analyzeQuestions(
      userMessages,
      studentIds,
    );

    return questionAnalysis;
  }

  async getEscalationsOverview(
    supervisorId: string,
    filters?: SupervisorMonitoringFiltersDto,
  ): Promise<EscalationsOverviewDto> {
    // Verify supervisor role and get supervised students
    const supervisedStudents = await this.getSupervisedStudents(supervisorId);

    if (supervisedStudents.length === 0) {
      return {
        escalations: [],
        totalEscalations: 0,
        newEscalations: 0,
        highPriorityEscalations: 0,
        urgentEscalations: 0,
        commonReasons: [],
      };
    }

    const studentIds = supervisedStudents.map((s) => s.id);

    // Build query for escalated conversations
    let query = this.conversationRepository
      .createQueryBuilder('conversation')
      .innerJoin('conversation.student', 'student')
      .leftJoin('conversation.project', 'project')
      .where('student.id IN (:...studentIds)', { studentIds })
      .andWhere('conversation.status = :status', {
        status: ConversationStatus.ESCALATED,
      });

    // Apply filters
    if (filters) {
      query = this.applyFiltersToConversationQuery(query, filters);
    }

    const escalatedConversations = await query
      .select([
        'conversation.id',
        'conversation.title',
        'conversation.updatedAt',
        'conversation.projectId',
        'student.id',
        'student.firstName',
        'student.lastName',
        'student.email',
        'project.title',
      ])
      .orderBy('conversation.updatedAt', 'DESC')
      .getMany();

    // Process escalations and determine priorities
    const escalations: EscalatedConversationDto[] = [];

    for (const conversation of escalatedConversations) {
      const escalation = await this.processEscalatedConversation(conversation);
      escalations.push(escalation);
    }

    // Calculate statistics
    const now = new Date();
    const newEscalations = escalations.filter(
      (e) => e.escalatedAt > subHours(now, 24),
    ).length;

    const highPriorityEscalations = escalations.filter(
      (e) => e.priority === 'high',
    ).length;

    const urgentEscalations = escalations.filter(
      (e) => e.priority === 'urgent',
    ).length;

    // Analyze common escalation reasons
    const reasonCounts = new Map<string, number>();
    escalations.forEach((e) => {
      const count = reasonCounts.get(e.escalationReason) || 0;
      reasonCounts.set(e.escalationReason, count + 1);
    });

    const commonReasons = Array.from(reasonCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([reason]) => reason);

    return {
      escalations,
      totalEscalations: escalations.length,
      newEscalations,
      highPriorityEscalations,
      urgentEscalations,
      commonReasons,
    };
  }

  private async getSupervisedStudents(supervisorId: string): Promise<User[]> {
    // Verify supervisor exists and has correct role
    const supervisor = await this.userRepository.findOne({
      where: { id: supervisorId },
      relations: ['supervisorProfile'],
    });

    if (!supervisor) {
      throw new NotFoundException('Supervisor not found');
    }

    if (
      supervisor.role !== UserRole.SUPERVISOR &&
      supervisor.role !== UserRole.ADMIN
    ) {
      throw new ForbiddenException('User does not have supervisor privileges');
    }

    // Get supervised students through projects
    const supervisedProjects = await this.projectRepository.find({
      where: { supervisorId },
      relations: ['supervisor'],
    });

    // Get unique student IDs from projects (assuming there's a studentId field)
    // Since Project entity doesn't have a direct student relation, we need to find students differently
    // For now, let's get all students and filter by projects they might have
    const allStudents = await this.userRepository.find({
      where: { role: UserRole.STUDENT },
      relations: ['studentProfile'],
    });

    // Filter students who have conversations related to projects supervised by this supervisor
    const studentIds = new Set<string>();

    // Get conversations for projects supervised by this supervisor
    if (supervisedProjects.length > 0) {
      const projectIds = supervisedProjects.map((p) => p.id);
      const conversations = await this.conversationRepository.find({
        where: projectIds.map((id) => ({ projectId: id })),
        relations: ['student'],
      });

      conversations.forEach((conv) => {
        if (conv.studentId) {
          studentIds.add(conv.studentId);
        }
      });
    }

    return allStudents.filter((student) => studentIds.has(student.id));
  }

  private async getStudentInteractionSummary(
    student: User,
    filters?: SupervisorMonitoringFiltersDto,
  ): Promise<StudentInteractionSummaryDto | null> {
    // Get conversation statistics
    let conversationQuery = this.conversationRepository
      .createQueryBuilder('conversation')
      .where('conversation.studentId = :studentId', { studentId: student.id });

    if (filters) {
      conversationQuery = this.applyFiltersToConversationQuery(
        conversationQuery,
        filters,
      );
    }

    const conversations = await conversationQuery.getMany();

    if (conversations.length === 0) {
      return null;
    }

    const conversationIds = conversations.map((c) => c.id);

    // Get message statistics
    const messageStats = await this.messageRepository
      .createQueryBuilder('message')
      .select([
        'COUNT(*) as total_messages',
        'AVG(CASE WHEN message.confidenceScore IS NOT NULL THEN message.confidenceScore END) as avg_confidence',
        'COUNT(CASE WHEN message.confidenceScore < 0.3 THEN 1 END) as low_confidence_count',
        'AVG(message.averageRating) as avg_rating',
        'MAX(message.createdAt) as last_interaction',
      ])
      .where('message.conversationId IN (:...conversationIds)', {
        conversationIds,
      })
      .getRawOne();

    // Get category analysis
    const categoryStats = await this.messageRepository
      .createQueryBuilder('message')
      .select("message.metadata->'category' as category, COUNT(*) as count")
      .where('message.conversationId IN (:...conversationIds)', {
        conversationIds,
      })
      .andWhere("message.metadata->'category' IS NOT NULL")
      .groupBy("message.metadata->'category'")
      .orderBy('count', 'DESC')
      .limit(5)
      .getRawMany();

    // Get project information - find project through conversations
    const studentConversations = await this.conversationRepository.find({
      where: { studentId: student.id },
      relations: ['project'],
    });

    const project = studentConversations.find((c) => c.project)?.project;

    return {
      studentId: student.id,
      studentName: student.studentProfile?.name || 'Unknown Student',
      studentEmail: student.email,
      totalConversations: conversations.length,
      totalMessages: parseInt(messageStats.total_messages) || 0,
      activeConversations: conversations.filter(
        (c) => c.status === ConversationStatus.ACTIVE,
      ).length,
      escalatedConversations: conversations.filter(
        (c) => c.status === ConversationStatus.ESCALATED,
      ).length,
      averageConfidenceScore: parseFloat(messageStats.avg_confidence) || 0,
      lowConfidenceResponses: parseInt(messageStats.low_confidence_count) || 0,
      lastInteractionAt: messageStats.last_interaction
        ? new Date(messageStats.last_interaction)
        : new Date(),
      commonCategories: categoryStats
        .map((stat) => stat.category)
        .filter(Boolean),
      averageRating: parseFloat(messageStats.avg_rating) || 0,
      projectId: project?.id,
      projectTitle: project?.title,
    };
  }

  private async analyzeQuestions(
    messages: ConversationMessage[],
    studentIds: string[],
  ): Promise<CommonQuestionsAnalysisDto> {
    // Group similar questions by extracting key terms and patterns
    const questionGroups = new Map<
      string,
      {
        questions: string[];
        studentIds: Set<string>;
        confidenceScores: number[];
        ratings: number[];
        category: string;
      }
    >();

    for (const message of messages) {
      const category = message.metadata?.category || 'general';
      const normalizedQuestion = this.normalizeQuestion(message.content);

      if (!questionGroups.has(normalizedQuestion)) {
        questionGroups.set(normalizedQuestion, {
          questions: [],
          studentIds: new Set(),
          confidenceScores: [],
          ratings: [],
          category,
        });
      }

      const group = questionGroups.get(normalizedQuestion)!;
      group.questions.push(message.content);
      group.studentIds.add(message.conversation.studentId);

      // Get corresponding AI response for confidence and rating
      const aiResponse = await this.messageRepository.findOne({
        where: {
          conversationId: message.conversationId,
          type: MessageType.AI_RESPONSE,
        },
        order: { createdAt: 'ASC' },
      });

      if (aiResponse) {
        if (aiResponse.confidenceScore !== null) {
          group.confidenceScores.push(aiResponse.confidenceScore);
        }
        if (aiResponse.averageRating > 0) {
          group.ratings.push(aiResponse.averageRating);
        }
      }
    }

    // Convert to DTOs and analyze
    const questions: CommonQuestionDto[] = [];
    let lowConfidenceQuestions = 0;
    let lowRatedQuestions = 0;
    const categoryCounts = new Map<string, number>();

    for (const [questionPattern, group] of questionGroups) {
      const avgConfidence =
        group.confidenceScores.length > 0
          ? group.confidenceScores.reduce((sum, score) => sum + score, 0) /
            group.confidenceScores.length
          : 0;

      const avgRating =
        group.ratings.length > 0
          ? group.ratings.reduce((sum, rating) => sum + rating, 0) /
            group.ratings.length
          : 0;

      const needsAttention = avgConfidence < 0.5 || avgRating < 3.0;

      if (avgConfidence < 0.5) lowConfidenceQuestions++;
      if (avgRating < 3.0) lowRatedQuestions++;

      const categoryCount = categoryCounts.get(group.category) || 0;
      categoryCounts.set(group.category, categoryCount + 1);

      questions.push({
        question: questionPattern,
        category: group.category,
        frequency: group.questions.length,
        averageConfidence: Number(avgConfidence.toFixed(3)),
        averageRating: Number(avgRating.toFixed(2)),
        studentIds: Array.from(group.studentIds),
        needsAttention,
        suggestedAction: needsAttention
          ? this.getSuggestedAction(avgConfidence, avgRating)
          : undefined,
      });
    }

    // Sort by frequency
    questions.sort((a, b) => b.frequency - a.frequency);

    // Identify problematic categories
    const problematicCategories = Array.from(categoryCounts.entries())
      .filter(([_, count]) => count >= 3)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([category]) => category);

    // Identify knowledge gaps
    const knowledgeGaps = questions
      .filter((q) => q.needsAttention && q.frequency >= 3)
      .slice(0, 10)
      .map((q) => `${q.category}: ${q.question.substring(0, 100)}...`);

    return {
      questions: questions.slice(0, 50), // Limit to top 50
      totalQuestions: questions.length,
      lowConfidenceQuestions,
      lowRatedQuestions,
      problematicCategories,
      knowledgeGaps,
    };
  }

  private async processEscalatedConversation(
    conversation: Conversation,
  ): Promise<EscalatedConversationDto> {
    // Get conversation messages for analysis
    const messages = await this.messageRepository.find({
      where: { conversationId: conversation.id },
      order: { createdAt: 'DESC' },
      take: 10,
    });

    const lastMessage = messages[0]?.content || 'No messages found';

    // Calculate average confidence
    const aiMessages = messages.filter(
      (m) => m.type === MessageType.AI_RESPONSE && m.confidenceScore !== null,
    );
    const avgConfidence =
      aiMessages.length > 0
        ? aiMessages.reduce((sum, m) => sum + (m.confidenceScore || 0), 0) /
          aiMessages.length
        : 0;

    // Determine escalation reason and priority
    const { reason, priority } = this.analyzeEscalationContext(
      messages,
      avgConfidence,
    );

    return {
      conversationId: conversation.id,
      studentId: conversation.student.id,
      studentName:
        conversation.student.studentProfile?.name || 'Unknown Student',
      studentEmail: conversation.student.email,
      title: conversation.title,
      escalationReason: reason,
      priority,
      escalatedAt: conversation.updatedAt,
      lastMessage:
        lastMessage.substring(0, 200) + (lastMessage.length > 200 ? '...' : ''),
      messageCount: messages.length,
      averageConfidence: Number(avgConfidence.toFixed(3)),
      projectId: conversation.projectId || undefined,
      projectTitle: conversation.project?.title,
      suggestedActions: this.getSuggestedSupervisorActions(
        reason,
        priority,
        avgConfidence,
      ),
    };
  }

  private normalizeQuestion(question: string): string {
    // Simple normalization - in production, you might use NLP techniques
    return question
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(
        /\b(what|how|when|where|why|can|could|should|would|is|are|do|does)\b/g,
        '',
      )
      .trim()
      .substring(0, 100);
  }

  private getSuggestedAction(confidence: number, rating: number): string {
    if (confidence < 0.3 && rating < 2.0) {
      return 'Update knowledge base and improve AI training data';
    } else if (confidence < 0.3) {
      return 'Add more specific content to knowledge base';
    } else if (rating < 2.0) {
      return 'Review and improve response templates';
    }
    return 'Monitor for improvement';
  }

  private analyzeEscalationContext(
    messages: ConversationMessage[],
    avgConfidence: number,
  ): { reason: string; priority: 'low' | 'medium' | 'high' | 'urgent' } {
    const lowConfidenceCount = messages.filter(
      (m) => m.confidenceScore !== null && m.confidenceScore < 0.3,
    ).length;

    const lowRatingCount = messages.filter(
      (m) => m.averageRating > 0 && m.averageRating < 2.0,
    ).length;

    let reason = 'General assistance needed';
    let priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium';

    if (lowConfidenceCount >= 3) {
      reason = 'Multiple low-confidence AI responses';
      priority = 'high';
    } else if (lowRatingCount >= 2) {
      reason = 'Poor response quality ratings';
      priority = 'high';
    } else if (avgConfidence < 0.4) {
      reason = 'Consistently low AI confidence';
      priority = 'medium';
    } else if (messages.length > 20) {
      reason = 'Extended conversation without resolution';
      priority = 'high';
    }

    // Check for urgent keywords in recent messages
    const recentContent = messages
      .slice(0, 3)
      .map((m) => m.content.toLowerCase())
      .join(' ');
    if (
      recentContent.includes('urgent') ||
      recentContent.includes('deadline') ||
      recentContent.includes('emergency')
    ) {
      priority = 'urgent';
    }

    return { reason, priority };
  }

  private getSuggestedSupervisorActions(
    reason: string,
    priority: 'low' | 'medium' | 'high' | 'urgent',
    avgConfidence: number,
  ): string[] {
    const actions: string[] = [];

    if (priority === 'urgent') {
      actions.push('Contact student immediately');
    }

    if (reason.includes('low-confidence') || avgConfidence < 0.4) {
      actions.push('Review conversation context');
      actions.push('Provide direct guidance on specific questions');
    }

    if (reason.includes('quality')) {
      actions.push('Clarify student questions');
      actions.push('Provide alternative resources');
    }

    if (reason.includes('extended')) {
      actions.push('Schedule one-on-one meeting');
      actions.push('Break down complex problems');
    }

    actions.push('Update student progress notes');

    return actions;
  }

  private applyFiltersToConversationQuery(
    query: SelectQueryBuilder<Conversation>,
    filters: SupervisorMonitoringFiltersDto,
  ): SelectQueryBuilder<Conversation> {
    if (filters.studentId) {
      query = query.andWhere('conversation.studentId = :studentId', {
        studentId: filters.studentId,
      });
    }

    if (filters.projectId) {
      query = query.andWhere('conversation.projectId = :projectId', {
        projectId: filters.projectId,
      });
    }

    if (filters.startDate) {
      query = query.andWhere('conversation.createdAt >= :startDate', {
        startDate: filters.startDate,
      });
    }

    if (filters.endDate) {
      query = query.andWhere('conversation.createdAt <= :endDate', {
        endDate: filters.endDate,
      });
    }

    if (filters.status) {
      query = query.andWhere('conversation.status = :status', {
        status: filters.status,
      });
    }

    if (filters.escalatedOnly) {
      query = query.andWhere('conversation.status = :escalatedStatus', {
        escalatedStatus: ConversationStatus.ESCALATED,
      });
    }

    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    if (filters.offset) {
      query = query.offset(filters.offset);
    }

    return query;
  }

  private applyFiltersToMessageQuery(
    query: SelectQueryBuilder<ConversationMessage>,
    filters: SupervisorMonitoringFiltersDto,
  ): SelectQueryBuilder<ConversationMessage> {
    if (filters.studentId) {
      query = query.andWhere('conversation.studentId = :studentId', {
        studentId: filters.studentId,
      });
    }

    if (filters.projectId) {
      query = query.andWhere('conversation.projectId = :projectId', {
        projectId: filters.projectId,
      });
    }

    if (filters.startDate) {
      query = query.andWhere('message.createdAt >= :startDate', {
        startDate: filters.startDate,
      });
    }

    if (filters.endDate) {
      query = query.andWhere('message.createdAt <= :endDate', {
        endDate: filters.endDate,
      });
    }

    if (filters.minConfidence !== undefined) {
      query = query.andWhere('message.confidenceScore >= :minConfidence', {
        minConfidence: filters.minConfidence,
      });
    }

    if (filters.maxConfidence !== undefined) {
      query = query.andWhere('message.confidenceScore <= :maxConfidence', {
        maxConfidence: filters.maxConfidence,
      });
    }

    if (filters.lowRatedOnly) {
      query = query.andWhere('message.averageRating < :lowRating', {
        lowRating: 3.0,
      });
    }

    return query;
  }
}
