import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Conversation } from '../entities/conversation.entity';
import { ConversationMessage } from '../entities/conversation-message.entity';
import { KnowledgeBaseEntry } from '../entities/knowledge-base-entry.entity';
import { ConversationStatus, MessageType, ContentType } from '../common/enums';

export interface ConversationQueryOptions {
  studentId?: string;
  status?: ConversationStatus[];
  projectId?: string;
  language?: string;
  search?: string;
  hasContext?: boolean;
  lastActivityAfter?: Date;
  lastActivityBefore?: Date;
  limit?: number;
  offset?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'lastMessageAt';
  sortOrder?: 'ASC' | 'DESC';
}

export interface MessageQueryOptions {
  conversationIds?: string[];
  type?: MessageType[];
  minConfidence?: number;
  maxConfidence?: number;
  isBookmarked?: boolean;
  hasRating?: boolean;
  minRating?: number;
  search?: string;
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
  offset?: number;
}

export interface KnowledgeSearchOptions {
  query?: string;
  category?: string;
  contentType?: ContentType[];
  language?: string;
  tags?: string[];
  keywords?: string[];
  minUsage?: number;
  minRating?: number;
  createdBy?: string;
  isActive?: boolean;
  limit?: number;
  offset?: number;
  sortBy?: 'relevance' | 'usage' | 'rating' | 'created';
}

export interface QueryPerformanceMetrics {
  queryTime: number;
  resultCount: number;
  indexesUsed: string[];
  cacheHit: boolean;
}

@Injectable()
export class AIQueryOptimizationService {
  constructor(
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
    @InjectRepository(ConversationMessage)
    private readonly messageRepository: Repository<ConversationMessage>,
    @InjectRepository(KnowledgeBaseEntry)
    private readonly knowledgeRepository: Repository<KnowledgeBaseEntry>,
  ) {}

  /**
   * Optimized conversation search with intelligent query building
   */
  async searchConversationsOptimized(
    options: ConversationQueryOptions,
  ): Promise<{
    conversations: Conversation[];
    total: number;
    metrics: QueryPerformanceMetrics;
  }> {
    const startTime = Date.now();

    const queryBuilder = this.conversationRepository
      .createQueryBuilder('conversation')
      .leftJoinAndSelect('conversation.student', 'student')
      .leftJoinAndSelect('conversation.project', 'project');

    // Apply optimized filters
    this.applyConversationFilters(queryBuilder, options);

    // Get total count efficiently
    const totalQuery = queryBuilder.clone();
    const total = await totalQuery.getCount();

    // Apply sorting and pagination
    this.applyConversationSorting(queryBuilder, options);
    this.applyPagination(queryBuilder, options);

    const conversations = await queryBuilder.getMany();

    const queryTime = Date.now() - startTime;

    return {
      conversations,
      total,
      metrics: {
        queryTime,
        resultCount: conversations.length,
        indexesUsed: this.getExpectedIndexes('conversation', options),
        cacheHit: false, // Would be set by caching layer
      },
    };
  }

  /**
   * Optimized message search with context awareness
   */
  async searchMessagesOptimized(options: MessageQueryOptions): Promise<{
    messages: ConversationMessage[];
    total: number;
    metrics: QueryPerformanceMetrics;
  }> {
    const startTime = Date.now();

    const queryBuilder = this.messageRepository
      .createQueryBuilder('message')
      .leftJoinAndSelect('message.conversation', 'conversation')
      .leftJoinAndSelect('conversation.student', 'student');

    // Apply optimized filters
    this.applyMessageFilters(queryBuilder, options);

    // Get total count
    const totalQuery = queryBuilder.clone();
    const total = await totalQuery.getCount();

    // Apply sorting and pagination
    this.applyMessageSorting(queryBuilder, options);
    this.applyPagination(queryBuilder, options);

    const messages = await queryBuilder.getMany();

    const queryTime = Date.now() - startTime;

    return {
      messages,
      total,
      metrics: {
        queryTime,
        resultCount: messages.length,
        indexesUsed: this.getExpectedIndexes('message', options),
        cacheHit: false,
      },
    };
  }

  /**
   * Optimized knowledge base search with full-text search
   */
  async searchKnowledgeOptimized(options: KnowledgeSearchOptions): Promise<{
    entries: KnowledgeBaseEntry[];
    total: number;
    metrics: QueryPerformanceMetrics;
  }> {
    const startTime = Date.now();

    const queryBuilder = this.knowledgeRepository
      .createQueryBuilder('knowledge')
      .leftJoinAndSelect('knowledge.createdBy', 'creator');

    // Apply full-text search if query provided
    if (options.query) {
      this.applyFullTextSearch(queryBuilder, options.query);
    }

    // Apply other filters
    this.applyKnowledgeFilters(queryBuilder, options);

    // Get total count
    const totalQuery = queryBuilder.clone();
    const total = await totalQuery.getCount();

    // Apply sorting and pagination
    this.applyKnowledgeSorting(queryBuilder, options);
    this.applyPagination(queryBuilder, options);

    const entries = await queryBuilder.getMany();

    const queryTime = Date.now() - startTime;

    return {
      entries,
      total,
      metrics: {
        queryTime,
        resultCount: entries.length,
        indexesUsed: this.getExpectedIndexes('knowledge', options),
        cacheHit: false,
      },
    };
  }

  /**
   * Get conversation context building query optimized for performance
   */
  async getConversationContextOptimized(conversationId: string): Promise<{
    conversation: Conversation;
    recentMessages: ConversationMessage[];
    metrics: QueryPerformanceMetrics;
  }> {
    const startTime = Date.now();

    // Use optimized query to get conversation with limited recent messages
    const conversation = await this.conversationRepository
      .createQueryBuilder('conversation')
      .leftJoinAndSelect('conversation.student', 'student')
      .leftJoinAndSelect('conversation.project', 'project')
      .where('conversation.id = :conversationId', { conversationId })
      .getOne();

    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`);
    }

    // Get recent messages efficiently (last 10 messages)
    const recentMessages = await this.messageRepository
      .createQueryBuilder('message')
      .where('message.conversationId = :conversationId', { conversationId })
      .orderBy('message.createdAt', 'DESC')
      .limit(10)
      .getMany();

    const queryTime = Date.now() - startTime;

    return {
      conversation,
      recentMessages: recentMessages.reverse(), // Reverse to get chronological order
      metrics: {
        queryTime,
        resultCount: recentMessages.length + 1,
        indexesUsed: ['idx_messages_conversation_created'],
        cacheHit: false,
      },
    };
  }

  /**
   * Get AI response analytics with optimized aggregation
   */
  async getAIResponseAnalytics(
    studentId?: string,
    dateFrom?: Date,
    dateTo?: Date,
  ): Promise<{
    totalResponses: number;
    averageConfidence: number;
    averageRating: number;
    responsesByType: Record<string, number>;
    confidenceDistribution: Record<string, number>;
    metrics: QueryPerformanceMetrics;
  }> {
    const startTime = Date.now();

    const queryBuilder = this.messageRepository
      .createQueryBuilder('message')
      .leftJoin('message.conversation', 'conversation')
      .where('message.type = :type', { type: MessageType.AI_RESPONSE });

    if (studentId) {
      queryBuilder.andWhere('conversation.studentId = :studentId', {
        studentId,
      });
    }

    if (dateFrom) {
      queryBuilder.andWhere('message.createdAt >= :dateFrom', { dateFrom });
    }

    if (dateTo) {
      queryBuilder.andWhere('message.createdAt <= :dateTo', { dateTo });
    }

    // Get aggregated data efficiently
    const [totalResponses, avgConfidence, avgRating] = await Promise.all([
      queryBuilder.getCount(),
      queryBuilder
        .select('AVG(message.confidenceScore)', 'avg')
        .where('message.confidenceScore IS NOT NULL')
        .getRawOne()
        .then((result) => parseFloat(result?.avg || '0')),
      queryBuilder
        .select('AVG(message.averageRating)', 'avg')
        .where('message.averageRating > 0')
        .getRawOne()
        .then((result) => parseFloat(result?.avg || '0')),
    ]);

    // Get response type distribution
    const responsesByType = await queryBuilder
      .select('message.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .groupBy('message.type')
      .getRawMany()
      .then((results) =>
        results.reduce(
          (acc, row) => {
            acc[row.type] = parseInt(row.count);
            return acc;
          },
          {} as Record<string, number>,
        ),
      );

    // Get confidence distribution
    const confidenceDistribution = await this.messageRepository
      .createQueryBuilder('message')
      .select(
        `
        CASE 
          WHEN confidence_score >= 0.8 THEN 'high'
          WHEN confidence_score >= 0.5 THEN 'medium'
          WHEN confidence_score >= 0.3 THEN 'low'
          ELSE 'very_low'
        END as confidence_range
      `,
      )
      .addSelect('COUNT(*)', 'count')
      .where('message.type = :type AND message.confidenceScore IS NOT NULL', {
        type: MessageType.AI_RESPONSE,
      })
      .groupBy('confidence_range')
      .getRawMany()
      .then((results) =>
        results.reduce(
          (acc, row) => {
            acc[row.confidence_range] = parseInt(row.count);
            return acc;
          },
          {} as Record<string, number>,
        ),
      );

    const queryTime = Date.now() - startTime;

    return {
      totalResponses,
      averageConfidence: avgConfidence,
      averageRating: avgRating,
      responsesByType,
      confidenceDistribution,
      metrics: {
        queryTime,
        resultCount: totalResponses,
        indexesUsed: [
          'idx_messages_ai_analysis',
          'idx_messages_type_confidence',
        ],
        cacheHit: false,
      },
    };
  }

  /**
   * Apply conversation filters with index optimization
   */
  private applyConversationFilters(
    queryBuilder: SelectQueryBuilder<Conversation>,
    options: ConversationQueryOptions,
  ): void {
    if (options.studentId) {
      queryBuilder.andWhere('conversation.studentId = :studentId', {
        studentId: options.studentId,
      });
    }

    if (options.status && options.status.length > 0) {
      queryBuilder.andWhere('conversation.status IN (:...statuses)', {
        statuses: options.status,
      });
    }

    if (options.projectId) {
      queryBuilder.andWhere('conversation.projectId = :projectId', {
        projectId: options.projectId,
      });
    }

    if (options.language) {
      queryBuilder.andWhere('conversation.language = :language', {
        language: options.language,
      });
    }

    if (options.hasContext !== undefined) {
      if (options.hasContext) {
        queryBuilder.andWhere('conversation.context IS NOT NULL');
      } else {
        queryBuilder.andWhere('conversation.context IS NULL');
      }
    }

    if (options.lastActivityAfter) {
      queryBuilder.andWhere(
        'conversation.lastMessageAt >= :lastActivityAfter',
        {
          lastActivityAfter: options.lastActivityAfter,
        },
      );
    }

    if (options.lastActivityBefore) {
      queryBuilder.andWhere(
        'conversation.lastMessageAt <= :lastActivityBefore',
        {
          lastActivityBefore: options.lastActivityBefore,
        },
      );
    }

    if (options.search) {
      queryBuilder.andWhere(
        '(conversation.title ILIKE :search OR conversation.context::text ILIKE :search)',
        { search: `%${options.search}%` },
      );
    }
  }

  /**
   * Apply message filters with index optimization
   */
  private applyMessageFilters(
    queryBuilder: SelectQueryBuilder<ConversationMessage>,
    options: MessageQueryOptions,
  ): void {
    if (options.conversationIds && options.conversationIds.length > 0) {
      queryBuilder.andWhere('message.conversationId IN (:...conversationIds)', {
        conversationIds: options.conversationIds,
      });
    }

    if (options.type && options.type.length > 0) {
      queryBuilder.andWhere('message.type IN (:...types)', {
        types: options.type,
      });
    }

    if (options.minConfidence !== undefined) {
      queryBuilder.andWhere('message.confidenceScore >= :minConfidence', {
        minConfidence: options.minConfidence,
      });
    }

    if (options.maxConfidence !== undefined) {
      queryBuilder.andWhere('message.confidenceScore <= :maxConfidence', {
        maxConfidence: options.maxConfidence,
      });
    }

    if (options.isBookmarked !== undefined) {
      queryBuilder.andWhere('message.isBookmarked = :isBookmarked', {
        isBookmarked: options.isBookmarked,
      });
    }

    if (options.hasRating !== undefined) {
      if (options.hasRating) {
        queryBuilder.andWhere('message.ratingCount > 0');
      } else {
        queryBuilder.andWhere('message.ratingCount = 0');
      }
    }

    if (options.minRating !== undefined) {
      queryBuilder.andWhere('message.averageRating >= :minRating', {
        minRating: options.minRating,
      });
    }

    if (options.dateFrom) {
      queryBuilder.andWhere('message.createdAt >= :dateFrom', {
        dateFrom: options.dateFrom,
      });
    }

    if (options.dateTo) {
      queryBuilder.andWhere('message.createdAt <= :dateTo', {
        dateTo: options.dateTo,
      });
    }

    if (options.search) {
      queryBuilder.andWhere(
        "to_tsvector('english', message.content) @@ plainto_tsquery('english', :search)",
        { search: options.search },
      );
    }
  }

  /**
   * Apply knowledge base filters with index optimization
   */
  private applyKnowledgeFilters(
    queryBuilder: SelectQueryBuilder<KnowledgeBaseEntry>,
    options: KnowledgeSearchOptions,
  ): void {
    // Always filter by active status for performance
    queryBuilder.andWhere('knowledge.isActive = :isActive', {
      isActive: options.isActive !== false,
    });

    if (options.category) {
      queryBuilder.andWhere('knowledge.category = :category', {
        category: options.category,
      });
    }

    if (options.contentType && options.contentType.length > 0) {
      queryBuilder.andWhere('knowledge.contentType IN (:...contentTypes)', {
        contentTypes: options.contentType,
      });
    }

    if (options.language) {
      queryBuilder.andWhere('knowledge.language = :language', {
        language: options.language,
      });
    }

    if (options.tags && options.tags.length > 0) {
      queryBuilder.andWhere('knowledge.tags && :tags', {
        tags: options.tags,
      });
    }

    if (options.keywords && options.keywords.length > 0) {
      queryBuilder.andWhere('knowledge.keywords && :keywords', {
        keywords: options.keywords,
      });
    }

    if (options.minUsage !== undefined) {
      queryBuilder.andWhere('knowledge.usageCount >= :minUsage', {
        minUsage: options.minUsage,
      });
    }

    if (options.minRating !== undefined) {
      queryBuilder.andWhere('knowledge.averageRating >= :minRating', {
        minRating: options.minRating,
      });
    }

    if (options.createdBy) {
      queryBuilder.andWhere('knowledge.createdById = :createdBy', {
        createdBy: options.createdBy,
      });
    }
  }

  /**
   * Apply full-text search with ranking
   */
  private applyFullTextSearch(
    queryBuilder: SelectQueryBuilder<KnowledgeBaseEntry>,
    query: string,
  ): void {
    queryBuilder
      .andWhere(
        "knowledge.searchVector @@ plainto_tsquery('english', :query)",
        { query },
      )
      .addSelect(
        "ts_rank(knowledge.searchVector, plainto_tsquery('english', :query))",
        'relevance_score',
      )
      .setParameter('query', query);
  }

  /**
   * Apply conversation sorting
   */
  private applyConversationSorting(
    queryBuilder: SelectQueryBuilder<Conversation>,
    options: ConversationQueryOptions,
  ): void {
    const sortBy = options.sortBy || 'lastMessageAt';
    const sortOrder = options.sortOrder || 'DESC';
    queryBuilder.orderBy(`conversation.${sortBy}`, sortOrder);
  }

  /**
   * Apply message sorting
   */
  private applyMessageSorting(
    queryBuilder: SelectQueryBuilder<ConversationMessage>,
    options: MessageQueryOptions,
  ): void {
    queryBuilder.orderBy('message.createdAt', 'DESC');
  }

  /**
   * Apply knowledge base sorting
   */
  private applyKnowledgeSorting(
    queryBuilder: SelectQueryBuilder<KnowledgeBaseEntry>,
    options: KnowledgeSearchOptions,
  ): void {
    const sortBy = options.sortBy || 'relevance';

    switch (sortBy) {
      case 'relevance':
        if (options.query) {
          queryBuilder.orderBy('relevance_score', 'DESC');
        } else {
          queryBuilder.orderBy('knowledge.usageCount', 'DESC');
        }
        break;
      case 'usage':
        queryBuilder.orderBy('knowledge.usageCount', 'DESC');
        break;
      case 'rating':
        queryBuilder.orderBy('knowledge.averageRating', 'DESC');
        break;
      case 'created':
        queryBuilder.orderBy('knowledge.createdAt', 'DESC');
        break;
    }
  }

  /**
   * Apply pagination
   */
  private applyPagination(
    queryBuilder: SelectQueryBuilder<any>,
    options: { limit?: number; offset?: number },
  ): void {
    if (options.limit) {
      queryBuilder.limit(options.limit);
    }
    if (options.offset) {
      queryBuilder.offset(options.offset);
    }
  }

  /**
   * Get expected indexes for query planning
   */
  private getExpectedIndexes(
    entityType: 'conversation' | 'message' | 'knowledge',
    options: any,
  ): string[] {
    const indexes: string[] = [];

    switch (entityType) {
      case 'conversation':
        if (options.studentId && options.status) {
          indexes.push('idx_conversations_student_status');
        }
        if (options.projectId) {
          indexes.push('idx_conversations_project_active');
        }
        if (options.lastActivityAfter || options.lastActivityBefore) {
          indexes.push('idx_conversations_last_message');
        }
        if (options.language) {
          indexes.push('idx_conversations_language_status');
        }
        break;

      case 'message':
        if (options.conversationIds) {
          indexes.push('idx_messages_conversation_created');
        }
        if (options.type && options.minConfidence) {
          indexes.push('idx_messages_type_confidence');
        }
        if (options.isBookmarked) {
          indexes.push('idx_messages_bookmarked_user');
        }
        if (options.search) {
          indexes.push('idx_messages_content_search');
        }
        break;

      case 'knowledge':
        if (options.category) {
          indexes.push('idx_knowledge_category_active');
        }
        if (options.query) {
          indexes.push('knowledge_search_idx');
        }
        if (options.tags) {
          indexes.push('idx_knowledge_tags_gin');
        }
        if (options.keywords) {
          indexes.push('idx_knowledge_keywords_gin');
        }
        break;
    }

    return indexes;
  }
}
