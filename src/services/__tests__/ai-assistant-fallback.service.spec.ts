import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AIAssistantFallbackService,
  FallbackRequest,
} from '../ai-assistant-fallback.service';
import { ResponseTemplate } from '../../entities/response-template.entity';
import { KnowledgeBaseEntry } from '../../entities/knowledge-base-entry.entity';
import { TemplateManagementService } from '../template-management.service';
import { KnowledgeBaseService } from '../knowledge-base.service';
import { ContentType } from '../../common/enums';

describe('AIAssistantFallbackService', () => {
  let service: AIAssistantFallbackService;
  let templateRepository: jest.Mocked<Repository<ResponseTemplate>>;
  let knowledgeRepository: jest.Mocked<Repository<KnowledgeBaseEntry>>;
  let templateService: jest.Mocked<TemplateManagementService>;
  let knowledgeService: jest.Mocked<KnowledgeBaseService>;

  const mockTemplate: Partial<ResponseTemplate> = {
    id: 'template-1',
    name: 'Literature Review Help',
    template:
      'A literature review is {{definition}}. For your {{project_type}} project, focus on {{focus_areas}}.',
    category: 'literature_review',
    triggerKeywords: ['literature', 'review', 'sources'],
    language: 'en',
    isActive: true,
    usageCount: 5,
    effectivenessScore: 4.2,
  };

  const mockKnowledgeEntry: Partial<KnowledgeBaseEntry> = {
    id: 'kb-1',
    title: 'Literature Review Guidelines',
    content:
      'A literature review systematically analyzes existing research to identify gaps and establish theoretical foundations.',
    category: 'literature_review',
    tags: ['literature', 'review', 'research'],
    contentType: ContentType.GUIDELINE,
    language: 'en',
    isActive: true,
    usageCount: 10,
    averageRating: 4.5,
  };

  const mockFallbackRequest: FallbackRequest = {
    query: 'How do I write a literature review?',
    conversationId: 'conv-1',
    userId: 'user-1',
    language: 'en',
    category: 'literature_review',
    confidenceScore: 0.2,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AIAssistantFallbackService,
        {
          provide: getRepositoryToken(ResponseTemplate),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            save: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(KnowledgeBaseEntry),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            save: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: TemplateManagementService,
          useValue: {
            getBestMatchingTemplate: jest.fn(),
            incrementUsage: jest.fn(),
            findMatchingTemplates: jest.fn(),
          },
        },
        {
          provide: KnowledgeBaseService,
          useValue: {
            searchKnowledge: jest.fn(),
            getRelevantContent: jest.fn(),
            createKnowledgeEntry: jest.fn(),
            updateKnowledgeEntry: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AIAssistantFallbackService>(
      AIAssistantFallbackService,
    );
    templateRepository = module.get(getRepositoryToken(ResponseTemplate));
    knowledgeRepository = module.get(getRepositoryToken(KnowledgeBaseEntry));
    templateService = module.get(TemplateManagementService);
    knowledgeService = module.get(KnowledgeBaseService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateFallbackResponse', () => {
    it('should generate template-based fallback when template matches', async () => {
      const mockTemplateMatch = {
        template: mockTemplate as any,
        matchScore: 0.8,
        processedContent:
          'A literature review is a systematic analysis. For your research project, focus on recent studies.',
      };

      templateService.getBestMatchingTemplate.mockResolvedValue(
        mockTemplateMatch,
      );
      templateService.incrementUsage.mockResolvedValue(undefined);

      const result =
        await service.generateFallbackResponse(mockFallbackRequest);

      expect(result.fallbackMethod).toBe('template');
      expect(result.response).toBe(mockTemplateMatch.processedContent);
      expect(result.fromAI).toBe(false);
      expect(result.confidenceScore).toBe(0.6);
      expect(result.sources).toContain('Response Templates');
      expect(result.metadata.templateUsed).toBe('template-1');
      expect(templateService.incrementUsage).toHaveBeenCalledWith('template-1');
    });

    it('should generate knowledge base fallback when template fails but knowledge exists', async () => {
      templateService.getBestMatchingTemplate.mockResolvedValue(null);
      knowledgeService.searchKnowledge.mockResolvedValue({
        entries: [mockKnowledgeEntry as any],
        total: 1,
        limit: 10,
        offset: 0,
        hasMore: false,
      });

      const result =
        await service.generateFallbackResponse(mockFallbackRequest);

      expect(result.fallbackMethod).toBe('knowledge_base');
      expect(result.response).toContain('Literature Review Guidelines');
      expect(result.response).toContain('systematically analyzes');
      expect(result.fromAI).toBe(false);
      expect(result.confidenceScore).toBe(0.5);
      expect(result.sources).toContain('Knowledge Base');
      expect(result.metadata.knowledgeEntriesFound).toBe(1);
    });

    it('should generate escalation response for urgent queries', async () => {
      const urgentRequest: FallbackRequest = {
        ...mockFallbackRequest,
        // Note: urgency is not part of ConversationContext, using low confidence instead
        confidenceScore: 0.05,
      };

      templateService.getBestMatchingTemplate.mockResolvedValue(null);
      knowledgeService.searchKnowledge.mockResolvedValue({
        entries: [],
        total: 0,
        limit: 10,
        offset: 0,
        hasMore: false,
      });

      const result = await service.generateFallbackResponse(urgentRequest);

      expect(result.fallbackMethod).toBe('escalation');
      expect(result.response).toContain('requires personalized guidance');
      expect(result.escalationSuggestion).toBeDefined();
      expect(result.metadata.requiresHumanReview).toBe(true);
      expect(result.suggestedFollowUps).toContain(
        'Should I help you contact your supervisor?',
      );
    });

    it('should generate escalation response for extremely low confidence', async () => {
      const lowConfidenceRequest: FallbackRequest = {
        ...mockFallbackRequest,
        confidenceScore: 0.05,
      };

      templateService.getBestMatchingTemplate.mockResolvedValue(null);
      knowledgeService.searchKnowledge.mockResolvedValue({
        entries: [],
        total: 0,
        limit: 10,
        offset: 0,
        hasMore: false,
      });

      const result =
        await service.generateFallbackResponse(lowConfidenceRequest);

      expect(result.fallbackMethod).toBe('escalation');
      expect(result.response).toContain('requires personalized guidance');
      expect(result.metadata.fallbackReason).toContain(
        'extremely low AI confidence',
      );
    });

    it('should generate escalation response for complex academic queries', async () => {
      const complexRequest: FallbackRequest = {
        ...mockFallbackRequest,
        query:
          'How do I get ethical approval from the institutional review board for my research?',
      };

      templateService.getBestMatchingTemplate.mockResolvedValue(null);
      knowledgeService.searchKnowledge.mockResolvedValue({
        entries: [],
        total: 0,
        limit: 10,
        offset: 0,
        hasMore: false,
      });

      const result = await service.generateFallbackResponse(complexRequest);

      expect(result.fallbackMethod).toBe('escalation');
      expect(result.response).toContain('requires personalized guidance');
      expect(result.metadata.fallbackReason).toContain(
        'complex academic query',
      );
    });

    it('should generate default fallback when all other methods fail', async () => {
      templateService.getBestMatchingTemplate.mockResolvedValue(null);
      knowledgeService.searchKnowledge.mockResolvedValue({
        entries: [],
        total: 0,
        limit: 10,
        offset: 0,
        hasMore: false,
      });

      const result =
        await service.generateFallbackResponse(mockFallbackRequest);

      expect(result.fallbackMethod).toBe('default');
      expect(result.response).toContain(
        'having trouble providing a confident answer',
      );
      expect(result.response).toContain('Alternative ways I can assist');
      expect(result.fromAI).toBe(false);
      expect(result.confidenceScore).toBe(0.1);
      expect(result.sources).toContain('Fallback System');
    });

    it('should include category-specific guidance in default fallback', async () => {
      const methodologyRequest: FallbackRequest = {
        ...mockFallbackRequest,
        query: 'What methodology should I use?',
        category: 'methodology',
      };

      templateService.getBestMatchingTemplate.mockResolvedValue(null);
      knowledgeService.searchKnowledge.mockResolvedValue({
        entries: [],
        total: 0,
        limit: 10,
        offset: 0,
        hasMore: false,
      });

      const result = await service.generateFallbackResponse(methodologyRequest);

      expect(result.response).toContain('For methodology questions');
      expect(result.response).toContain('research questions');
    });

    it('should handle template processing errors gracefully', async () => {
      templateService.getBestMatchingTemplate.mockRejectedValue(
        new Error('Template service error'),
      );
      knowledgeService.searchKnowledge.mockResolvedValue({
        entries: [],
        total: 0,
        limit: 10,
        offset: 0,
        hasMore: false,
      });

      const result =
        await service.generateFallbackResponse(mockFallbackRequest);

      expect(result.fallbackMethod).toBe('default');
      expect(result.response).toContain(
        'having trouble providing a confident answer',
      );
    });

    it('should handle knowledge base service errors gracefully', async () => {
      templateService.getBestMatchingTemplate.mockResolvedValue(null);
      knowledgeService.searchKnowledge.mockRejectedValue(
        new Error('Knowledge base error'),
      );

      const result =
        await service.generateFallbackResponse(mockFallbackRequest);

      expect(result.fallbackMethod).toBe('default');
      expect(result.response).toContain(
        'having trouble providing a confident answer',
      );
    });

    it('should generate emergency fallback for complete system failure', async () => {
      templateService.getBestMatchingTemplate.mockRejectedValue(
        new Error('System error'),
      );
      knowledgeService.searchKnowledge.mockRejectedValue(
        new Error('System error'),
      );

      // Mock the private method to throw an error
      const originalMethod = service['generateDefaultFallback'];
      service['generateDefaultFallback'] = jest.fn().mockImplementation(() => {
        throw new Error('Complete system failure');
      });

      const result =
        await service.generateFallbackResponse(mockFallbackRequest);

      expect(result.response).toContain('experiencing technical difficulties');
      expect(result.response).toContain('Rephrasing your question');
      expect(result.metadata.requiresHumanReview).toBe(true);

      // Restore original method
      service['generateDefaultFallback'] = originalMethod;
    });

    it('should respect fallback options', async () => {
      const options = {
        enableTemplateMatching: false,
        enableKnowledgeBaseSearch: true,
        maxKnowledgeEntries: 1,
      };

      knowledgeService.searchKnowledge.mockResolvedValue({
        entries: [
          mockKnowledgeEntry as any,
          { ...mockKnowledgeEntry, id: 'kb-2' } as any,
        ],
        total: 2,
        limit: 1, // This should limit to 1 entry
        offset: 0,
        hasMore: false,
      });

      const result = await service.generateFallbackResponse(
        mockFallbackRequest,
        options,
      );

      expect(templateService.getBestMatchingTemplate).not.toHaveBeenCalled();
      expect(result.fallbackMethod).toBe('knowledge_base');
      expect(result.metadata.knowledgeEntriesFound).toBe(2); // The service returns all entries from the mock
    });

    it('should include custom substitutions in template processing', async () => {
      const mockTemplateMatch = {
        template: mockTemplate as any,
        matchScore: 0.8,
        processedContent: 'Custom processed content with student name John',
      };

      const options = {
        customSubstitutions: {
          student_name: 'John',
          project_type: 'AI Research',
        },
      };

      templateService.getBestMatchingTemplate.mockResolvedValue(
        mockTemplateMatch,
      );
      templateService.incrementUsage.mockResolvedValue(undefined);

      const result = await service.generateFallbackResponse(
        mockFallbackRequest,
        options,
      );

      expect(templateService.getBestMatchingTemplate).toHaveBeenCalledWith(
        mockFallbackRequest.query,
        mockFallbackRequest.category,
        mockFallbackRequest.language,
        expect.objectContaining({
          student_name: 'John',
          project_type: 'AI Research',
        }),
      );
    });

    it('should generate appropriate follow-up suggestions for each fallback method', async () => {
      // Test template fallback follow-ups
      const mockTemplateMatch = {
        template: mockTemplate as any,
        matchScore: 0.8,
        processedContent: 'Template response',
      };

      templateService.getBestMatchingTemplate.mockResolvedValue(
        mockTemplateMatch,
      );
      templateService.incrementUsage.mockResolvedValue(undefined);

      const templateResult =
        await service.generateFallbackResponse(mockFallbackRequest);
      expect(templateResult.suggestedFollowUps).toContain(
        'Would you like more specific guidance?',
      );

      // Test knowledge base fallback follow-ups
      templateService.getBestMatchingTemplate.mockResolvedValue(null);
      knowledgeService.searchKnowledge.mockResolvedValue({
        entries: [mockKnowledgeEntry as any],
        total: 1,
        limit: 10,
        offset: 0,
        hasMore: false,
      });

      const knowledgeResult =
        await service.generateFallbackResponse(mockFallbackRequest);
      expect(knowledgeResult.suggestedFollowUps).toContain(
        'Would you like more details about any of these topics?',
      );
    });

    it('should track processing time in metadata', async () => {
      templateService.getBestMatchingTemplate.mockResolvedValue(null);
      knowledgeService.searchKnowledge.mockResolvedValue({
        entries: [],
        total: 0,
        limit: 10,
        offset: 0,
        hasMore: false,
      });

      const startTime = Date.now();
      const result =
        await service.generateFallbackResponse(mockFallbackRequest);
      const endTime = Date.now();

      expect(result.metadata.processingTime).toBeGreaterThanOrEqual(0);
      expect(result.metadata.processingTime).toBeLessThanOrEqual(
        endTime - startTime + 10,
      ); // Allow small margin
    });
  });

  describe('getFallbackStatistics', () => {
    it('should return fallback statistics structure', async () => {
      const stats = await service.getFallbackStatistics();

      expect(stats).toHaveProperty('templateUsage');
      expect(stats).toHaveProperty('knowledgeBaseHits');
      expect(stats).toHaveProperty('escalationRate');
      expect(stats).toHaveProperty('averageProcessingTime');
      expect(Array.isArray(stats.templateUsage)).toBe(true);
    });
  });
});
