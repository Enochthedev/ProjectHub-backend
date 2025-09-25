import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThan, LessThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';

import { Conversation } from '../entities/conversation.entity';
import { ConversationMessage } from '../entities/conversation-message.entity';
import { KnowledgeBaseEntry } from '../entities/knowledge-base-entry.entity';
import { ResponseTemplate } from '../entities/response-template.entity';
import { MessageRating } from '../entities/message-rating.entity';
import { AIApiUsage } from '../entities/ai-api-usage.entity';
import { User } from '../entities/user.entity';
import { Project } from '../entities/project.entity';
import { ConversationStatus } from '../common/enums';

export interface ConversationAnalytics {
  totalConversations: number;
  activeConversations: number;
  archivedConversations: number;
  escalatedConversations: number;
  averageMessagesPerConversation: number;
  averageConversationDuration: number;
  conversationsByLanguage: Record<string, number>;
  conversationsByProject: Array<{
    projectId: string;
    projectTitle: string;
    count: number;
  }>;
  conversationTrends: Array<{
    date: string;
    count: number;
    type: 'created' | 'archived' | 'escalated';
  }>;
}

export interface MessageAnalytics {
  totalMessages: number;
  userMessages: number;
  aiMessages: number;
  templateMessages: number;
  systemMessages: number;
  averageConfidenceScore: number;
  lowConfidenceMessages: number;
  bookmarkedMessages: number;
  ratedMessages: number;
  averageRating: number;
  messagesByHour: Array<{ hour: number; count: number }>;
  messagesByDay: Array<{ day: string; count: number }>;
}

export interface QualityAnalytics {
  responseQuality: {
    highConfidence: number; // > 0.8
    mediumConfidence: number; // 0.5 - 0.8
    lowConfidence: number; // < 0.5
    averageConfidence: number;
  };
  userSatisfaction: {
    averageRating: number;
    ratingDistribution: Record<number, number>;
    totalRatings: number;
    positiveRatings: number; // >= 4
    negativeRatings: number; // <= 2
  };
  fallbackUsage: {
    totalFallbacks: number;
    templateFallbacks: number;
    knowledgeBaseFallbacks: number;
    defaultFallbacks: number;
    fallbackRate: number;
  };
  escalationMetrics: {
    totalEscalations: number;
    escalationRate: number;
    escalationReasons: Record<string, number>;
    averageTimeToEscalation: number;
  };
}

export interface UsageAnalytics {
  activeUsers: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  userEngagement: {
    averageSessionDuration: number;
    averageQuestionsPerSession: number;
    returnUserRate: number;
    newUserRate: number;
  };
  peakUsageTimes: Array<{ hour: number; dayOfWeek: number; usage: number }>;
  geographicDistribution: Record<string, number>;
  deviceTypes: Record<string, number>;
}

export interface PerformanceAnalytics {
  responseTime: {
    average: number;
    median: number;
    p95: number;
    p99: number;
  };
  throughput: {
    requestsPerSecond: number;
    requestsPerMinute: number;
    requestsPerHour: number;
  };
  errorRates: {
    totalErrors: number;
    errorRate: number;
    errorsByType: Record<string, number>;
    criticalErrors: number;
  };
  resourceUtilization: {
    aiApiCalls: number;
    tokenUsage: number;
    cacheHitRate: number;
    databaseQueries: number;
  };
}

export interface ContentAnalytics {
  knowledgeBase: {
    totalEntries: number;
    activeEntries: number;
    entriesByCategory: Record<string, number>;
    entriesByLanguage: Record<string, number>;
    mostUsedEntries: Array<{ id: string; title: string; usageCount: number }>;
    leastUsedEntries: Array<{ id: string; title: string; usageCount: number }>;
    averageRating: number;
  };
  templates: {
    totalTemplates: number;
    activeTemplates: number;
    templatesByCategory: Record<string, number>;
    templatesByLanguage: Record<string, number>;
    mostUsedTemplates: Array<{ id: string; name: string; usageCount: number }>;
    templateEffectiveness: Record<string, number>;
  };
  contentGaps: Array<{
    category: string;
    missingTopics: string[];
    requestCount: number;
    priority: 'high' | 'medium' | 'low';
  }>;
}

export interface ComprehensiveAnalytics {
  period: {
    startDate: Date;
    endDate: Date;
    duration: string;
  };
  conversations: ConversationAnalytics;
  messages: MessageAnalytics;
  quality: QualityAnalytics;
  usage: UsageAnalytics;
  performance: PerformanceAnalytics;
  content: ContentAnalytics;
  insights: Array<{
    type: 'trend' | 'anomaly' | 'recommendation' | 'alert';
    severity: 'info' | 'warning' | 'critical';
    title: string;
    description: string;
    data: any;
    actionable: boolean;
    recommendations?: string[];
  }>;
  generatedAt: Date;
}

@Injectable()
export class AIAssistantAnalyticsService {
  private readonly logger = new Logger(AIAssistantAnalyticsService.name);

  constructor(
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
    @InjectRepository(ConversationMessage)
    private readonly messageRepository: Repository<ConversationMessage>,
    @InjectRepository(KnowledgeBaseEntry)
    private readonly knowledgeRepository: Repository<KnowledgeBaseEntry>,
    @InjectRepository(ResponseTemplate)
    private readonly templateRepository: Repository<ResponseTemplate>,
    @InjectRepository(MessageRating)
    private readonly ratingRepository: Repository<MessageRating>,
    @InjectRepository(AIApiUsage)
    private readonly apiUsageRepository: Repository<AIApiUsage>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Generate comprehensive analytics for a given period
   */
  async generateComprehensiveAnalytics(
    startDate: Date,
    endDate: Date,
  ): Promise<ComprehensiveAnalytics> {
    this.logger.log(
      `Generating comprehensive analytics from ${startDate.toISOString()} to ${endDate.toISOString()}`,
    );

    const [conversations, messages, quality, usage, performance, content] =
      await Promise.all([
        this.getConversationAnalytics(startDate, endDate),
        this.getMessageAnalytics(startDate, endDate),
        this.getQualityAnalytics(startDate, endDate),
        this.getUsageAnalytics(startDate, endDate),
        this.getPerformanceAnalytics(startDate, endDate),
        this.getContentAnalytics(startDate, endDate),
      ]);

    const insights = await this.generateInsights({
      conversations,
      messages,
      quality,
      usage,
      performance,
      content,
    });

    return {
      period: {
        startDate,
        endDate,
        duration: this.formatDuration(endDate.getTime() - startDate.getTime()),
      },
      conversations,
      messages,
      quality,
      usage,
      performance,
      content,
      insights,
      generatedAt: new Date(),
    };
  }

  /**
   * Get conversation analytics
   */
  async getConversationAnalytics(
    startDate: Date,
    endDate: Date,
  ): Promise<ConversationAnalytics> {
    const conversations = await this.conversationRepository
      .createQueryBuilder('conversation')
      .leftJoinAndSelect('conversation.messages', 'message')
      .leftJoinAndSelect('conversation.student', 'student')
      .where('conversation.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .getMany();

    const totalConversations = conversations.length;
    const activeConversations = conversations.filter(
      (c) => c.status === 'active',
    ).length;
    const archivedConversations = conversations.filter(
      (c) => c.status === 'archived',
    ).length;
    const escalatedConversations = conversations.filter(
      (c) => c.status === 'escalated',
    ).length;

    const averageMessagesPerConversation =
      totalConversations > 0
        ? conversations.reduce((sum, c) => sum + (c.messages?.length || 0), 0) /
          totalConversations
        : 0;

    const conversationDurations = conversations
      .filter((c) => c.lastMessageAt)
      .map((c) => c.lastMessageAt!.getTime() - c.createdAt.getTime());

    const averageConversationDuration =
      conversationDurations.length > 0
        ? conversationDurations.reduce((sum, d) => sum + d, 0) /
          conversationDurations.length
        : 0;

    // Group by language
    const conversationsByLanguage: Record<string, number> = {};
    conversations.forEach((c) => {
      const lang = c.language || 'en';
      conversationsByLanguage[lang] = (conversationsByLanguage[lang] || 0) + 1;
    });

    // Group by project
    const projectCounts = new Map<string, { title: string; count: number }>();
    conversations.forEach((c) => {
      if (c.projectId) {
        const existing = projectCounts.get(c.projectId);
        if (existing) {
          existing.count++;
        } else {
          projectCounts.set(c.projectId, {
            title: 'Unknown Project',
            count: 1,
          });
        }
      }
    });

    const conversationsByProject = Array.from(projectCounts.entries()).map(
      ([projectId, data]) => ({
        projectId,
        projectTitle: data.title,
        count: data.count,
      }),
    );

    // Generate trends (daily counts)
    const conversationTrends = await this.generateConversationTrends(
      startDate,
      endDate,
    );

    return {
      totalConversations,
      activeConversations,
      archivedConversations,
      escalatedConversations,
      averageMessagesPerConversation,
      averageConversationDuration,
      conversationsByLanguage,
      conversationsByProject,
      conversationTrends,
    };
  }

  /**
   * Get message analytics
   */
  async getMessageAnalytics(
    startDate: Date,
    endDate: Date,
  ): Promise<MessageAnalytics> {
    const messages = await this.messageRepository
      .createQueryBuilder('message')
      .where('message.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .getMany();

    const totalMessages = messages.length;
    const userMessages = messages.filter((m) => m.type === 'user_query').length;
    const aiMessages = messages.filter((m) => m.type === 'ai_response').length;
    const templateMessages = messages.filter(
      (m) => m.type === 'template_response',
    ).length;
    const systemMessages = messages.filter(
      (m) => m.type === 'system_message',
    ).length;

    const confidenceScores = messages
      .filter((m) => m.confidenceScore !== null)
      .map((m) => m.confidenceScore!);

    const averageConfidenceScore =
      confidenceScores.length > 0
        ? confidenceScores.reduce((sum, score) => sum + score, 0) /
          confidenceScores.length
        : 0;

    const lowConfidenceMessages = messages.filter(
      (m) => m.confidenceScore !== null && m.confidenceScore < 0.5,
    ).length;

    const bookmarkedMessages = messages.filter((m) => m.isBookmarked).length;

    // Get rating data
    const ratings = await this.ratingRepository
      .createQueryBuilder('rating')
      .innerJoin('rating.message', 'message')
      .where('message.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .getMany();

    const ratedMessages = ratings.length;
    const averageRating =
      ratings.length > 0
        ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
        : 0;

    // Generate hourly and daily distributions
    const messagesByHour = this.generateHourlyDistribution(messages);
    const messagesByDay = this.generateDailyDistribution(
      messages,
      startDate,
      endDate,
    );

    return {
      totalMessages,
      userMessages,
      aiMessages,
      templateMessages,
      systemMessages,
      averageConfidenceScore,
      lowConfidenceMessages,
      bookmarkedMessages,
      ratedMessages,
      averageRating,
      messagesByHour,
      messagesByDay,
    };
  }

  /**
   * Get quality analytics
   */
  async getQualityAnalytics(
    startDate: Date,
    endDate: Date,
  ): Promise<QualityAnalytics> {
    const messages = await this.messageRepository
      .createQueryBuilder('message')
      .leftJoinAndSelect('message.ratings', 'rating')
      .where('message.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .getMany();

    // Response quality analysis
    const messagesWithConfidence = messages.filter(
      (m) => m.confidenceScore !== null,
    );
    const highConfidence = messagesWithConfidence.filter(
      (m) => m.confidenceScore! > 0.8,
    ).length;
    const mediumConfidence = messagesWithConfidence.filter(
      (m) => m.confidenceScore! >= 0.5 && m.confidenceScore! <= 0.8,
    ).length;
    const lowConfidence = messagesWithConfidence.filter(
      (m) => m.confidenceScore! < 0.5,
    ).length;
    const averageConfidence =
      messagesWithConfidence.length > 0
        ? messagesWithConfidence.reduce(
            (sum, m) => sum + m.confidenceScore!,
            0,
          ) / messagesWithConfidence.length
        : 0;

    // User satisfaction analysis
    const allRatings = await this.ratingRepository
      .createQueryBuilder('rating')
      .innerJoin('rating.message', 'message')
      .where('message.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .getMany();

    const totalRatings = allRatings.length;
    const averageRating =
      totalRatings > 0
        ? allRatings.reduce((sum, r) => sum + r.rating, 0) / totalRatings
        : 0;

    const ratingDistribution: Record<number, number> = {};
    for (let i = 1; i <= 5; i++) {
      ratingDistribution[i] = allRatings.filter((r) => r.rating === i).length;
    }

    const positiveRatings = allRatings.filter((r) => r.rating >= 4).length;
    const negativeRatings = allRatings.filter((r) => r.rating <= 2).length;

    // Fallback usage analysis
    const totalMessages = messages.length;
    const aiResponses = messages.filter((m) => m.type === 'ai_response').length;
    const templateResponses = messages.filter(
      (m) => m.type === 'template_response',
    ).length;
    const totalFallbacks = templateResponses;
    const fallbackRate = totalMessages > 0 ? totalFallbacks / totalMessages : 0;

    // Escalation metrics
    const escalatedConversations = await this.conversationRepository
      .createQueryBuilder('conversation')
      .where('conversation.status = :status', { status: 'escalated' })
      .andWhere('conversation.updatedAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .getMany();

    const totalEscalations = escalatedConversations.length;
    const totalConversations = await this.conversationRepository
      .createQueryBuilder('conversation')
      .where('conversation.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .getCount();

    const escalationRate =
      totalConversations > 0 ? totalEscalations / totalConversations : 0;

    return {
      responseQuality: {
        highConfidence,
        mediumConfidence,
        lowConfidence,
        averageConfidence,
      },
      userSatisfaction: {
        averageRating,
        ratingDistribution,
        totalRatings,
        positiveRatings,
        negativeRatings,
      },
      fallbackUsage: {
        totalFallbacks,
        templateFallbacks: templateResponses,
        knowledgeBaseFallbacks: 0, // Would need additional tracking
        defaultFallbacks: 0, // Would need additional tracking
        fallbackRate,
      },
      escalationMetrics: {
        totalEscalations,
        escalationRate,
        escalationReasons: {}, // Would need additional tracking
        averageTimeToEscalation: 0, // Would need additional tracking
      },
    };
  }

  /**
   * Get usage analytics
   */
  async getUsageAnalytics(
    startDate: Date,
    endDate: Date,
  ): Promise<UsageAnalytics> {
    // Get unique users by period
    const dailyUsers = await this.getUsersInPeriod(
      new Date(endDate.getTime() - 24 * 60 * 60 * 1000),
      endDate,
    );
    const weeklyUsers = await this.getUsersInPeriod(
      new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000),
      endDate,
    );
    const monthlyUsers = await this.getUsersInPeriod(
      new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000),
      endDate,
    );

    // Calculate engagement metrics
    const conversations = await this.conversationRepository
      .createQueryBuilder('conversation')
      .leftJoinAndSelect('conversation.messages', 'message')
      .where('conversation.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .getMany();

    const sessionDurations = conversations
      .filter((c) => c.lastMessageAt)
      .map((c) => c.lastMessageAt!.getTime() - c.createdAt.getTime());

    const averageSessionDuration =
      sessionDurations.length > 0
        ? sessionDurations.reduce((sum, d) => sum + d, 0) /
          sessionDurations.length
        : 0;

    const totalQuestions = conversations.reduce(
      (sum, c) =>
        sum + (c.messages?.filter((m) => m.type === 'user_query').length || 0),
      0,
    );
    const averageQuestionsPerSession =
      conversations.length > 0 ? totalQuestions / conversations.length : 0;

    // Peak usage analysis
    const peakUsageTimes = await this.calculatePeakUsageTimes(
      startDate,
      endDate,
    );

    return {
      activeUsers: {
        daily: dailyUsers.length,
        weekly: weeklyUsers.length,
        monthly: monthlyUsers.length,
      },
      userEngagement: {
        averageSessionDuration,
        averageQuestionsPerSession,
        returnUserRate: 0, // Would need session tracking
        newUserRate: 0, // Would need user registration tracking
      },
      peakUsageTimes,
      geographicDistribution: {}, // Would need IP geolocation
      deviceTypes: {}, // Would need user agent tracking
    };
  }

  /**
   * Get performance analytics
   */
  async getPerformanceAnalytics(
    startDate: Date,
    endDate: Date,
  ): Promise<PerformanceAnalytics> {
    const apiUsage = await this.apiUsageRepository
      .createQueryBuilder('usage')
      .where('usage.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .getMany();

    const responseTimes = apiUsage.map((u) => u.responseTimeMs);
    responseTimes.sort((a, b) => a - b);

    const average =
      responseTimes.length > 0
        ? responseTimes.reduce((sum, time) => sum + time, 0) /
          responseTimes.length
        : 0;

    const median =
      responseTimes.length > 0
        ? responseTimes[Math.floor(responseTimes.length / 2)]
        : 0;

    const p95Index = Math.floor(responseTimes.length * 0.95);
    const p99Index = Math.floor(responseTimes.length * 0.99);
    const p95 = responseTimes.length > 0 ? responseTimes[p95Index] : 0;
    const p99 = responseTimes.length > 0 ? responseTimes[p99Index] : 0;

    // Calculate throughput
    const periodMs = endDate.getTime() - startDate.getTime();
    const periodSeconds = periodMs / 1000;
    const periodMinutes = periodSeconds / 60;
    const periodHours = periodMinutes / 60;

    const requestsPerSecond =
      periodSeconds > 0 ? apiUsage.length / periodSeconds : 0;
    const requestsPerMinute =
      periodMinutes > 0 ? apiUsage.length / periodMinutes : 0;
    const requestsPerHour = periodHours > 0 ? apiUsage.length / periodHours : 0;

    // Error analysis
    const errors = apiUsage.filter((u) => !u.success);
    const totalErrors = errors.length;
    const errorRate = apiUsage.length > 0 ? totalErrors / apiUsage.length : 0;

    const errorsByType: Record<string, number> = {};
    errors.forEach((error) => {
      const errorType = error.errorMessage || 'Unknown';
      errorsByType[errorType] = (errorsByType[errorType] || 0) + 1;
    });

    // Resource utilization
    const totalTokens = apiUsage.reduce((sum, u) => sum + u.tokensUsed, 0);

    return {
      responseTime: {
        average,
        median,
        p95,
        p99,
      },
      throughput: {
        requestsPerSecond,
        requestsPerMinute,
        requestsPerHour,
      },
      errorRates: {
        totalErrors,
        errorRate,
        errorsByType,
        criticalErrors: 0, // Would need severity classification
      },
      resourceUtilization: {
        aiApiCalls: apiUsage.length,
        tokenUsage: totalTokens,
        cacheHitRate: 0, // Would need cache metrics
        databaseQueries: 0, // Would need query tracking
      },
    };
  }

  /**
   * Get content analytics
   */
  async getContentAnalytics(
    startDate: Date,
    endDate: Date,
  ): Promise<ContentAnalytics> {
    const knowledgeEntries = await this.knowledgeRepository.find({
      where: { isActive: true },
    });

    const templates = await this.templateRepository.find({
      where: { isActive: true },
    });

    // Knowledge base analytics
    const entriesByCategory: Record<string, number> = {};
    const entriesByLanguage: Record<string, number> = {};

    knowledgeEntries.forEach((entry) => {
      entriesByCategory[entry.category] =
        (entriesByCategory[entry.category] || 0) + 1;
      entriesByLanguage[entry.language] =
        (entriesByLanguage[entry.language] || 0) + 1;
    });

    const mostUsedEntries = knowledgeEntries
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 10)
      .map((entry) => ({
        id: entry.id,
        title: entry.title,
        usageCount: entry.usageCount,
      }));

    const leastUsedEntries = knowledgeEntries
      .sort((a, b) => a.usageCount - b.usageCount)
      .slice(0, 10)
      .map((entry) => ({
        id: entry.id,
        title: entry.title,
        usageCount: entry.usageCount,
      }));

    const averageKnowledgeRating =
      knowledgeEntries.length > 0
        ? knowledgeEntries.reduce(
            (sum, entry) => sum + entry.averageRating,
            0,
          ) / knowledgeEntries.length
        : 0;

    // Template analytics
    const templatesByCategory: Record<string, number> = {};
    const templatesByLanguage: Record<string, number> = {};

    templates.forEach((template) => {
      templatesByCategory[template.category] =
        (templatesByCategory[template.category] || 0) + 1;
      templatesByLanguage[template.language] =
        (templatesByLanguage[template.language] || 0) + 1;
    });

    const mostUsedTemplates = templates
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 10)
      .map((template) => ({
        id: template.id,
        name: template.name,
        usageCount: template.usageCount,
      }));

    return {
      knowledgeBase: {
        totalEntries: knowledgeEntries.length,
        activeEntries: knowledgeEntries.filter((e) => e.isActive).length,
        entriesByCategory,
        entriesByLanguage,
        mostUsedEntries,
        leastUsedEntries,
        averageRating: averageKnowledgeRating,
      },
      templates: {
        totalTemplates: templates.length,
        activeTemplates: templates.filter((t) => t.isActive).length,
        templatesByCategory,
        templatesByLanguage,
        mostUsedTemplates,
        templateEffectiveness: {}, // Would need effectiveness tracking
      },
      contentGaps: [], // Would need gap analysis
    };
  }

  /**
   * Generate insights from analytics data
   */
  private async generateInsights(
    analytics: Partial<ComprehensiveAnalytics>,
  ): Promise<ComprehensiveAnalytics['insights']> {
    const insights: ComprehensiveAnalytics['insights'] = [];

    // Quality insights
    if (analytics.quality) {
      if (analytics.quality.responseQuality.averageConfidence < 0.6) {
        insights.push({
          type: 'alert',
          severity: 'warning',
          title: 'Low AI Response Confidence',
          description: `Average confidence score is ${(analytics.quality.responseQuality.averageConfidence * 100).toFixed(1)}%, which is below the recommended threshold of 60%.`,
          data: analytics.quality.responseQuality,
          actionable: true,
          recommendations: [
            'Review and update knowledge base content',
            'Improve AI model training data',
            'Adjust confidence thresholds for fallback responses',
          ],
        });
      }

      if (analytics.quality.userSatisfaction.averageRating < 3.5) {
        insights.push({
          type: 'alert',
          severity: 'critical',
          title: 'Low User Satisfaction',
          description: `Average user rating is ${analytics.quality.userSatisfaction.averageRating.toFixed(1)}/5, indicating user dissatisfaction.`,
          data: analytics.quality.userSatisfaction,
          actionable: true,
          recommendations: [
            'Analyze negative feedback patterns',
            'Improve response quality and relevance',
            'Enhance fallback response templates',
          ],
        });
      }
    }

    // Performance insights
    if (analytics.performance) {
      if (analytics.performance.responseTime.average > 10000) {
        insights.push({
          type: 'alert',
          severity: 'warning',
          title: 'Slow Response Times',
          description: `Average response time is ${(analytics.performance.responseTime.average / 1000).toFixed(1)} seconds, which may impact user experience.`,
          data: analytics.performance.responseTime,
          actionable: true,
          recommendations: [
            'Optimize AI API calls',
            'Implement response caching',
            'Consider load balancing',
          ],
        });
      }

      if (analytics.performance.errorRates.errorRate > 0.05) {
        insights.push({
          type: 'alert',
          severity: 'critical',
          title: 'High Error Rate',
          description: `Error rate is ${(analytics.performance.errorRates.errorRate * 100).toFixed(1)}%, which is above the acceptable threshold of 5%.`,
          data: analytics.performance.errorRates,
          actionable: true,
          recommendations: [
            'Investigate common error patterns',
            'Improve error handling and recovery',
            'Monitor AI service health',
          ],
        });
      }
    }

    // Usage insights
    if (analytics.usage && analytics.conversations) {
      const engagementTrend =
        analytics.conversations.totalConversations > 0 ? 'stable' : 'declining';

      if (engagementTrend === 'declining') {
        insights.push({
          type: 'trend',
          severity: 'warning',
          title: 'Declining User Engagement',
          description:
            'User engagement appears to be declining based on conversation patterns.',
          data: {
            conversations: analytics.conversations,
            usage: analytics.usage,
          },
          actionable: true,
          recommendations: [
            'Analyze user feedback for improvement areas',
            'Enhance AI assistant capabilities',
            'Improve user onboarding and education',
          ],
        });
      }
    }

    return insights;
  }

  /**
   * Helper methods
   */
  private async getUsersInPeriod(
    startDate: Date,
    endDate: Date,
  ): Promise<string[]> {
    const conversations = await this.conversationRepository
      .createQueryBuilder('conversation')
      .select('DISTINCT conversation.studentId', 'studentId')
      .where('conversation.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .getRawMany();

    return conversations.map((c) => c.studentId);
  }

  private async generateConversationTrends(
    startDate: Date,
    endDate: Date,
  ): Promise<ConversationAnalytics['conversationTrends']> {
    // Generate daily trends for the period
    const trends: ConversationAnalytics['conversationTrends'] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dayStart = new Date(currentDate);
      const dayEnd = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000);

      const [created, archived, escalated] = await Promise.all([
        this.conversationRepository.count({
          where: { createdAt: Between(dayStart, dayEnd) },
        }),
        this.conversationRepository.count({
          where: {
            status: ConversationStatus.ARCHIVED,
            updatedAt: Between(dayStart, dayEnd),
          },
        }),
        this.conversationRepository.count({
          where: {
            status: ConversationStatus.ESCALATED,
            updatedAt: Between(dayStart, dayEnd),
          },
        }),
      ]);

      const dateStr = currentDate.toISOString().split('T')[0];
      trends.push(
        { date: dateStr, count: created, type: 'created' },
        { date: dateStr, count: archived, type: 'archived' },
        { date: dateStr, count: escalated, type: 'escalated' },
      );

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return trends;
  }

  private generateHourlyDistribution(
    messages: ConversationMessage[],
  ): MessageAnalytics['messagesByHour'] {
    const hourCounts = new Array(24).fill(0);

    messages.forEach((message) => {
      const hour = message.createdAt.getHours();
      hourCounts[hour]++;
    });

    return hourCounts.map((count, hour) => ({ hour, count }));
  }

  private generateDailyDistribution(
    messages: ConversationMessage[],
    startDate: Date,
    endDate: Date,
  ): MessageAnalytics['messagesByDay'] {
    const dailyCounts = new Map<string, number>();

    // Initialize all days in the period
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      dailyCounts.set(dateStr, 0);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Count messages by day
    messages.forEach((message) => {
      const dateStr = message.createdAt.toISOString().split('T')[0];
      const current = dailyCounts.get(dateStr) || 0;
      dailyCounts.set(dateStr, current + 1);
    });

    return Array.from(dailyCounts.entries()).map(([day, count]) => ({
      day,
      count,
    }));
  }

  private async calculatePeakUsageTimes(
    startDate: Date,
    endDate: Date,
  ): Promise<UsageAnalytics['peakUsageTimes']> {
    const messages = await this.messageRepository
      .createQueryBuilder('message')
      .where('message.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .getMany();

    const usageMap = new Map<string, number>();

    messages.forEach((message) => {
      const hour = message.createdAt.getHours();
      const dayOfWeek = message.createdAt.getDay();
      const key = `${dayOfWeek}-${hour}`;

      usageMap.set(key, (usageMap.get(key) || 0) + 1);
    });

    return Array.from(usageMap.entries()).map(([key, usage]) => {
      const [dayOfWeek, hour] = key.split('-').map(Number);
      return { hour, dayOfWeek, usage };
    });
  }

  private formatDuration(milliseconds: number): string {
    const days = Math.floor(milliseconds / (24 * 60 * 60 * 1000));
    const hours = Math.floor(
      (milliseconds % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000),
    );

    if (days > 0) {
      return `${days} day${days > 1 ? 's' : ''}`;
    } else if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''}`;
    } else {
      return 'Less than 1 hour';
    }
  }

  /**
   * Scheduled analytics generation
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async generateDailyAnalytics(): Promise<void> {
    try {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);

      const analytics = await this.generateComprehensiveAnalytics(
        startDate,
        endDate,
      );

      this.logger.log('Daily analytics generated successfully', {
        period: analytics.period,
        totalConversations: analytics.conversations.totalConversations,
        totalMessages: analytics.messages.totalMessages,
        averageRating: analytics.quality.userSatisfaction.averageRating,
        insights: analytics.insights.length,
      });

      // Here you could store the analytics to a dedicated table or send to external systems
    } catch (error) {
      this.logger.error(
        `Failed to generate daily analytics: ${error.message}`,
        error,
      );
    }
  }

  @Cron(CronExpression.EVERY_WEEK)
  async generateWeeklyAnalytics(): Promise<void> {
    try {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);

      const analytics = await this.generateComprehensiveAnalytics(
        startDate,
        endDate,
      );

      this.logger.log('Weekly analytics generated successfully', {
        period: analytics.period,
        insights: analytics.insights.length,
      });
    } catch (error) {
      this.logger.error(
        `Failed to generate weekly analytics: ${error.message}`,
        error,
      );
    }
  }
}
