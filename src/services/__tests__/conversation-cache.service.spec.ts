import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  ConversationCacheService,
  CachedResponse,
} from '../conversation-cache.service';
import { Conversation } from '../../entities/conversation.entity';
import { ConversationMessage } from '../../entities/conversation-message.entity';
import { ConversationContext } from '../../entities/interfaces/conversation.interface';
import { ConversationStatus, MessageType } from '../../common/enums';

describe('ConversationCacheService', () => {
  let service: ConversationCacheService;
  let cacheManager: jest.Mocked<any>;

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationCacheService,
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
      ],
    }).compile();

    service = module.get<ConversationCacheService>(ConversationCacheService);
    cacheManager = module.get(CACHE_MANAGER);

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('Context Caching', () => {
    const conversationId = 'test-conversation-id';
    const mockContext: ConversationContext = {
      projectId: 'project-1',
      projectPhase: 'implementation',
      specialization: 'AI/ML',
      recentTopics: ['machine learning', 'neural networks'],
      conversationSummary: 'Discussion about ML implementation',
      lastActivity: new Date(),
    };

    it('should cache conversation context with correct TTL', async () => {
      await service.setCachedContext(conversationId, mockContext);

      expect(cacheManager.set).toHaveBeenCalledWith(
        `ai:context:${conversationId}`,
        mockContext,
        1800, // 30 minutes TTL
      );
    });

    it('should retrieve cached conversation context', async () => {
      cacheManager.get.mockResolvedValue(mockContext);

      const result = await service.getCachedContext(conversationId);

      expect(cacheManager.get).toHaveBeenCalledWith(
        `ai:context:${conversationId}`,
      );
      expect(result).toEqual(mockContext);
    });

    it('should return null when context not found in cache', async () => {
      cacheManager.get.mockResolvedValue(null);

      const result = await service.getCachedContext(conversationId);

      expect(result).toBeNull();
    });
  });

  describe('Response Caching', () => {
    const queryHash = 'test-query-hash';
    const mockResponse: CachedResponse = {
      response: 'This is a test response',
      confidenceScore: 0.85,
      sources: ['knowledge-base', 'ai-model'],
      metadata: { processingTime: 1500 },
      timestamp: new Date(),
    };

    it('should cache regular response with correct TTL', async () => {
      await service.setCachedResponse(queryHash, mockResponse, false);

      expect(cacheManager.set).toHaveBeenCalledWith(
        `ai:response:${queryHash}`,
        mockResponse,
        3600, // 1 hour TTL
      );
    });

    it('should cache frequent response with extended TTL', async () => {
      await service.setCachedResponse(queryHash, mockResponse, true);

      expect(cacheManager.set).toHaveBeenCalledWith(
        `ai:frequent:${queryHash}`,
        mockResponse,
        7200, // 2 hours TTL
      );
    });

    it('should retrieve cached response (frequent first)', async () => {
      cacheManager.get
        .mockResolvedValueOnce(null) // frequent cache miss
        .mockResolvedValueOnce(mockResponse); // regular cache hit

      const result = await service.getCachedResponse(queryHash);

      expect(cacheManager.get).toHaveBeenCalledTimes(2);
      expect(cacheManager.get).toHaveBeenNthCalledWith(
        1,
        `ai:frequent:${queryHash}`,
      );
      expect(cacheManager.get).toHaveBeenNthCalledWith(
        2,
        `ai:response:${queryHash}`,
      );
      expect(result).toEqual(mockResponse);
    });

    it('should return frequent response when available', async () => {
      cacheManager.get.mockResolvedValueOnce(mockResponse);

      const result = await service.getCachedResponse(queryHash);

      expect(cacheManager.get).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockResponse);
    });

    it('should return null when no cached response found', async () => {
      cacheManager.get.mockResolvedValue(null);

      const result = await service.getCachedResponse(queryHash);

      expect(result).toBeNull();
    });
  });

  describe('Conversation Caching', () => {
    const conversationId = 'test-conversation-id';
    const mockConversation = {
      id: conversationId,
      studentId: 'student-1',
      title: 'Test Conversation',
      status: ConversationStatus.ACTIVE,
      messages: [],
      student: null,
      context: null,
      project: null,
      projectId: null,
      language: 'en',
      createdAt: new Date(),
      updatedAt: new Date(),
      lastMessageAt: new Date(),
      archive: jest.fn(),
      escalate: jest.fn(),
      reactivate: jest.fn(),
      updateLastActivity: jest.fn(),
      isActive: jest.fn().mockReturnValue(true),
      isArchived: jest.fn().mockReturnValue(false),
      isEscalated: jest.fn().mockReturnValue(false),
    } as unknown as Conversation;

    const mockMessages = [
      {
        id: 'msg-1',
        conversationId,
        type: MessageType.USER_QUERY,
        content: 'Test question',
      },
      {
        id: 'msg-2',
        conversationId,
        type: MessageType.AI_RESPONSE,
        content: 'Test answer',
      },
    ] as ConversationMessage[];

    it('should cache conversation with correct TTL', async () => {
      await service.setCachedConversation(conversationId, mockConversation);

      expect(cacheManager.set).toHaveBeenCalledWith(
        `ai:conversation:${conversationId}`,
        mockConversation,
        900, // 15 minutes TTL
      );
    });

    it('should cache conversation messages', async () => {
      await service.setCachedMessages(conversationId, mockMessages);

      expect(cacheManager.set).toHaveBeenCalledWith(
        `ai:conversation:${conversationId}:messages`,
        mockMessages,
        900, // 15 minutes TTL
      );
    });

    it('should retrieve cached conversation', async () => {
      cacheManager.get.mockResolvedValue(mockConversation);

      const result = await service.getCachedConversation(conversationId);

      expect(result).toEqual(mockConversation);
    });

    it('should retrieve cached messages', async () => {
      cacheManager.get.mockResolvedValue(mockMessages);

      const result = await service.getCachedMessages(conversationId);

      expect(result).toEqual(mockMessages);
    });
  });

  describe('Query Hash Generation', () => {
    it('should generate consistent hash for same query', () => {
      const query = 'What is machine learning?';
      const hash1 = service.generateQueryHash(query);
      const hash2 = service.generateQueryHash(query);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA256 hex length
    });

    it('should generate different hashes for different queries', () => {
      const query1 = 'What is machine learning?';
      const query2 = 'What is deep learning?';

      const hash1 = service.generateQueryHash(query1);
      const hash2 = service.generateQueryHash(query2);

      expect(hash1).not.toBe(hash2);
    });

    it('should include context in hash generation', () => {
      const query = 'What is this?';
      const context1 = { projectPhase: 'implementation' };
      const context2 = { projectPhase: 'testing' };

      const hash1 = service.generateQueryHash(query, context1);
      const hash2 = service.generateQueryHash(query, context2);

      expect(hash1).not.toBe(hash2);
    });

    it('should normalize query case and whitespace', () => {
      const query1 = 'What is Machine Learning?';
      const query2 = '  what is machine learning?  ';

      const hash1 = service.generateQueryHash(query1);
      const hash2 = service.generateQueryHash(query2);

      expect(hash1).toBe(hash2);
    });
  });

  describe('Cache Invalidation', () => {
    const conversationId = 'test-conversation-id';

    it('should invalidate all conversation-related caches', async () => {
      await service.invalidateConversationCache(conversationId);

      expect(cacheManager.del).toHaveBeenCalledTimes(3);
      expect(cacheManager.del).toHaveBeenCalledWith(
        `ai:context:${conversationId}`,
      );
      expect(cacheManager.del).toHaveBeenCalledWith(
        `ai:conversation:${conversationId}`,
      );
      expect(cacheManager.del).toHaveBeenCalledWith(
        `ai:conversation:${conversationId}:messages`,
      );
    });
  });

  describe('Frequent Response Management', () => {
    const queryHash = 'test-query-hash';
    const mockResponse: CachedResponse = {
      response: 'Frequent response',
      confidenceScore: 0.9,
      sources: ['knowledge-base'],
      metadata: {},
      timestamp: new Date(),
    };

    it('should mark response as frequent', async () => {
      cacheManager.get.mockResolvedValue(mockResponse);

      await service.markAsFrequentResponse(queryHash);

      expect(cacheManager.get).toHaveBeenCalledWith(`ai:frequent:${queryHash}`);
      expect(cacheManager.set).toHaveBeenCalledWith(
        `ai:frequent:${queryHash}`,
        mockResponse,
        7200, // Extended TTL for frequent responses
      );
    });

    it('should not mark non-existent response as frequent', async () => {
      cacheManager.get.mockResolvedValue(null);

      await service.markAsFrequentResponse(queryHash);

      expect(cacheManager.set).not.toHaveBeenCalled();
    });
  });

  describe('Cache Statistics', () => {
    it('should initialize cache stats when not present', async () => {
      cacheManager.get.mockResolvedValue(null);

      const stats = await service.getCacheStats();

      expect(stats).toEqual({
        contextHits: 0,
        contextMisses: 0,
        responseHits: 0,
        responseMisses: 0,
        totalCacheSize: 0,
      });
      expect(cacheManager.set).toHaveBeenCalledWith(
        'ai:stats:conversation',
        stats,
        300, // 5 minutes TTL
      );
    });

    it('should update context hit statistics', async () => {
      const initialStats = {
        contextHits: 5,
        contextMisses: 2,
        responseHits: 10,
        responseMisses: 3,
        totalCacheSize: 0,
      };
      cacheManager.get.mockResolvedValue(initialStats);

      await service.updateCacheStats('context', true);

      expect(cacheManager.set).toHaveBeenCalledWith(
        'ai:stats:conversation',
        { ...initialStats, contextHits: 6 },
        300,
      );
    });

    it('should update response miss statistics', async () => {
      const initialStats = {
        contextHits: 5,
        contextMisses: 2,
        responseHits: 10,
        responseMisses: 3,
        totalCacheSize: 0,
      };
      cacheManager.get.mockResolvedValue(initialStats);

      await service.updateCacheStats('response', false);

      expect(cacheManager.set).toHaveBeenCalledWith(
        'ai:stats:conversation',
        { ...initialStats, responseMisses: 4 },
        300,
      );
    });

    it('should calculate cache hit ratios correctly', async () => {
      const mockStats = {
        contextHits: 8,
        contextMisses: 2,
        responseHits: 15,
        responseMisses: 5,
        totalCacheSize: 0,
      };
      cacheManager.get.mockResolvedValue(mockStats);

      const ratios = await service.getCacheHitRatio();

      expect(ratios.contextHitRatio).toBeCloseTo(0.8);
      expect(ratios.responseHitRatio).toBeCloseTo(0.75);
      expect(ratios.overallHitRatio).toBeCloseTo(0.7667, 3);
    });

    it('should handle zero statistics gracefully', async () => {
      const mockStats = {
        contextHits: 0,
        contextMisses: 0,
        responseHits: 0,
        responseMisses: 0,
        totalCacheSize: 0,
      };
      cacheManager.get.mockResolvedValue(mockStats);

      const ratios = await service.getCacheHitRatio();

      expect(ratios).toEqual({
        contextHitRatio: 0,
        responseHitRatio: 0,
        overallHitRatio: 0,
      });
    });
  });

  describe('Cache Warm-up', () => {
    it('should warm up cache with conversations and contexts', async () => {
      const conversations = [
        { id: 'conv-1', messages: [] },
        { id: 'conv-2', messages: [{ id: 'msg-1' }] },
      ] as Conversation[];

      const contexts = new Map([
        ['conv-1', { projectPhase: 'planning' } as ConversationContext],
        ['conv-2', { projectPhase: 'implementation' } as ConversationContext],
      ]);

      await service.warmUpCache(conversations, contexts);

      expect(cacheManager.set).toHaveBeenCalledTimes(6); // 2 conversations + 2 messages arrays + 2 contexts
    });
  });

  describe('TTL Extension', () => {
    it('should extend cache TTL for existing keys', async () => {
      const key = 'test-key';
      const value = { test: 'data' };
      cacheManager.get.mockResolvedValue(value);

      await service.extendCacheTTL(key, 'context');

      expect(cacheManager.get).toHaveBeenCalledWith(key);
      expect(cacheManager.set).toHaveBeenCalledWith(key, value, 1800); // Context TTL
    });

    it('should not extend TTL for non-existent keys', async () => {
      const key = 'non-existent-key';
      cacheManager.get.mockResolvedValue(null);

      await service.extendCacheTTL(key, 'response');

      expect(cacheManager.get).toHaveBeenCalledWith(key);
      expect(cacheManager.set).not.toHaveBeenCalled();
    });
  });
});
