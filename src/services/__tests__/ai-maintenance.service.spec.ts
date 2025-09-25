import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AIMaintenanceService,
  MaintenanceStats,
} from '../ai-maintenance.service';
import { ConversationCacheService } from '../conversation-cache.service';
import { Conversation } from '../../entities/conversation.entity';
import { ConversationMessage } from '../../entities/conversation-message.entity';
import { KnowledgeBaseEntry } from '../../entities/knowledge-base-entry.entity';
import { ResponseTemplate } from '../../entities/response-template.entity';
import { ConversationStatus, MessageType } from '../../common/enums';

describe('AIMaintenanceService', () => {
  let service: AIMaintenanceService;
  let conversationRepository: jest.Mocked<Repository<Conversation>>;
  let messageRepository: jest.Mocked<Repository<ConversationMessage>>;
  let knowledgeRepository: jest.Mocked<Repository<KnowledgeBaseEntry>>;
  let templateRepository: jest.Mocked<Repository<ResponseTemplate>>;
  let cacheService: jest.Mocked<ConversationCacheService>;

  const mockQueryBuilder = {
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    having: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    setParameters: jest.fn().mockReturnThis(),
    execute: jest.fn(),
    getMany: jest.fn(),
    getRawMany: jest.fn(),
    getRawOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AIMaintenanceService,
        {
          provide: getRepositoryToken(Conversation),
          useValue: {
            createQueryBuilder: jest.fn(() => mockQueryBuilder),
            find: jest.fn(),
            update: jest.fn(),
            query: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ConversationMessage),
          useValue: {
            createQueryBuilder: jest.fn(() => mockQueryBuilder),
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(KnowledgeBaseEntry),
          useValue: {
            createQueryBuilder: jest.fn(() => mockQueryBuilder),
            find: jest.fn(),
            update: jest.fn(),
            query: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ResponseTemplate),
          useValue: {
            createQueryBuilder: jest.fn(() => mockQueryBuilder),
            find: jest.fn(),
          },
        },
        {
          provide: ConversationCacheService,
          useValue: {
            clearAllCache: jest.fn(),
            invalidateConversationCache: jest.fn(),
            getCacheStats: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AIMaintenanceService>(AIMaintenanceService);
    conversationRepository = module.get(getRepositoryToken(Conversation));
    messageRepository = module.get(getRepositoryToken(ConversationMessage));
    knowledgeRepository = module.get(getRepositoryToken(KnowledgeBaseEntry));
    templateRepository = module.get(getRepositoryToken(ResponseTemplate));
    cacheService = module.get(ConversationCacheService);

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('archiveInactiveConversations', () => {
    it('should archive conversations inactive for more than configured days', async () => {
      mockQueryBuilder.execute.mockResolvedValue({ affected: 5 });

      const result = await service.archiveInactiveConversations();

      expect(conversationRepository.createQueryBuilder).toHaveBeenCalled();
      expect(mockQueryBuilder.update).toHaveBeenCalledWith(Conversation);
      expect(mockQueryBuilder.set).toHaveBeenCalledWith({
        status: ConversationStatus.ARCHIVED,
      });
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'lastMessageAt < :cutoffDate',
        expect.objectContaining({ cutoffDate: expect.any(Date) }),
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'status = :status',
        { status: ConversationStatus.ACTIVE },
      );
      expect(mockQueryBuilder.execute).toHaveBeenCalled();

      expect(result).toBe(5);
      expect(cacheService.clearAllCache).toHaveBeenCalled();
    });

    it('should not clear cache when no conversations are archived', async () => {
      mockQueryBuilder.execute.mockResolvedValue({ affected: 0 });

      const result = await service.archiveInactiveConversations();

      expect(result).toBe(0);
      expect(cacheService.clearAllCache).not.toHaveBeenCalled();
    });

    it('should handle null affected count', async () => {
      mockQueryBuilder.execute.mockResolvedValue({ affected: null });

      const result = await service.archiveInactiveConversations();

      expect(result).toBe(0);
    });
  });

  describe('deleteOldArchivedConversations', () => {
    it('should delete old archived conversations and invalidate cache', async () => {
      const mockConversations = [{ id: 'conv-1' }, { id: 'conv-2' }];

      conversationRepository.find.mockResolvedValue(
        mockConversations as Conversation[],
      );
      mockQueryBuilder.execute.mockResolvedValue({ affected: 2 });

      const result = await service.deleteOldArchivedConversations();

      expect(conversationRepository.find).toHaveBeenCalledWith({
        select: ['id'],
        where: {
          updatedAt: expect.any(Object), // LessThan matcher
          status: ConversationStatus.ARCHIVED,
        },
        take: 100, // Default batch size
      });

      expect(mockQueryBuilder.delete).toHaveBeenCalled();
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('id IN (:...ids)', {
        ids: ['conv-1', 'conv-2'],
      });

      expect(result).toBe(2);
      expect(cacheService.invalidateConversationCache).toHaveBeenCalledTimes(2);
      expect(cacheService.invalidateConversationCache).toHaveBeenCalledWith(
        'conv-1',
      );
      expect(cacheService.invalidateConversationCache).toHaveBeenCalledWith(
        'conv-2',
      );
    });

    it('should return 0 when no conversations to delete', async () => {
      conversationRepository.find.mockResolvedValue([]);

      const result = await service.deleteOldArchivedConversations();

      expect(result).toBe(0);
      expect(mockQueryBuilder.delete).not.toHaveBeenCalled();
      expect(cacheService.invalidateConversationCache).not.toHaveBeenCalled();
    });
  });

  describe('optimizeKnowledgeBaseUsage', () => {
    it('should update usage counts for knowledge base entries', async () => {
      const mockUsageUpdates = [
        { id: 'kb-1', actualUsage: '15' },
        { id: 'kb-2', actualUsage: '8' },
      ];

      mockQueryBuilder.getRawMany.mockResolvedValue(mockUsageUpdates);

      const result = await service.optimizeKnowledgeBaseUsage();

      expect(knowledgeRepository.createQueryBuilder).toHaveBeenCalledWith('kb');
      expect(mockQueryBuilder.leftJoin).toHaveBeenCalled();
      expect(mockQueryBuilder.select).toHaveBeenCalledWith('kb.id', 'id');
      expect(mockQueryBuilder.addSelect).toHaveBeenCalledWith(
        'COUNT(msg.id)',
        'actualUsage',
      );
      expect(mockQueryBuilder.groupBy).toHaveBeenCalledWith('kb.id');
      expect(mockQueryBuilder.having).toHaveBeenCalledWith(
        'COUNT(msg.id) != kb.usageCount',
      );

      expect(knowledgeRepository.update).toHaveBeenCalledTimes(2);
      expect(knowledgeRepository.update).toHaveBeenCalledWith(
        { id: 'kb-1' },
        { usageCount: 15 },
      );
      expect(knowledgeRepository.update).toHaveBeenCalledWith(
        { id: 'kb-2' },
        { usageCount: 8 },
      );

      expect(result).toBe(2);
    });

    it('should return 0 when no updates needed', async () => {
      mockQueryBuilder.getRawMany.mockResolvedValue([]);

      const result = await service.optimizeKnowledgeBaseUsage();

      expect(result).toBe(0);
      expect(knowledgeRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('analyzeTemplateEffectiveness', () => {
    it('should analyze template effectiveness and log low-performing templates', async () => {
      const mockTemplates = [
        { id: 'template-1', name: 'Template 1', usageCount: 15 },
        { id: 'template-2', name: 'Template 2', usageCount: 20 },
      ];

      templateRepository.find.mockResolvedValue(
        mockTemplates as ResponseTemplate[],
      );

      // Mock effectiveness data - one good, one poor
      mockQueryBuilder.getRawOne
        .mockResolvedValueOnce({ avgRating: '4.2', usageCount: '10' }) // Template 1 - good
        .mockResolvedValueOnce({ avgRating: '2.1', usageCount: '8' }); // Template 2 - poor

      const loggerWarnSpy = jest
        .spyOn(service['logger'], 'warn')
        .mockImplementation();

      const result = await service.analyzeTemplateEffectiveness();

      expect(templateRepository.find).toHaveBeenCalledWith({
        where: { usageCount: expect.any(Object) }, // MoreThan matcher
      });

      expect(messageRepository.createQueryBuilder).toHaveBeenCalledTimes(2);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('msg.type = :type', {
        type: MessageType.TEMPLATE_RESPONSE,
      });

      expect(result).toBe(2);

      // Should log warning for low-performing template
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'Template "Template 2" has low effectiveness: 0.42',
        ),
      );
    });

    it('should skip templates with no effectiveness data', async () => {
      const mockTemplates = [
        { id: 'template-1', name: 'Template 1', usageCount: 15 },
      ];

      templateRepository.find.mockResolvedValue(
        mockTemplates as ResponseTemplate[],
      );
      mockQueryBuilder.getRawOne.mockResolvedValue(null);

      const result = await service.analyzeTemplateEffectiveness();

      expect(result).toBe(0);
    });
  });

  describe('cleanupExpiredCache', () => {
    it('should clean up cache for inactive conversations', async () => {
      const mockInactiveConversations = [
        { id: 'conv-1' },
        { id: 'conv-2' },
        { id: 'conv-3' },
      ];

      conversationRepository.find.mockResolvedValue(
        mockInactiveConversations as Conversation[],
      );

      const result = await service.cleanupExpiredCache();

      expect(conversationRepository.find).toHaveBeenCalledWith({
        select: ['id'],
        where: {
          lastMessageAt: expect.any(Object), // LessThan matcher
          status: ConversationStatus.ACTIVE,
        },
        take: 100,
      });

      expect(cacheService.invalidateConversationCache).toHaveBeenCalledTimes(3);
      expect(cacheService.invalidateConversationCache).toHaveBeenCalledWith(
        'conv-1',
      );
      expect(cacheService.invalidateConversationCache).toHaveBeenCalledWith(
        'conv-2',
      );
      expect(cacheService.invalidateConversationCache).toHaveBeenCalledWith(
        'conv-3',
      );

      expect(result).toBe(3);
    });

    it('should return 0 when no inactive conversations found', async () => {
      conversationRepository.find.mockResolvedValue([]);

      const result = await service.cleanupExpiredCache();

      expect(result).toBe(0);
      expect(cacheService.invalidateConversationCache).not.toHaveBeenCalled();
    });
  });

  describe('generateUsageAnalytics', () => {
    it('should generate comprehensive usage analytics', async () => {
      // Reset mocks for this test
      jest.clearAllMocks();

      const mockAIResponseStats = {
        total_responses: '150',
        avg_confidence: '0.75',
        avg_rating: '4.2',
        high_confidence: '90',
        low_confidence: '15',
      };

      const mockKnowledgeStats = {
        total_entries: '50',
        avg_usage: '12.5',
        avg_rating: '4.1',
        popular_entries: '20',
        unused_entries: '5',
      };

      const mockConversationStats = {
        total_conversations: '200',
        active_conversations: '150',
        archived_conversations: '45',
        escalated_conversations: '5',
      };

      mockQueryBuilder.getRawOne
        .mockResolvedValueOnce(mockAIResponseStats)
        .mockResolvedValueOnce(mockKnowledgeStats)
        .mockResolvedValueOnce(mockConversationStats);

      const loggerLogSpy = jest
        .spyOn(service['logger'], 'log')
        .mockImplementation();

      await service.generateUsageAnalytics();

      expect(messageRepository.createQueryBuilder).toHaveBeenCalledWith('msg');
      expect(knowledgeRepository.createQueryBuilder).toHaveBeenCalledWith('kb');
      expect(conversationRepository.createQueryBuilder).toHaveBeenCalledWith(
        'conv',
      );

      expect(loggerLogSpy).toHaveBeenCalledWith(
        'AI Response Analytics (30 days)',
        mockAIResponseStats,
      );
      expect(loggerLogSpy).toHaveBeenCalledWith(
        'Knowledge Base Analytics',
        mockKnowledgeStats,
      );
      expect(loggerLogSpy).toHaveBeenCalledWith(
        'Conversation Analytics',
        mockConversationStats,
      );
    });
  });

  describe('updateSearchVectors', () => {
    it('should update search vectors for knowledge base entries', async () => {
      await service.updateSearchVectors();

      expect(knowledgeRepository.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE knowledge_base_entries'),
      );
    });
  });

  describe('runManualMaintenance', () => {
    beforeEach(() => {
      // Mock all the individual maintenance methods
      jest.spyOn(service, 'archiveInactiveConversations').mockResolvedValue(5);
      jest
        .spyOn(service, 'deleteOldArchivedConversations')
        .mockResolvedValue(3);
      jest.spyOn(service, 'optimizeKnowledgeBaseUsage').mockResolvedValue(8);
      jest.spyOn(service, 'analyzeTemplateEffectiveness').mockResolvedValue(4);
      jest.spyOn(service, 'cleanupExpiredCache').mockResolvedValue(12);
      jest
        .spyOn(service, 'optimizeKnowledgeBaseContent')
        .mockResolvedValue(undefined);
    });

    it('should run all maintenance tasks by default', async () => {
      const result = await service.runManualMaintenance();

      expect(service.archiveInactiveConversations).toHaveBeenCalled();
      expect(service.deleteOldArchivedConversations).toHaveBeenCalled();
      expect(service.optimizeKnowledgeBaseUsage).toHaveBeenCalled();
      expect(service.optimizeKnowledgeBaseContent).toHaveBeenCalled();
      expect(service.analyzeTemplateEffectiveness).toHaveBeenCalled();
      expect(service.cleanupExpiredCache).toHaveBeenCalled();

      expect(result).toEqual({
        conversationsArchived: 5,
        conversationsDeleted: 3,
        knowledgeEntriesOptimized: 8,
        templatesAnalyzed: 4,
        cacheEntriesCleared: 12,
        executionTime: expect.any(Number),
      });
    });

    it('should run only specified maintenance tasks', async () => {
      const result = await service.runManualMaintenance([
        'conversations',
        'cache',
      ]);

      expect(service.archiveInactiveConversations).toHaveBeenCalled();
      expect(service.deleteOldArchivedConversations).toHaveBeenCalled();
      expect(service.cleanupExpiredCache).toHaveBeenCalled();

      expect(service.optimizeKnowledgeBaseUsage).not.toHaveBeenCalled();
      expect(service.analyzeTemplateEffectiveness).not.toHaveBeenCalled();

      expect(result).toEqual({
        conversationsArchived: 5,
        conversationsDeleted: 3,
        knowledgeEntriesOptimized: 0,
        templatesAnalyzed: 0,
        cacheEntriesCleared: 12,
        executionTime: expect.any(Number),
      });
    });

    it('should measure execution time', async () => {
      const result = await service.runManualMaintenance(['cache']);

      expect(result.executionTime).toBeGreaterThanOrEqual(0);
      expect(typeof result.executionTime).toBe('number');
    });
  });

  describe('configuration management', () => {
    it('should return current maintenance configuration', () => {
      const config = service.getMaintenanceConfig();

      expect(config).toHaveProperty('conversation');
      expect(config).toHaveProperty('knowledge');
      expect(config).toHaveProperty('template');

      expect(config.conversation).toHaveProperty('autoArchiveDays');
      expect(config.conversation).toHaveProperty('permanentDeleteDays');
      expect(config.knowledge).toHaveProperty('minUsageForOptimization');
      expect(config.template).toHaveProperty('effectivenessThreshold');
    });

    it('should update maintenance configuration', () => {
      const newConfig = {
        conversation: { autoArchiveDays: 45 },
        knowledge: { minUsageForOptimization: 10 },
      };

      service.updateMaintenanceConfig(newConfig);

      const updatedConfig = service.getMaintenanceConfig();
      expect(updatedConfig.conversation.autoArchiveDays).toBe(45);
      expect(updatedConfig.knowledge.minUsageForOptimization).toBe(10);
    });
  });

  describe('scheduled maintenance jobs', () => {
    it('should run daily maintenance with proper error handling', async () => {
      jest.spyOn(service, 'archiveInactiveConversations').mockResolvedValue(5);
      jest.spyOn(service, 'optimizeKnowledgeBaseUsage').mockResolvedValue(3);
      jest.spyOn(service, 'cleanupExpiredCache').mockResolvedValue(8);

      const result = await service.runDailyMaintenance();

      expect(result).toEqual({
        conversationsArchived: 5,
        conversationsDeleted: 0,
        knowledgeEntriesOptimized: 3,
        templatesAnalyzed: 0,
        cacheEntriesCleared: 8,
        executionTime: expect.any(Number),
      });
    });

    it('should run weekly maintenance', async () => {
      jest
        .spyOn(service, 'deleteOldArchivedConversations')
        .mockResolvedValue(2);
      jest.spyOn(service, 'analyzeTemplateEffectiveness').mockResolvedValue(6);

      const result = await service.runWeeklyMaintenance();

      expect(result).toEqual({
        conversationsArchived: 0,
        conversationsDeleted: 2,
        knowledgeEntriesOptimized: 0,
        templatesAnalyzed: 6,
        cacheEntriesCleared: 0,
        executionTime: expect.any(Number),
      });
    });

    it('should run monthly maintenance', async () => {
      jest
        .spyOn(service, 'optimizeKnowledgeBaseContent')
        .mockResolvedValue(undefined);
      jest
        .spyOn(service, 'generateUsageAnalytics')
        .mockResolvedValue(undefined);
      jest.spyOn(service, 'updateSearchVectors').mockResolvedValue(undefined);

      const result = await service.runMonthlyMaintenance();

      expect(service.optimizeKnowledgeBaseContent).toHaveBeenCalled();
      expect(service.generateUsageAnalytics).toHaveBeenCalled();
      expect(service.updateSearchVectors).toHaveBeenCalled();

      expect(result.executionTime).toBeGreaterThanOrEqual(0);
    });

    it('should handle errors in maintenance jobs', async () => {
      jest
        .spyOn(service, 'archiveInactiveConversations')
        .mockRejectedValue(new Error('Database error'));

      await expect(service.runDailyMaintenance()).rejects.toThrow(
        'Database error',
      );
    });
  });
});
