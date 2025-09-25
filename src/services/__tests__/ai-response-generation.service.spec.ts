import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  AIResponseGenerationService,
  AIResponseRequest,
} from '../ai-response-generation.service';
import { HuggingFaceService } from '../hugging-face.service';
import { ContextService } from '../context.service';
import {
  QueryProcessingService,
  QueryIntent,
  QueryCategory,
} from '../query-processing.service';

describe('AIResponseGenerationService', () => {
  let service: AIResponseGenerationService;
  let huggingFaceService: jest.Mocked<HuggingFaceService>;
  let contextService: jest.Mocked<ContextService>;
  let queryProcessingService: jest.Mocked<QueryProcessingService>;
  let configService: jest.Mocked<ConfigService>;

  const mockProcessedQuery = {
    originalQuery: 'What is a literature review?',
    normalizedQuery: 'what is a literature review',
    detectedLanguage: 'en',
    languageConfidence: 0.9,
    intent: QueryIntent.DEFINITION,
    category: QueryCategory.LITERATURE_REVIEW,
    keywords: ['literature', 'review'],
    entities: [],
    isValid: true,
    validationIssues: [],
    metadata: {
      wordCount: 5,
      characterCount: 25,
      complexity: 'simple' as any,
      urgency: 'low' as any,
      academicLevel: 'undergraduate' as any,
      processedAt: new Date(),
      processingTimeMs: 10,
    },
  };

  const mockQAResponse = {
    answer:
      'A literature review is a comprehensive analysis of existing research on a specific topic.',
    score: 0.85,
    start: 0,
    end: 80,
  };

  const mockConversationContext = {
    projectId: 'project-123',
    projectPhase: 'literature_review',
    specialization: 'computer_science',
    recentTopics: ['research methods', 'academic writing'],
    keyTerms: ['literature', 'review', 'analysis'],
    conversationSummary: 'Discussion about research methodology',
    lastActivity: new Date(),
    preferences: {
      language: 'en',
      responseStyle: 'detailed',
      detailLevel: 'comprehensive' as any,
    },
  };

  const mockProjectContext = {
    id: 'project-123',
    title: 'Machine Learning for Healthcare',
    specialization: 'artificial_intelligence',
    difficultyLevel: 'intermediate',
    tags: ['machine-learning', 'healthcare'],
    technologyStack: ['Python', 'TensorFlow'],
    phase: 'literature_review',
    supervisor: {
      id: 'supervisor-123',
      name: 'Dr. Smith',
      email: 'dr.smith@university.edu',
    },
  };

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn((key: string) => {
        const config = {
          'huggingFace.qaMaxContextLength': 512,
          'huggingFace.qaMaxAnswerLength': 200,
          'huggingFace.qaConfidenceThreshold': 0.3,
          'ai.includeProjectContext': true,
          'ai.includeConversationHistory': true,
          'ai.maxHistoryMessages': 5,
          'ai.contextWeights.query': 0.4,
          'ai.contextWeights.project': 0.25,
          'ai.contextWeights.conversation': 0.2,
          'ai.contextWeights.knowledgeBase': 0.15,
        };
        return config[key];
      }),
    };

    const mockHuggingFaceService = {
      questionAnswering: jest.fn(),
      getQAModelInfo: jest.fn(() => ({
        name: 'distilbert-base-cased-distilled-squad',
        maxTokens: 512,
        confidenceThreshold: 0.3,
      })),
    };

    const mockContextService = {
      buildConversationContext: jest.fn(),
      getProjectContext: jest.fn(),
    };

    const mockQueryProcessingService = {
      processQuery: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AIResponseGenerationService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: HuggingFaceService,
          useValue: mockHuggingFaceService,
        },
        {
          provide: ContextService,
          useValue: mockContextService,
        },
        {
          provide: QueryProcessingService,
          useValue: mockQueryProcessingService,
        },
      ],
    }).compile();

    service = module.get<AIResponseGenerationService>(
      AIResponseGenerationService,
    );
    huggingFaceService = module.get(HuggingFaceService);
    contextService = module.get(ContextService);
    queryProcessingService = module.get(QueryProcessingService);
    configService = module.get(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateResponse', () => {
    const mockRequest: AIResponseRequest = {
      query: 'What is a literature review?',
      conversationId: 'conv-123',
      userId: 'user-123',
      projectId: 'project-123',
      language: 'en',
      includeProjectContext: true,
      includeConversationHistory: true,
    };

    beforeEach(() => {
      queryProcessingService.processQuery.mockResolvedValue(mockProcessedQuery);
      huggingFaceService.questionAnswering.mockResolvedValue(mockQAResponse);
      contextService.buildConversationContext.mockResolvedValue(
        mockConversationContext,
      );
      contextService.getProjectContext.mockResolvedValue(mockProjectContext);
    });

    it('should generate a complete AI response', async () => {
      const result = await service.generateResponse(mockRequest);

      expect(result).toBeDefined();
      expect(result.response).toBe(
        'A literature review is a comprehensive analysis of existing research on a specific topic.',
      );
      expect(result.confidenceScore).toBe(0.85);
      expect(result.sources).toContain('AI Assistant');
      expect(result.processedQuery).toEqual(mockProcessedQuery);
      expect(result.contextUsed.projectInfo).toBe(true);
      expect(result.contextUsed.conversationHistory).toBe(true);
      expect(result.suggestedFollowUps).toBeDefined();
      expect(result.requiresHumanReview).toBe(false);
    });

    it('should include project context when requested', async () => {
      await service.generateResponse(mockRequest);

      expect(contextService.getProjectContext).toHaveBeenCalledWith('user-123');
      expect(huggingFaceService.questionAnswering).toHaveBeenCalledWith(
        expect.objectContaining({
          context: expect.stringContaining(
            'Project: Machine Learning for Healthcare',
          ),
        }),
        'user-123',
      );
    });

    it('should include conversation history when requested', async () => {
      await service.generateResponse(mockRequest);

      expect(contextService.buildConversationContext).toHaveBeenCalledWith(
        'conv-123',
      );
      expect(huggingFaceService.questionAnswering).toHaveBeenCalledWith(
        expect.objectContaining({
          context: expect.stringContaining('Recent topics discussed'),
        }),
        'user-123',
      );
    });

    it('should exclude project context when not requested', async () => {
      const requestWithoutProject = {
        ...mockRequest,
        includeProjectContext: false,
      };

      await service.generateResponse(requestWithoutProject);

      expect(contextService.getProjectContext).not.toHaveBeenCalled();
    });

    it('should exclude conversation history when not requested', async () => {
      const requestWithoutHistory = {
        ...mockRequest,
        includeConversationHistory: false,
      };

      await service.generateResponse(requestWithoutHistory);

      const qaCall = huggingFaceService.questionAnswering.mock.calls[0][0];
      expect(qaCall.context).not.toContain('Recent topics discussed');
    });

    it('should handle missing project context gracefully', async () => {
      contextService.getProjectContext.mockResolvedValue(null);

      const result = await service.generateResponse(mockRequest);

      expect(result.contextUsed.projectInfo).toBe(false);
      expect(result.response).toBeDefined();
    });

    it('should handle missing conversation context gracefully', async () => {
      contextService.buildConversationContext.mockResolvedValue({} as any);

      const result = await service.generateResponse(mockRequest);

      expect(result.contextUsed.conversationHistory).toBe(false);
      expect(result.response).toBeDefined();
    });

    it('should generate appropriate follow-up suggestions', async () => {
      const result = await service.generateResponse(mockRequest);

      expect(result.suggestedFollowUps).toBeDefined();
      expect(result.suggestedFollowUps!.length).toBeGreaterThan(0);
      expect(result.suggestedFollowUps!.length).toBeLessThanOrEqual(3);
    });

    it('should determine sources correctly', async () => {
      const result = await service.generateResponse(mockRequest);

      expect(result.sources).toContain('AI Assistant');
      expect(result.sources).toContain('Project Context');
      expect(result.sources).toContain('FYP Guidelines');
    });

    it('should flag low confidence responses for human review', async () => {
      const lowConfidenceResponse = { ...mockQAResponse, score: 0.2 };
      huggingFaceService.questionAnswering.mockResolvedValue(
        lowConfidenceResponse,
      );

      const result = await service.generateResponse(mockRequest);

      expect(result.requiresHumanReview).toBe(true);
    });

    it('should flag urgent queries for human review', async () => {
      const urgentQuery = {
        ...mockProcessedQuery,
        metadata: {
          ...mockProcessedQuery.metadata,
          urgency: 'urgent' as any,
        },
      };
      queryProcessingService.processQuery.mockResolvedValue(urgentQuery);

      const result = await service.generateResponse(mockRequest);

      expect(result.requiresHumanReview).toBe(true);
    });

    it('should flag complex research queries for human review', async () => {
      const complexQuery = {
        ...mockProcessedQuery,
        metadata: {
          ...mockProcessedQuery.metadata,
          academicLevel: 'research' as any,
          complexity: 'complex' as any,
        },
      };
      queryProcessingService.processQuery.mockResolvedValue(complexQuery);

      const result = await service.generateResponse(mockRequest);

      expect(result.requiresHumanReview).toBe(true);
    });

    it('should enhance responses for advanced academic levels', async () => {
      const researchQuery = {
        ...mockProcessedQuery,
        metadata: {
          ...mockProcessedQuery.metadata,
          academicLevel: 'research' as any,
        },
      };
      queryProcessingService.processQuery.mockResolvedValue(researchQuery);

      const result = await service.generateResponse(mockRequest);

      expect(result.response).toContain('literature');
    });

    it('should handle invalid queries', async () => {
      const invalidQuery = {
        ...mockProcessedQuery,
        isValid: false,
        validationIssues: ['Query too short'],
      };
      queryProcessingService.processQuery.mockResolvedValue(invalidQuery);

      await expect(service.generateResponse(mockRequest)).rejects.toThrow(
        'Invalid query',
      );
    });

    it('should include appropriate metadata', async () => {
      const result = await service.generateResponse(mockRequest);

      expect(result.metadata).toBeDefined();
      expect(result.metadata.processingTime).toBeGreaterThanOrEqual(0);
      expect(result.metadata.aiModel).toBe(
        'distilbert-base-cased-distilled-squad',
      );
      expect(result.metadata.language).toBe('en');
      expect(result.metadata.category).toBe(QueryCategory.LITERATURE_REVIEW);
      expect(result.metadata.keywords).toEqual(['literature', 'review']);
      expect(result.metadata.contextUsed).toBeDefined();
    });

    it('should limit context length appropriately', async () => {
      // Create very long context
      const longProjectContext = {
        ...mockProjectContext,
        title: 'A'.repeat(1000),
      };
      contextService.getProjectContext.mockResolvedValue(longProjectContext);

      await service.generateResponse(mockRequest);

      const qaCall = huggingFaceService.questionAnswering.mock.calls[0][0];
      expect(qaCall.context.length).toBeLessThanOrEqual(512);
    });
  });

  describe('context formatting', () => {
    beforeEach(() => {
      queryProcessingService.processQuery.mockResolvedValue(mockProcessedQuery);
      huggingFaceService.questionAnswering.mockResolvedValue(mockQAResponse);
      contextService.buildConversationContext.mockResolvedValue(
        mockConversationContext,
      );
      contextService.getProjectContext.mockResolvedValue(mockProjectContext);
    });

    it('should format project context correctly', async () => {
      const request: AIResponseRequest = {
        query: 'Test query',
        conversationId: 'conv-123',
        userId: 'user-123',
        projectId: 'project-123',
        includeProjectContext: true,
      };

      await service.generateResponse(request);

      const qaCall = huggingFaceService.questionAnswering.mock.calls[0][0];
      expect(qaCall.context).toContain(
        'Project: Machine Learning for Healthcare',
      );
      expect(qaCall.context).toContain(
        'Specialization: artificial_intelligence',
      );
      expect(qaCall.context).toContain('Technologies: Python, TensorFlow');
    });

    it('should format conversation summary correctly', async () => {
      const request: AIResponseRequest = {
        query: 'Test query',
        conversationId: 'conv-123',
        userId: 'user-123',
        includeConversationHistory: true,
      };

      await service.generateResponse(request);

      const qaCall = huggingFaceService.questionAnswering.mock.calls[0][0];
      expect(qaCall.context).toContain(
        'Recent topics discussed: research methods, academic writing',
      );
      expect(qaCall.context).toContain(
        'Key terms: literature, review, analysis',
      );
    });

    it('should include knowledge base context', async () => {
      const request: AIResponseRequest = {
        query: 'How to write a literature review?',
        conversationId: 'conv-123',
        userId: 'user-123',
      };

      await service.generateResponse(request);

      const qaCall = huggingFaceService.questionAnswering.mock.calls[0][0];
      expect(qaCall.context).toContain('Relevant Guidelines');
    });
  });

  describe('response post-processing', () => {
    beforeEach(() => {
      queryProcessingService.processQuery.mockResolvedValue(mockProcessedQuery);
      contextService.buildConversationContext.mockResolvedValue(
        mockConversationContext,
      );
      contextService.getProjectContext.mockResolvedValue(mockProjectContext);
    });

    it('should clean and format responses', async () => {
      const messyResponse = {
        ...mockQAResponse,
        answer: '  a literature review is   a comprehensive analysis  ',
      };
      huggingFaceService.questionAnswering.mockResolvedValue(messyResponse);

      const request: AIResponseRequest = {
        query: 'What is a literature review?',
        conversationId: 'conv-123',
        userId: 'user-123',
      };

      const result = await service.generateResponse(request);

      expect(result.response).toBe(
        'A literature review is a comprehensive analysis.',
      );
    });

    it('should capitalize first letter', async () => {
      const lowercaseResponse = {
        ...mockQAResponse,
        answer: 'literature review is important',
      };
      huggingFaceService.questionAnswering.mockResolvedValue(lowercaseResponse);

      const request: AIResponseRequest = {
        query: 'What is a literature review?',
        conversationId: 'conv-123',
        userId: 'user-123',
      };

      const result = await service.generateResponse(request);

      expect(result.response).toMatch(/^[A-Z]/);
    });

    it('should ensure proper ending punctuation', async () => {
      const noPunctuationResponse = {
        ...mockQAResponse,
        answer: 'Literature review is important',
      };
      huggingFaceService.questionAnswering.mockResolvedValue(
        noPunctuationResponse,
      );

      const request: AIResponseRequest = {
        query: 'What is a literature review?',
        conversationId: 'conv-123',
        userId: 'user-123',
      };

      const result = await service.generateResponse(request);

      expect(result.response).toMatch(/[.!?]$/);
    });
  });

  describe('follow-up suggestions', () => {
    beforeEach(() => {
      huggingFaceService.questionAnswering.mockResolvedValue(mockQAResponse);
      contextService.buildConversationContext.mockResolvedValue(
        mockConversationContext,
      );
      contextService.getProjectContext.mockResolvedValue(mockProjectContext);
    });

    it('should generate definition-specific follow-ups', async () => {
      const definitionQuery = {
        ...mockProcessedQuery,
        intent: QueryIntent.DEFINITION,
      };
      queryProcessingService.processQuery.mockResolvedValue(definitionQuery);

      const request: AIResponseRequest = {
        query: 'What is a literature review?',
        conversationId: 'conv-123',
        userId: 'user-123',
      };

      const result = await service.generateResponse(request);

      expect(result.suggestedFollowUps).toContain(
        'Can you provide an example?',
      );
    });

    it('should generate guidance-specific follow-ups', async () => {
      const guidanceQuery = {
        ...mockProcessedQuery,
        intent: QueryIntent.REQUEST_GUIDANCE,
      };
      queryProcessingService.processQuery.mockResolvedValue(guidanceQuery);

      const request: AIResponseRequest = {
        query: 'Help me with literature review',
        conversationId: 'conv-123',
        userId: 'user-123',
      };

      const result = await service.generateResponse(request);

      expect(result.suggestedFollowUps).toContain(
        'Can you provide more specific guidance?',
      );
    });

    it('should include category-specific suggestions', async () => {
      queryProcessingService.processQuery.mockResolvedValue(mockProcessedQuery);

      const request: AIResponseRequest = {
        query: 'What is a literature review?',
        conversationId: 'conv-123',
        userId: 'user-123',
      };

      const result = await service.generateResponse(request);

      expect(
        result.suggestedFollowUps!.some(
          (s) => s.includes('sources') || s.includes('citation'),
        ),
      ).toBe(true);
    });

    it('should limit suggestions to 3', async () => {
      queryProcessingService.processQuery.mockResolvedValue(mockProcessedQuery);

      const request: AIResponseRequest = {
        query: 'What is a literature review?',
        conversationId: 'conv-123',
        userId: 'user-123',
      };

      const result = await service.generateResponse(request);

      expect(result.suggestedFollowUps!.length).toBeLessThanOrEqual(3);
    });
  });

  describe('error handling', () => {
    it('should handle Hugging Face service errors', async () => {
      queryProcessingService.processQuery.mockResolvedValue(mockProcessedQuery);
      contextService.buildConversationContext.mockResolvedValue(
        mockConversationContext,
      );
      huggingFaceService.questionAnswering.mockRejectedValue(
        new Error('API Error'),
      );

      const request: AIResponseRequest = {
        query: 'What is a literature review?',
        conversationId: 'conv-123',
        userId: 'user-123',
      };

      await expect(service.generateResponse(request)).rejects.toThrow(
        'API Error',
      );
    });

    it('should handle context service errors gracefully', async () => {
      queryProcessingService.processQuery.mockResolvedValue(mockProcessedQuery);
      huggingFaceService.questionAnswering.mockResolvedValue(mockQAResponse);
      // Mock context services to return empty/null instead of throwing
      contextService.buildConversationContext.mockResolvedValue({} as any);
      contextService.getProjectContext.mockResolvedValue(null);

      const request: AIResponseRequest = {
        query: 'What is a literature review?',
        conversationId: 'conv-123',
        userId: 'user-123',
        includeProjectContext: true,
        includeConversationHistory: true,
      };

      // Should not throw, but handle gracefully
      const result = await service.generateResponse(request);
      expect(result).toBeDefined();
      expect(result.contextUsed.projectInfo).toBe(false);
    });

    it('should handle query processing errors', async () => {
      queryProcessingService.processQuery.mockRejectedValue(
        new Error('Processing Error'),
      );

      const request: AIResponseRequest = {
        query: 'What is a literature review?',
        conversationId: 'conv-123',
        userId: 'user-123',
      };

      await expect(service.generateResponse(request)).rejects.toThrow(
        'Processing Error',
      );
    });
  });

  describe('configuration', () => {
    it('should return current configuration', () => {
      const config = service.getConfiguration();

      expect(config).toBeDefined();
      expect(config.maxContextLength).toBe(512);
      expect(config.confidenceThreshold).toBe(0.3);
      expect(config.contextWeights).toBeDefined();
    });

    it('should allow configuration updates', () => {
      const updates = {
        maxContextLength: 1024,
        confidenceThreshold: 0.5,
      };

      service.updateConfiguration(updates);
      const config = service.getConfiguration();

      expect(config.maxContextLength).toBe(1024);
      expect(config.confidenceThreshold).toBe(0.5);
    });
  });
});
