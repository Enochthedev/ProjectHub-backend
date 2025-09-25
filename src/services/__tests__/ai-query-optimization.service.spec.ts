import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { AIQueryOptimizationService } from '../ai-query-optimization.service';
import { Conversation } from '../../entities/conversation.entity';
import { ConversationMessage } from '../../entities/conversation-message.entity';
import { KnowledgeBaseEntry } from '../../entities/knowledge-base-entry.entity';
import {
  ConversationStatus,
  MessageType,
  ContentType,
} from '../../common/enums';

describe('AIQueryOptimizationService', () => {
  let service: AIQueryOptimizationService;
  let conversationRepository: jest.Mocked<Repository<Conversation>>;
  let messageRepository: jest.Mocked<Repository<ConversationMessage>>;
  let knowledgeRepository: jest.Mocked<Repository<KnowledgeBaseEntry>>;

  const mockQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    setParameter: jest.fn().mockReturnThis(),
    clone: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
    getOne: jest.fn(),
    getCount: jest.fn(),
    getRawMany: jest.fn(),
    getRawOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AIQueryOptimizationService,
        {
          provide: getRepositoryToken(Conversation),
          useValue: {
            createQueryBuilder: jest.fn(() => mockQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(ConversationMessage),
          useValue: {
            createQueryBuilder: jest.fn(() => mockQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(KnowledgeBaseEntry),
          useValue: {
            createQueryBuilder: jest.fn(() => mockQueryBuilder),
          },
        },
      ],
    }).compile();

    service = module.get<AIQueryOptimizationService>(
      AIQueryOptimizationService,
    );
    conversationRepository = module.get(getRepositoryToken(Conversation));
    messageRepository = module.get(getRepositoryToken(ConversationMessage));
    knowledgeRepository = module.get(getRepositoryToken(KnowledgeBaseEntry));

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('searchConversationsOptimized', () => {
    const mockConversations = [
      {
        id: 'conv-1',
        studentId: 'student-1',
        title: 'Test Conversation',
        status: ConversationStatus.ACTIVE,
      },
    ] as Conversation[];

    beforeEach(() => {
      mockQueryBuilder.getMany.mockResolvedValue(mockConversations);
      mockQueryBuilder.getCount.mockResolvedValue(1);
    });

    it('should search conversations with basic filters', async () => {
      const options = {
        studentId: 'student-1',
        status: [ConversationStatus.ACTIVE],
        limit: 10,
        offset: 0,
      };

      const result = await service.searchConversationsOptimized(options);

      expect(conversationRepository.createQueryBuilder).toHaveBeenCalledWith(
        'conversation',
      );
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'conversation.student',
        'student',
      );
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'conversation.project',
        'project',
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'conversation.studentId = :studentId',
        { studentId: 'student-1' },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'conversation.status IN (:...statuses)',
        { statuses: [ConversationStatus.ACTIVE] },
      );

      expect(result.conversations).toEqual(mockConversations);
      expect(result.total).toBe(1);
      expect(result.metrics.resultCount).toBe(1);
      expect(result.metrics.queryTime).toBeGreaterThanOrEqual(0);
    });

    it('should apply project filter when provided', async () => {
      const options = {
        projectId: 'project-1',
        limit: 10,
      };

      await service.searchConversationsOptimized(options);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'conversation.projectId = :projectId',
        { projectId: 'project-1' },
      );
    });

    it('should apply language filter when provided', async () => {
      const options = {
        language: 'es',
        limit: 10,
      };

      await service.searchConversationsOptimized(options);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'conversation.language = :language',
        { language: 'es' },
      );
    });

    it('should apply context filter when provided', async () => {
      const options = {
        hasContext: true,
        limit: 10,
      };

      await service.searchConversationsOptimized(options);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'conversation.context IS NOT NULL',
      );
    });

    it('should apply date range filters', async () => {
      const dateFrom = new Date('2024-01-01');
      const dateTo = new Date('2024-12-31');
      const options = {
        lastActivityAfter: dateFrom,
        lastActivityBefore: dateTo,
        limit: 10,
      };

      await service.searchConversationsOptimized(options);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'conversation.lastMessageAt >= :lastActivityAfter',
        { lastActivityAfter: dateFrom },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'conversation.lastMessageAt <= :lastActivityBefore',
        { lastActivityBefore: dateTo },
      );
    });

    it('should apply search filter', async () => {
      const options = {
        search: 'machine learning',
        limit: 10,
      };

      await service.searchConversationsOptimized(options);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(conversation.title ILIKE :search OR conversation.context::text ILIKE :search)',
        { search: '%machine learning%' },
      );
    });

    it('should apply sorting and pagination', async () => {
      const options = {
        sortBy: 'createdAt' as const,
        sortOrder: 'ASC' as const,
        limit: 20,
        offset: 10,
      };

      await service.searchConversationsOptimized(options);

      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'conversation.createdAt',
        'ASC',
      );
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(20);
      expect(mockQueryBuilder.offset).toHaveBeenCalledWith(10);
    });
  });

  describe('searchMessagesOptimized', () => {
    const mockMessages = [
      {
        id: 'msg-1',
        conversationId: 'conv-1',
        type: MessageType.AI_RESPONSE,
        content: 'Test response',
        confidenceScore: 0.85,
      },
    ] as ConversationMessage[];

    beforeEach(() => {
      mockQueryBuilder.getMany.mockResolvedValue(mockMessages);
      mockQueryBuilder.getCount.mockResolvedValue(1);
    });

    it('should search messages with type filter', async () => {
      const options = {
        type: [MessageType.AI_RESPONSE],
        limit: 10,
      };

      const result = await service.searchMessagesOptimized(options);

      expect(messageRepository.createQueryBuilder).toHaveBeenCalledWith(
        'message',
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'message.type IN (:...types)',
        { types: [MessageType.AI_RESPONSE] },
      );

      expect(result.messages).toEqual(mockMessages);
      expect(result.total).toBe(1);
    });

    it('should apply confidence score filters', async () => {
      const options = {
        minConfidence: 0.5,
        maxConfidence: 0.9,
        limit: 10,
      };

      await service.searchMessagesOptimized(options);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'message.confidenceScore >= :minConfidence',
        { minConfidence: 0.5 },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'message.confidenceScore <= :maxConfidence',
        { maxConfidence: 0.9 },
      );
    });

    it('should apply bookmark filter', async () => {
      const options = {
        isBookmarked: true,
        limit: 10,
      };

      await service.searchMessagesOptimized(options);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'message.isBookmarked = :isBookmarked',
        { isBookmarked: true },
      );
    });

    it('should apply rating filters', async () => {
      const options = {
        hasRating: true,
        minRating: 4.0,
        limit: 10,
      };

      await service.searchMessagesOptimized(options);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'message.ratingCount > 0',
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'message.averageRating >= :minRating',
        { minRating: 4.0 },
      );
    });

    it('should apply full-text search', async () => {
      const options = {
        search: 'machine learning',
        limit: 10,
      };

      await service.searchMessagesOptimized(options);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        "to_tsvector('english', message.content) @@ plainto_tsquery('english', :search)",
        { search: 'machine learning' },
      );
    });
  });

  describe('searchKnowledgeOptimized', () => {
    const mockEntries = [
      {
        id: 'kb-1',
        title: 'Machine Learning Guide',
        content: 'Comprehensive guide to ML',
        category: 'guidelines',
        contentType: ContentType.GUIDELINE,
        isActive: true,
      },
    ] as KnowledgeBaseEntry[];

    beforeEach(() => {
      mockQueryBuilder.getMany.mockResolvedValue(mockEntries);
      mockQueryBuilder.getCount.mockResolvedValue(1);
    });

    it('should search knowledge base with basic filters', async () => {
      const options = {
        category: 'guidelines',
        contentType: [ContentType.GUIDELINE],
        limit: 10,
      };

      const result = await service.searchKnowledgeOptimized(options);

      expect(knowledgeRepository.createQueryBuilder).toHaveBeenCalledWith(
        'knowledge',
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'knowledge.isActive = :isActive',
        { isActive: true },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'knowledge.category = :category',
        { category: 'guidelines' },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'knowledge.contentType IN (:...contentTypes)',
        { contentTypes: [ContentType.GUIDELINE] },
      );

      expect(result.entries).toEqual(mockEntries);
      expect(result.total).toBe(1);
    });

    it('should apply full-text search with ranking', async () => {
      const options = {
        query: 'machine learning',
        limit: 10,
      };

      await service.searchKnowledgeOptimized(options);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        "knowledge.searchVector @@ plainto_tsquery('english', :query)",
        { query: 'machine learning' },
      );
      expect(mockQueryBuilder.addSelect).toHaveBeenCalledWith(
        "ts_rank(knowledge.searchVector, plainto_tsquery('english', :query))",
        'relevance_score',
      );
    });

    it('should apply tags and keywords filters', async () => {
      const options = {
        tags: ['ml', 'ai'],
        keywords: ['neural', 'network'],
        limit: 10,
      };

      await service.searchKnowledgeOptimized(options);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'knowledge.tags && :tags',
        { tags: ['ml', 'ai'] },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'knowledge.keywords && :keywords',
        { keywords: ['neural', 'network'] },
      );
    });

    it('should apply usage and rating filters', async () => {
      const options = {
        minUsage: 10,
        minRating: 4.0,
        limit: 10,
      };

      await service.searchKnowledgeOptimized(options);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'knowledge.usageCount >= :minUsage',
        { minUsage: 10 },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'knowledge.averageRating >= :minRating',
        { minRating: 4.0 },
      );
    });
  });

  describe('getConversationContextOptimized', () => {
    const mockConversation = {
      id: 'conv-1',
      studentId: 'student-1',
      title: 'Test Conversation',
    } as Conversation;

    const mockMessages = [
      { id: 'msg-1', content: 'Message 1', createdAt: new Date('2024-01-01') },
      { id: 'msg-2', content: 'Message 2', createdAt: new Date('2024-01-02') },
    ] as ConversationMessage[];

    beforeEach(() => {
      mockQueryBuilder.getOne.mockResolvedValue(mockConversation);
      mockQueryBuilder.getMany.mockResolvedValue(mockMessages);
    });

    it('should get conversation context with recent messages', async () => {
      const result = await service.getConversationContextOptimized('conv-1');

      expect(conversationRepository.createQueryBuilder).toHaveBeenCalledWith(
        'conversation',
      );
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'conversation.id = :conversationId',
        { conversationId: 'conv-1' },
      );

      expect(messageRepository.createQueryBuilder).toHaveBeenCalledWith(
        'message',
      );
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'message.conversationId = :conversationId',
        { conversationId: 'conv-1' },
      );
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'message.createdAt',
        'DESC',
      );
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(10);

      expect(result.conversation).toEqual(mockConversation);
      expect(result.recentMessages).toEqual(mockMessages.reverse());
      expect(result.metrics.queryTime).toBeGreaterThanOrEqual(0);
    });

    it('should throw error when conversation not found', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(null);

      await expect(
        service.getConversationContextOptimized('non-existent'),
      ).rejects.toThrow('Conversation non-existent not found');
    });
  });

  describe('getAIResponseAnalytics', () => {
    beforeEach(() => {
      mockQueryBuilder.getCount.mockResolvedValue(100);
      mockQueryBuilder.getRawOne
        .mockResolvedValueOnce({ avg: '0.75' }) // confidence
        .mockResolvedValueOnce({ avg: '4.2' }); // rating
      mockQueryBuilder.getRawMany
        .mockResolvedValueOnce([
          { type: 'ai_response', count: '80' },
          { type: 'template_response', count: '20' },
        ])
        .mockResolvedValueOnce([
          { confidence_range: 'high', count: '40' },
          { confidence_range: 'medium', count: '35' },
          { confidence_range: 'low', count: '20' },
          { confidence_range: 'very_low', count: '5' },
        ]);
    });

    it('should get AI response analytics', async () => {
      const result = await service.getAIResponseAnalytics('student-1');

      expect(result.totalResponses).toBe(100);
      expect(result.averageConfidence).toBe(0.75);
      expect(result.averageRating).toBe(4.2);
      expect(result.responsesByType).toEqual({
        ai_response: 80,
        template_response: 20,
      });
      expect(result.confidenceDistribution).toEqual({
        high: 40,
        medium: 35,
        low: 20,
        very_low: 5,
      });
      expect(result.metrics.queryTime).toBeGreaterThanOrEqual(0);
    });

    it('should apply student filter when provided', async () => {
      await service.getAIResponseAnalytics('student-1');

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'conversation.studentId = :studentId',
        { studentId: 'student-1' },
      );
    });

    it('should apply date filters when provided', async () => {
      const dateFrom = new Date('2024-01-01');
      const dateTo = new Date('2024-12-31');

      await service.getAIResponseAnalytics('student-1', dateFrom, dateTo);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'message.createdAt >= :dateFrom',
        { dateFrom },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'message.createdAt <= :dateTo',
        { dateTo },
      );
    });
  });

  describe('Performance Metrics', () => {
    it('should track query execution time', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);
      mockQueryBuilder.getCount.mockResolvedValue(0);

      const result = await service.searchConversationsOptimized({ limit: 10 });

      expect(result.metrics.queryTime).toBeGreaterThanOrEqual(0);
      expect(typeof result.metrics.queryTime).toBe('number');
    });

    it('should identify expected indexes for conversation queries', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);
      mockQueryBuilder.getCount.mockResolvedValue(0);

      const result = await service.searchConversationsOptimized({
        studentId: 'student-1',
        status: [ConversationStatus.ACTIVE],
        limit: 10,
      });

      expect(result.metrics.indexesUsed).toContain(
        'idx_conversations_student_status',
      );
    });

    it('should identify expected indexes for message queries', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);
      mockQueryBuilder.getCount.mockResolvedValue(0);

      const result = await service.searchMessagesOptimized({
        conversationIds: ['conv-1'],
        limit: 10,
      });

      expect(result.metrics.indexesUsed).toContain(
        'idx_messages_conversation_created',
      );
    });

    it('should identify expected indexes for knowledge queries', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);
      mockQueryBuilder.getCount.mockResolvedValue(0);

      const result = await service.searchKnowledgeOptimized({
        query: 'machine learning',
        limit: 10,
      });

      expect(result.metrics.indexesUsed).toContain('knowledge_search_idx');
    });
  });
});
